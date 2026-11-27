"""Optional local GPT helper. Python 3.9+, standard library only."""
import getpass
import hmac
import json
import os
import re
import secrets
import threading
import unicodedata
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PORT = 41867
VERDICTS = ["추천", "보통", "비추천", "판단 보류"]
STR = {"type": "string"}
def schema(props):
    return {"type":"object","properties":props,"required":list(props),"additionalProperties":False}
SCHEMA = schema({
    "verdict": {"type":"string","enum":VERDICTS}, "summary": STR,
    "evidence": {"type":"array","items":schema({"id":STR,"quote":STR,"why":STR})},
    "limits": STR, "check": STR,
    "conditionChecks": {"type":"array","items":schema({
        "id":STR,"state":{"type":"string","enum":["확인","미확인","충돌"]},"reason":STR,
        "evidence":{"type":"array","items":schema({"id":STR,"quote":STR,"why":STR})},
    })},
    "fits": {"type":"array","items":schema({
        "kind":{"type":"string","enum":["product","store","brand"]},
        "verdict":{"type":"string","enum":VERDICTS},"reason":STR,
        "evidence":{"type":"array","items":schema({"id":STR,"quote":STR,"why":STR})},"missing":STR,
    })},
})
RULES = Path(__file__).with_name("review-rules.txt").read_text(encoding="utf-8").strip()
INSTRUCTIONS = RULES + (
    "\n구조화 응답에서는 verdict와 summary에 결론, evidence에 게시물 ID와 짧은 원문 그대로의 quote 및 한국어 why를 넣어. "
    "limits에는 지표의 확인 범위와 담당자에게 필요한 정보, check에는 크리에이터에게 물을 내용을 적어. "
    "fits는 fitTargets에 지정된 대상만 같은 순서로 각각 한 개씩 작성해. 각 항목 evidence는 최대 2개이며 짧은 원문 그대로 인용해. "
    "conditionChecks에는 conditions의 모든 항목을 빠짐없이 같은 ID로 한 번씩 작성해. 각 reason은 짧은 한 문장, evidence는 가급적 한 개야. 확인·충돌은 그 조건을 직접 뒷받침하는 원문이 있어야 해. 인용의 존재와 조건 충족은 달라. 원문이 없거나 이번 일정·현장촬영 가능·실제 팔로워층·매출 실적·경쟁 협업 부재를 증명할 수 없으면 미확인이야. 한 항목에 여러 조건이 있으면 전부 입증되어야 확인이야. "
    "reason에는 해당 대상과의 적합성을, missing에는 추가로 필요한 자료를 적어. 근거가 없으면 판단 보류와 빈 evidence로 작성해. "
    "metrics는 계정의 선택 분야·기간 표본이고 relatedMetrics는 관련 게시물만의 지표야. 두 범위를 혼동하지 마. "
    "metrics의 er는 팔로워 대비 게시물 반응률(%), all은 전체 영상 조회수, ad와 other는 협찬 표기 확인·미확인 영상 조회수, "
    "shares는 공유, saves는 저장, viewEr는 조회수 대비 영상 반응률(%), likes와 comments는 좋아요와 댓글이야. value는 중앙값, n은 확인 건수, total은 전체 건수야."
)

def condition_list(value):
    # One condition per line. Commas and semicolons stay inside that line.
    text=str(value or "").replace("\u00a0"," ").replace("\r\n","\n").replace("\r","\n")
    parts=[line.strip() for line in text.split("\n") if line.strip()]
    if len(parts)>8: parts=parts[:7]+["; ".join(parts[7:])]
    return [{"id":"r"+str(index+1),"text":part} for index,part in enumerate(parts)]

def needs_external_confirmation(text):
    # Public post history cannot verify this campaign's logistics, audiences or results.
    # A numeric follower-count threshold is judged separately against the sent follower count.
    return bool(re.search(
        r"가능|일정|현장|방문\s*촬영|팔로워|시청자|거주|인사이트|연령|성별|비중|매출|주문|전환|실적|단가|예산|독점|저작권|동의|계약|협업\s*(?:확인|없)|이력\s*없|없어야|없을\s*것"
        r"|\b(?:availability|available|onsite|on-site|filming|shoot|audience|followers|demographics|residen\w*|sales|conversion|orders|budget|exclusiv\w*|licens\w*|permission|contract|no prior)\b",
        text,re.I))

_FOLLOWER_WORD=re.compile(r"팔로(?:워|우)(?:\s*수)?|(?<![A-Za-z])followers?(?![A-Za-z])|(?<![A-Za-z])follower\s+counts?(?![A-Za-z])",re.I)
_FOLLOWER_NUMBER=re.compile(r"(?P<num>\d+(?:[,，]\d{3})*(?:\.\d+)?)\s*(?P<unit>천만|백만|억|만|천|[kKmM](?![A-Za-z]))?(?P<people>명)?")
_FOLLOWER_UNITS={"천":1000,"만":10000,"억":100000000,"천만":10000000,"백만":1000000,"k":1000,"K":1000,"m":1000000,"M":1000000}
_FOLLOWER_OPS=(
    ("gt",re.compile(r"초과|넘는|넘은|보다\s*많|보다\s*크|보다\s*높|more\s*than|greater\s*than|(?<![A-Za-z])over(?![A-Za-z])|(?<![A-Za-z])above(?![A-Za-z])",re.I)),
    ("lt",re.compile(r"미만|보다\s*적|보다\s*작|보다\s*낮|less\s*than|(?<![A-Za-z])under(?![A-Za-z])|(?<![A-Za-z])below(?![A-Za-z])",re.I)),
    ("gte",re.compile(r"이상(?!한)|최소|적어도|at\s*least|or\s*more|(?<![A-Za-z])minimum(?![A-Za-z])|\+|＋|↑",re.I)),
    ("lte",re.compile(r"이하|최대|at\s*most|up\s*to|(?<![A-Za-z])maximum(?![A-Za-z])",re.I)),
)

def _follower_number_value(match):
    try: number=float(match.group("num").replace(",","").replace("，",""))
    except ValueError: return None
    value=number*_FOLLOWER_UNITS.get(match.group("unit"),1)
    if value<0 or value>10**12 or abs(value-round(value))>1e-4: return None
    return int(round(value))

def _follower_number_blocked(text,match):
    tail=text[match.end():]
    if re.match(r"\s*(?:대|세|살|%|％|퍼센트|percent\b)",tail,re.I): return True
    return bool(re.match(r"[A-Za-z]",tail))

def _near_follower_word(text,match,words):
    for word in words:
        if match.end()<=word.start(): gap=text[match.end():word.start()]
        elif word.end()<=match.start(): gap=text[word.end():match.start()]
        else: return True
        if len(gap)<=16 and not re.search(r"[,，;；\n]|연령|성별|거주|예산|매출|반응",gap): return True
    return False

def _assign_follower_ops(text,numbers):
    found=[]
    for op,pattern in _FOLLOWER_OPS:
        for match in pattern.finditer(text): found.append((op,match.start(),match.end()))
    chosen={}
    for op,start,end in found:
        best=None
        for index,number in enumerate(numbers):
            if end<=number.start(): dist,after=number.start()-end,False
            elif start>=number.end(): dist,after=start-number.end(),True
            else: dist,after=0,True
            if dist>10: continue
            if best is None or dist<best[0] or (dist==best[0] and after and not best[2]):
                best=(dist,index,after)
        if best is None: continue
        previous=chosen.get(best[1])
        if previous is None or best[0]<previous[1] or (best[0]==previous[1] and best[2] and not previous[2]):
            chosen[best[1]]=(op,best[0],best[2])
    return chosen

def parse_follower_thresholds(text):
    raw=unicodedata.normalize("NFKC",str(text or ""))
    words=list(_FOLLOWER_WORD.finditer(raw))
    if not words: return []
    numbers=[match for match in _FOLLOWER_NUMBER.finditer(raw) if _near_follower_word(raw,match,words) and not _follower_number_blocked(raw,match) and _follower_number_value(match) is not None]
    ops=_assign_follower_ops(raw,numbers)
    checks=[]
    for index,match in enumerate(numbers):
        if index not in ops: continue
        checks.append((ops[index][0],_follower_number_value(match)))
    return checks

def _follower_meets(count,op,value):
    return {"gte":count>=value,"gt":count>value,"lte":count<=value,"lt":count<value}[op]

def follower_threshold_only(text):
    raw=unicodedata.normalize("NFKC",str(text or ""))
    raw=re.sub(r"팔로(?:워|우)(?:\s*수)?|(?<![A-Za-z])followers?(?![A-Za-z])|(?<![A-Za-z])follower\s+counts?(?![A-Za-z])"," ",raw,flags=re.I)
    raw=re.sub(r"\d+(?:[,，]\d{3})*(?:\.\d+)?\s*(?:천만|백만|억|만|천|[kKmM])?\s*명?"," ",raw)
    raw=re.sub(r"이상(?!한)|이하|미만|초과|최소|최대|적어도|넘는|넘은|보다\s*[많적크작높]|at\s*least|at\s*most|or\s*more|more\s*than|greater\s*than|less\s*than|up\s*to|(?<![A-Za-z])(?:over|under|above|below|minimum|maximum)(?![A-Za-z])|\+|＋|↑"," ",raw,flags=re.I)
    for word in ("필수조건","필수","조건","계정","기준","그리고","및","이어야","해야","합니다","입니다","해요","필요"):
        raw=re.sub(rf"(?<![가-힣A-Za-z]){word}(?![가-힣A-Za-z])"," ",raw)
    for word in ("수","명","and"):
        raw=re.sub(rf"(?<![가-힣A-Za-z]){word}(?![가-힣A-Za-z])"," ",raw,flags=re.I)
    return re.sub(r"[\W_]+","",raw,flags=re.U)==""

def without_follower_count(text):
    raw=unicodedata.normalize("NFKC",str(text or ""))
    raw=re.sub(r"(?:최소|적어도|최대|at\s*least|at\s*most|minimum|maximum|more\s*than|less\s*than|over|under|above|below)?\s*(?:팔로(?:워|우)(?:\s*수)?|followers?|follower\s+counts?)\s*(?:최소|적어도|최대)?\s*\d+(?:[,，]\d{3})*(?:\.\d+)?\s*(?:천만|백만|억|만|천|[kKmM])?\s*명?\s*(?:이상|이하|미만|초과|최소|최대|\+|＋|↑|넘는|넘은)?"," ",raw,flags=re.I)
    raw=re.sub(r"(?:최소|적어도|최대|at\s*least|at\s*most)?\s*\d+(?:[,，]\d{3})*(?:\.\d+)?\s*(?:천만|백만|억|만|천|[kKmM])?\s*명?\s*(?:\+|＋|↑|이상|이하|미만|초과)?\s*(?:팔로(?:워|우)(?:\s*수)?|followers?)"," ",raw,flags=re.I)
    return raw

def follower_judgment(text,followers):
    checks=parse_follower_thresholds(text)
    if not checks: return None
    pure=follower_threshold_only(text)
    if type(followers) is not int:
        return {"state":"미확인","reason":"팔로워 수를 아직 확인하지 못해 이 기준은 미확인이에요.","pure":pure}
    failed=[(op,value) for op,value in checks if not _follower_meets(followers,op,value)]
    if failed:
        if all(op in ("lte","lt") for op,_ in failed):
            reason=f"프로필에서 확인한 팔로워 {followers:,}명이 이 상한 기준을 넘어요."
        elif all(op in ("gte","gt") for op,_ in failed):
            reason=f"프로필에서 확인한 팔로워 {followers:,}명이 이 기준에 못 미쳐요."
        else:
            reason=f"프로필에서 확인한 팔로워 {followers:,}명이 이 기준에 맞지 않아요."
        return {"state":"충돌","reason":reason,"pure":pure}
    if pure:
        return {"state":"확인","reason":f"프로필에서 확인한 팔로워 {followers:,}명이 이 기준을 충족해요.","pure":True}
    return {"state":"부분충족","reason":"","pure":False}

_EXTERNAL_REASON="공개 게시물의 과거 활동만으로 이번 캠페인의 실행 가능 여부·실적·고객층을 확인할 수 없어 별도 증빙이 필요해요."
_QUOTE_REASON="인용한 원문을 게시물에서 확인하지 못해 이 조건은 미확인으로 뒀어요."

def validate_conditions(obj,data):
    expected={item["id"]:item["text"] for item in data.get("conditions",[])}
    checks=obj.get("conditionChecks",[])
    if not isinstance(checks,list) or len(checks)!=len(expected):
        raise ValueError("필수조건 확인 결과가 누락됐습니다.")
    accepted=[];seen=set()
    for check in checks:
        if not isinstance(check,dict) or check.get("id") not in expected or check["id"] in seen:
            raise ValueError("필수조건이 일치하지 않습니다.")
        state=check.get("state");reason=check.get("reason")
        if state not in ("확인","미확인","충돌") or not isinstance(reason,str) or not reason.strip():
            raise ValueError("필수조건 설명을 확인할 수 없습니다.")
        evidence=check.get("evidence")
        if not isinstance(evidence,list) or len(evidence)>2: raise ValueError("필수조건 근거를 확인해주세요.")
        verified=validate(dict(verdict="판단 보류" if state=="미확인" else "보통",summary=reason,limits="조건 검토",check="조건 검토",evidence=evidence),dict(data,fitTargets=[],conditions=[],requirements="",brief="조건 검토"))
        text=expected[check["id"]]
        kept=verified["evidence"]
        judged=follower_judgment(text,data.get("followers"))
        if judged and judged["state"]=="충돌":
            state,reason,kept="충돌",judged["reason"],[]
        elif judged and judged["state"]=="확인":
            state,reason="확인",judged["reason"]
        elif judged and judged["state"]=="미확인" and judged["pure"]:
            state,reason="미확인",judged["reason"]
        elif judged and judged["state"]=="미확인":
            if state=="확인" or not kept:
                state,reason="미확인",judged["reason"]
        elif judged and judged["state"]=="부분충족":
            if state=="확인" and needs_external_confirmation(without_follower_count(text)):
                state,reason="미확인",_EXTERNAL_REASON
            elif state in ("확인","충돌") and not kept:
                state,reason="미확인",_QUOTE_REASON
        else:
            if state in ("확인","충돌") and not kept:
                state,reason="미확인",_QUOTE_REASON
            elif state=="확인" and needs_external_confirmation(text):
                state,reason="미확인",_EXTERNAL_REASON
        accepted.append(dict(id=check["id"],text=text,state=state,reason=reason[:300],evidence=kept))
        seen.add(check["id"])
    return accepted

def apply_condition_gate(result,checks):
    conflicts=[check for check in checks if check["state"]=="충돌"]
    missing=[check for check in checks if check["state"]=="미확인"]
    if conflicts:
        quoted=any(check["evidence"] for check in conflicts)
        lead="필수조건과 충돌하는 게시물 표현이 있어요: " if quoted else "확인된 팔로워 수가 필수조건 기준에 맞지 않아요: "
        message=lead+"; ".join(check["text"] for check in conflicts)
        evidence=[];seen=set()
        for check in conflicts:
            for item in check["evidence"]:
                if item["id"] not in seen: evidence.append(item);seen.add(item["id"])
        result.update(verdict="비추천",summary=message[:600],evidence=evidence[:3])
        for fit in result.get("fits",[]):fit.update(verdict="비추천",reason=message[:600],evidence=evidence[:2])
    elif missing:
        message="콘텐츠 근거는 있으나 필수조건을 추가 확인해야 해요: "+"; ".join(check["text"] for check in missing)
        if result["verdict"]=="추천": result.update(verdict="보통" if result["evidence"] else "판단 보류",summary=message[:600])
        for fit in result.get("fits",[]):
            if fit["verdict"]=="추천":fit.update(verdict="보통" if fit["evidence"] else "판단 보류",reason=message[:600])
            fit["missing"]=("미확인 필수조건: "+"; ".join(check["text"] for check in missing)+". "+fit["missing"])[:500]
        result["limits"]=("미확인 필수조건: "+"; ".join(check["text"] for check in missing)+". "+result["limits"])[:600]
    return result

def clean(src):
    if not isinstance(src,dict) or not isinstance(src.get("posts"),list) or not 1<=len(src["posts"])<=24:
        raise ValueError("게시물 수를 확인해주세요.")
    payload={k:str(src.get(k,""))[:300] for k in ("user","campaign","focus","brief","target","period","checkedAt","followerSource","requirements")}
    followers=src.get("followers")
    payload["followers"]=followers if type(followers) is int and followers>=0 else None
    for scope in ("metrics","relatedMetrics"):
        metrics={}
        source=src.get(scope) if isinstance(src.get(scope),dict) else {}
        for key in ("er","all","ad","other","likes","comments","shares","saves","viewEr"):
            group=source.get(key)
            if not isinstance(group,dict): continue
            total,n,value=(group.get(field) for field in ("total","n","value"))
            if type(total) is not int or type(n) is not int or not 0<=n<=total<=110: continue
            if n and (type(value) not in (float,int) or not 0<=value<float("inf")): continue
            metrics[key]={"value":value if n else None,"n":n,"total":total}
        payload[scope]=metrics
    count=src.get("relatedCount")
    payload["relatedCount"]=count if type(count) is int and 0<=count<=110 else None
    targets=src.get("fitTargets",[])
    if not isinstance(targets,list) or len(targets)>3: raise ValueError("적합도 대상을 확인해주세요.")
    payload["fitTargets"]=[]
    seen_kinds=set()
    for t in targets:
        if not isinstance(t,dict) or t.get("kind") not in ("product","store","brand") or t["kind"] in seen_kinds:
            raise ValueError("적합도 대상을 확인해주세요.")
        if not isinstance(t.get("subject"),str) or not t["subject"].strip(): raise ValueError("홍보 대상을 입력해주세요.")
        payload["fitTargets"].append({k:str(t.get(k,""))[:240] for k in ("kind","label","subject","criteria")})
        seen_kinds.add(t["kind"])
    payload["conditions"]=condition_list(payload["requirements"])
    if "conditions" in src and src["conditions"]!=payload["conditions"]:
        raise ValueError("필수조건을 다시 입력해주세요.")
    info=src.get("sampleInfo",{})
    payload["sampleInfo"]={k:info[k] for k in ("eligible","readable","selected","omitted","missingText") if isinstance(info,dict) and type(info.get(k)) is int and 0<=info[k]<=110}
    rows=[]; seen=set()
    for p in src["posts"]:
        if not isinstance(p,dict) or not isinstance(p.get("id"),str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,90}",p["id"]):
            raise ValueError("게시물 ID를 확인해주세요.")
        if p["id"] in seen: continue
        seen.add(p["id"])
        row={k:str(p.get(k,""))[:680 if k=="text" else 90] for k in ("id","source","text","format")}
        row["note"]=str(p.get("note",""))[:300]
        for key in ("views","likes","comments","shares","saves"):
            value=p.get(key)
            row[key]=value if type(value) is int and value>=0 else None
        row["disclosed"]=p.get("disclosed") is True
        row["related"]=p.get("related") is True
        rows.append(row)
    if not any(row["text"].strip() for row in rows): raise ValueError("판단할 원문 텍스트가 없습니다.")
    return dict(payload,posts=rows)
def locate_quote(quote, segments):
    # Exact text still wins. Spacing and punctuation-only differences map back onto the post.
    quote=unicodedata.normalize("NFKC",str(quote)).replace("\u00a0"," ").replace("\u200b","").replace("\ufeff","")
    folded=" ".join(quote.split())
    if not folded: return None
    prepared=[]
    for part in segments:
        norm=unicodedata.normalize("NFKC",str(part)).replace("\u00a0"," ").replace("\u200b","").replace("\ufeff","")
        prepared.append((norm," ".join(norm.split())))
    for _,folded_part in prepared:
        if folded in folded_part: return folded
    def skeleton(text):
        return [(index,ch) for index,ch in enumerate(text) if not ch.isspace() and not unicodedata.category(ch).startswith("P")]
    query=skeleton(quote)
    if not query: return None
    needle="".join(ch for _,ch in query)
    for norm,_ in prepared:
        hay=skeleton(norm)
        if not hay: continue
        at="".join(ch for _,ch in hay).find(needle)
        if at<0: continue
        start=hay[at][0]
        end=hay[at+len(needle)-1][0]+1
        found=" ".join(norm[start:end].split())
        if found: return found
    return None
def validate(obj,data):
    if not isinstance(obj,dict) or obj.get("verdict") not in VERDICTS or not all(
            isinstance(obj.get(key),str) and obj[key].strip() for key in ("summary","limits","check")):
        raise ValueError("검토 형식을 확인할 수 없습니다.")
    evidence=obj.get("evidence")
    if not isinstance(evidence,list) or len(evidence)>3:
        raise ValueError("근거 목록을 확인할 수 없습니다.")
    def segments(text):
        # Labels and inserted omission markers are not the creator's words.
        raw=re.sub(r"(?m)^(?:캡션|썸네일 설명|직접 옮긴 캡션|직접 옮긴 화면 문구)\s*·\s*","",text)
        return [" ".join(part.split()) for part in re.split(r"\n|…",raw) if part.strip()]
    by_id={post["id"]:segments(post["text"]) for post in data["posts"]}
    accepted=[]
    seen=set()
    for item in evidence:
        if not isinstance(item,dict) or not all(isinstance(item.get(k),str) for k in ("id","quote","why")):
            raise ValueError("근거 형식을 확인할 수 없습니다.")
        key=item["id"]
        if key not in by_id or key in seen or not item["why"].strip(): continue
        quote=locate_quote(item["quote"],by_id[key])
        if not quote: continue
        accepted.append(dict(id=key,quote=quote,why=item["why"][:400]))
        seen.add(key)
    verdict=obj["verdict"]
    summary=obj["summary"]
    if verdict != "판단 보류" and not accepted:
        verdict="판단 보류"
        summary="원문에서 확인되는 인용이 없어 판단을 보류해요. "+summary
    if verdict == "추천" and not data.get("brief","").strip() and not data.get("fitTargets"):
        raise ValueError("추천 여부를 검토할 제품·매장이 지정되지 않았습니다.")
    result=dict(verdict=verdict,summary=summary[:600],evidence=accepted,limits=obj["limits"][:600],check=obj["check"][:500])
    checks=validate_conditions(obj,data)
    expected={t["kind"] for t in data.get("fitTargets",[])}
    fits=obj.get("fits",[])
    if not isinstance(fits,list) or len(fits)!=len(expected): raise ValueError("대상별 적합도 결과가 누락됐습니다.")
    seen_kinds=set(); verified=[]
    for fit in fits:
        if not isinstance(fit,dict) or fit.get("kind") not in expected or fit["kind"] in seen_kinds:
            raise ValueError("적합도 대상이 일치하지 않습니다.")
        if not isinstance(fit.get("reason"),str) or not fit["reason"].strip() or not isinstance(fit.get("missing"),str):
            raise ValueError("적합도 설명을 확인할 수 없습니다.")
        if not isinstance(fit.get("evidence"),list) or len(fit["evidence"])>2: raise ValueError("적합도 근거 수를 확인해주세요.")
        # Reuse quotation checks. An unmatched quote is dropped instead of rejecting the paid review.
        check=validate(dict(verdict=fit.get("verdict"),summary=fit["reason"],limits=fit["missing"] or "없음",check="대상별 검토",evidence=fit["evidence"]),dict(data,fitTargets=[],conditions=[],requirements="",brief="입력된 대상"))
        cleaned=dict(kind=fit["kind"],verdict=check["verdict"],reason=check["summary"],evidence=check["evidence"],missing=fit["missing"][:500])
        if fit["kind"]=="brand" and cleaned["verdict"]=="추천":
            target=next(t for t in data["fitTargets"] if t["kind"]=="brand")
            if not target.get("criteria","").strip():
                cleaned.update(verdict="보통",reason="관련 원문은 있으나 비교할 브랜드 특징·원하는 이미지가 미입력이에요.",missing="브랜드 특징·원하는 이미지 확인 필요")
        verified.append(cleaned)
        seen_kinds.add(fit["kind"])
    if expected or "fits" in obj: result["fits"]=verified
    if verified and result["verdict"]=="추천" and any(fit["verdict"]!="추천" for fit in verified):
        result.update(verdict="보통" if accepted or any(fit["evidence"] for fit in verified) else "판단 보류",summary="입력된 대상 중 추가 확인이 필요한 항목이 있어요. 대상별 근거와 부족한 자료를 확인해주세요.")
    if checks or "conditionChecks" in obj: result["conditionChecks"]=checks
    return apply_condition_gate(result,checks)
def review(src,key):
    data=clean(src)
    body={"model":"gpt-4.1-mini","store":False,"instructions":INSTRUCTIONS,"input":json.dumps(data,ensure_ascii=False),"max_output_tokens":3000,"text":{"format":{"type":"json_schema","strict":True,"name":"creator_review","schema":SCHEMA}}}
    req=Request("https://api.openai.com/v1/responses",data=json.dumps(body).encode(),headers={"Content-Type":"application/json","Authorization":"Bearer "+key})
    with urlopen(req,timeout=47) as response: reply=json.load(response)
    if reply.get("status")=="incomplete": raise ValueError("검토 응답이 끝나지 않았습니다.")
    text="".join(p.get("text","") for item in reply.get("output",[]) for p in item.get("content",[]) if p.get("type")=="output_text")
    return validate(json.loads(text),data)
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send_json(self,status,obj):
        body=json.dumps(obj,ensure_ascii=False).encode()
        self.send_response(status);self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store");self.send_header("Content-Length",str(len(body)))
        self.end_headers();self.wfile.write(body)
    def do_POST(self):
        origin=self.headers.get("Origin","")
        if self.headers.get("Host")!="127.0.0.1:"+str(PORT) or (origin and not re.fullmatch(r"chrome-extension://[a-p]{32}",origin)):
            return self.send_json(403,{"error":"로컬 확장 요청만 처리합니다."})
        auth=self.headers.get("Authorization","").encode()
        if not hmac.compare_digest(auth,("Bearer "+self.server.token).encode()):
            return self.send_json(401,{"error":"연결 코드를 확인해주세요."})
        if self.path=="/check": return self.send_json(200,{"ok":True,"protocol":3,"version":"2.0.2"})
        if self.path not in ("/review","/review-campaign-fit","/review-fit-v2","/review-fit-v201"): return self.send_json(404,{})
        if not self.server.lock.acquire(blocking=False): return self.send_json(409,{"error":"다른 검토를 처리하고 있습니다."})
        try:
            length=int(self.headers.get("Content-Length","0"))
            if not 0<length<=96000: raise ValueError("크기")
            result=review(json.loads(self.rfile.read(length)),self.server.key)
            self.send_json(200,{"review":result})
        except HTTPError as e:
            self.send_json(502,{"error":"OpenAI 응답 "+str(e.code)+" · 키와 사용 한도를 확인해주세요."})
        except (URLError,TimeoutError):
            self.send_json(502,{"error":"OpenAI 연결을 확인해주세요."})
        except (ValueError,TypeError,KeyError):
            self.send_json(422,{"error":"자료 또는 검토 근거를 확인하지 못했습니다."})
        finally: self.server.lock.release()
def main():
    print("LinkOne · 인스타그램 GPT 검토 도우미")
    key=os.environ.get("OPENAI_API_KEY") or getpass.getpass("OpenAI API 키 (입력값은 숨겨져요): ").strip()
    if not key: return
    try: server=ThreadingHTTPServer(("127.0.0.1",PORT),Handler)
    except OSError:
        print("포트를 열지 못했습니다. 이미 실행 중인 창을 확인하세요.");return
    server.key=key;server.token=secrets.token_urlsafe(24);server.lock=threading.Lock()
    print("확장 설정에 입력할 연결 코드:",server.token)
    print("이 창을 열어두세요. 종료하려면 Ctrl+C")
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=="__main__":main()
