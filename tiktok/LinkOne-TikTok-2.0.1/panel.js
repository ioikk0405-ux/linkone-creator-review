'use strict';
const ReviewPanel=(()=>{
 const A=CreatorReview;
 const esc=s=>String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
 const paths={fold:'M5 12h14',settings:'M4 7h16m-16 10h16M8 4v6m8 4v6',open:'M7 17 18 6M8 6h10v10',file:'M3 4h18v16H3zM4 16l6-6 4 4 3-3 3 4',scan:'M19 10a7 7 0 1 0 0 5 M19 5v5h-5',copy:'M8 8h12v13H8z M16 8V3H3v13h5',csv:'M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5'};
 const icon=k=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[k]+'"/></svg>';
 function mount(host,initial,io){
  const root=host.attachShadow({mode:'open'}),q=s=>root.querySelector(s);let raw=initial.raw,c=A.campaign(initial.cfg),period='all',tab=initial.tab==='stats'?'stats':'posts',statsScope='account',working=false,progress='',all=false,allPartial=false,ai=null,asking=false,version=0,active=true,r;
  const pickForm = [
    '<details class="advanced pickForm"><summary>게시물 직접 추가 <small class="pickCount"></small></summary>',
    '<label for="pickLinks">이 계정의 영상·사진 게시물 링크</label><textarea id="pickLinks" rows="3" maxlength="12000" placeholder="https://www.tiktok.com/@아이디/video/번호"></textarea>',
    '<p class="hint">PC 주소창의 영상·사진 원문 링크를 한 줄에 하나씩 붙여넣으세요. 매장·제품별 최대 10개예요. 원문이 안 읽히면 추가한 글의 ‘입력·수정’에서 게시일·캡션·메모를 적을 수 있어요.</p>',
    '<button class="btn" data-do="addPicks">목록에 추가</button>',
    io.demo?'<button class="btn" data-do="pickExample">예시 링크 2개 채우기</button>':'',
    '<div class="pickList"></div><div class="pickEdit" hidden>',
    '<strong class="editTitle"></strong><label>원문에서 확인한 게시일 (한국시간)<input type="date" id="pickDay"></label>',
    '<label>영상·썸네일에서 그대로 옮긴 화면 문구<textarea id="pickScreen" rows="2" maxlength="320"></textarea></label>',
    '<label>원문에서 그대로 옮긴 캡션<textarea id="pickQuote" rows="2" maxlength="640"></textarea></label>',
    '<label>선정 이유 · 담당자 메모<textarea id="pickNote" rows="2" maxlength="300" placeholder="예: 영상에서 매장 입구와 찾아가는 길을 보여줌"></textarea></label>',
    '<button class="btn" data-do="savePick">저장</button><button class="btn" data-do="cancelPick">취소</button></div>',
    '<p class="hint pickFeedback" role="status" aria-live="polite"></p></details>'
  ].join('');
  let editingPick=null;
  root.innerHTML='<style>'+CreatorTheme+'</style><section class="box" lang="ko" aria-label="틱톡 크리에이터 검토"><div class="head"><div class="bar"><div class="brand"><img class="logo" alt="" src="'+esc(io.brandMark||LinkOneMark)+'"><span class="brand-name">LinkONE</span><em>TikTok Review 2.0.1</em></div><div class="actions"><button data-do="settings" aria-label="GPT 연결 설정" title="GPT 연결 설정">'+icon('settings')+'</button><button data-do="fold" aria-label="패널 접기">'+icon('fold')+'</button></div></div><div class="id"><h2></h2><span class="sample" hidden>예시 계정</span></div><p class="subtitle"></p></div><div class="scroll"><div class="campaign"><span class="label">캠페인 조건</span><div class="switch" role="group" aria-label="홍보 대상"></div><div class="chips" role="group" aria-label="분야 복수 선택"></div><details class="advanced"><summary>키워드·타깃 설정</summary><label>검색 키워드 · 쉼표로 구분<input id="terms" maxlength="180" placeholder="예: 광동, 비타민 젤리"></label><p class="hint">키워드는 관련 게시물을 선별해요. 적합도 검토에서는 입력한 제품·매장·브랜드의 근거도 함께 찾아요.</p><label>타깃·지역 · GPT 검토용<input id="target" maxlength="120" placeholder="예: LA 한인타운 방문객"></label><p class="hint">타깃은 GPT가 적합성을 검토할 때 참고해요. 실제 도달 지역·연령은 인사이트로 확인해야 해요.</p></details></div><div class="scope"><label for="period">게시 기간</label><select id="period" aria-label="집계 범위"><option value="all">읽은 게시물 전체</option><option value="7">최근 7일</option><option value="30">최근 1개월 (30일)</option><option value="90">최근 90일</option><option value="custom">직접 설정</option></select><span class="state" role="status"></span></div><div class="dateRange" hidden><label>시작일<input type="date" id="rangeStart"></label><label>종료일<input type="date" id="rangeEnd"></label></div><p class="periodHint" role="status" aria-live="polite"></p><nav class="tabs" aria-label="검토 결과"><button data-tab="posts">관련 게시물<span class="badge"></span></button><button data-tab="stats">계정 지표</button><button data-tab="ai">적합도</button></nav>'+pickForm+'<details class="advanced reviewBrief" hidden open><summary>홍보 대상과 적합도 기준</summary><p class="hint">검토할 대상만 입력하세요. 제품·매장·브랜드를 함께 입력하면 각각 검토해요.</p><label>제품명·제품 유형<input id="product" maxlength="160" placeholder="예: 광동 비타민 젤리 · 건강식품 시식"></label><label>매장명·위치<input id="store" maxlength="160" placeholder="예: K-Gallery · LA 한인타운"></label><label>브랜드명<input id="brand" maxlength="120" placeholder="예: OLGO"></label><label>브랜드 특징·원하는 이미지<input id="brandValues" maxlength="240" placeholder="예: 두피 케어 · 차분한 사용 후기"></label><label>홍보 목적·보충 설명<input id="brief" maxlength="160" placeholder="예: 매장 방문 안내, 제품 사용 후기"></label><label>필수조건<input id="requirements" maxlength="240" placeholder="예: 현장 방문 촬영, 경쟁 브랜드 협업 확인"></label><p class="hint">적합도는 선택 기간의 읽은 원문에서 대상별 표현을 우선 골라 검토해요. 관련 게시물 목록·지표는 위의 분야·키워드·홍보 방식 조건을 유지해요.</p></details><div class="content"></div><details class="advanced followerForm" hidden><summary>프로필에서 본 팔로워 수 직접 입력</summary><label>팔로워 수<input id="manualFollowers" inputmode="decimal" maxlength="22" placeholder="예: 12,345 또는 1.2만"></label><button class="btn" data-do="saveFollowers">적용</button><button class="btn" data-do="clearFollowers" hidden>입력값 지우기</button></details></div><p class="feedback" role="status"></p><textarea class="copyFallback" hidden readonly aria-label="복사할 텍스트"></textarea><div class="foot"><button class="btn primary" data-do="scan" title="확인한 틱톡 원문에서 캡션·게시일·반응 수치를 확인합니다">'+icon('scan')+'<span>게시물 정보 불러오기</span></button><button class="btn push" data-do="copy">'+icon('copy')+'요약 복사</button><button class="btn" aria-label="CSV 다운로드" title="CSV 다운로드" data-do="csv">'+icon('csv')+'</button></div></section><button class="pill" data-do="unfold" hidden>크리에이터 검토 열기</button>';
  if(io.demo)q('.pickForm').open=true;
  q('h2').textContent='@'+raw.user;q('.sample').hidden=!io.demo;q('#terms').value=c.terms;q('#target').value=c.target;q('#brief').value=c.brief;for(const key of ['product','store','brand','brandValues','requirements'])q('#'+key).value=c[key];
  q('.switch').innerHTML=Object.entries(A.modes).map(([k,v])=>'<button data-mode="'+k+'">'+v[0]+'</button>').join('');
  q('.chips').innerHTML='<button data-field="all">전체</button>'+Object.entries(A.topics).map(([k,v])=>'<button data-field="'+k+'">'+v[0]+'</button>').join('');
  const note=txt=>{q('.feedback').textContent=txt;};
  const link=p=>'href="'+esc(p.url)+'" '+(io.demo&&p.url.startsWith('#sample-')?'data-example="'+esc(p.id)+'"':'target="_blank" rel="noopener noreferrer"');
  const empty=(a,b)=>'<div class="empty"><b>'+esc(a)+'</b><p>'+esc(b)+'</p></div>';
  const row=x=>{const p=x.post,thumb=p.thumb&&(/^https:\/\//.test(p.thumb)||io.demo&&p.thumb.startsWith('data:image/'));return '<li><a class="article" '+link(p)+'><span class="art">'+(thumb?'<img alt="" loading="lazy" referrerpolicy="no-referrer" src="'+esc(p.thumb)+'">':icon('file'))+'</span><span class="middle"><span class="meta"><span class="type">'+(p.reel?'영상':'사진')+'</span>'+esc(A.date(p.date))+(p.ad?' · 협찬 표기':'')+(r.picked.some(item=>item.id===p.id)?' · 직접 선정':'')+'</span><span class="excerpt">'+esc(x.excerpt||p.caption||p.alt)+'</span></span>'+icon('open')+'</a><p class="reason"><b>'+esc(x.source)+'</b> · '+esc(x.reason)+'</p></li>';};
  function renderPicks(){
    const items=raw.picks?.[c.mode]||[], pickedIds=new Set(r.picked.map(p=>p.id));
    q('.pickForm').hidden=tab!=='posts';
    q('.pickCount').textContent=items.length+' / 10';
    q('.pickList').innerHTML=items.map(item=>{
      const observed=raw.posts.find(p=>p.id===item.id);
      const status=item.detail?.wrongOwner&&!observed?'다른 계정 · 집계 제외':!pickedIds.has(item.id)?'기간 집계 제외':!observed&&!item.detail?'원문 확인 필요':'';
      const action='<button class="btn" data-edit="'+esc(item.id)+'">입력·수정</button><button class="btn" data-remove="'+esc(item.id)+'">삭제</button>';
      return '<div class="pickLine"><a '+link(item)+'>'+esc(item.id)+' ↗</a><span>'+esc(status)+'</span>'+action+'</div>';
    }).join('');
    q('.pickEdit').hidden=!items.some(item=>item.id===editingPick);
  }
  function selectedEvidence(){
    if(!r.pickedOnly.length)return '';
    return '<section class="candidates"><h3>직접 선정한 게시물 '+r.pickedOnly.length+'건</h3><ol class="list">'+r.pickedOnly.map(post=>{
      const source=post.caption?(post.copiedCaption?'직접 옮긴 캡션':'캡션'):post.alt?'썸네일 설명':post.screen?'직접 옮긴 화면 문구':'원문 텍스트 미확인';
      return row({post,source,excerpt:post.caption||post.alt||post.screen||post.id,reason:post.note?'선정 메모 · '+post.note:'담당자 직접 선정'});
    }).join('')+'</ol></section>';
  }
  async function modifyPick(action){
    const currentMode=c.mode,feedback=q('.pickFeedback');
    try{
      const previous=raw.picks?.[currentMode]||[];
      const result=await io.picks(currentMode,action);
      if(!active||currentMode!==c.mode)return;
      if(action.type==='add'){
        q('#pickLinks').value='';
        const delta=result.length-previous.length;
        feedback.textContent=delta?delta+'건을 추가했어요. 중복 링크는 한 번만 반영해요.':'이미 직접 선정한 게시물이에요.';
      }else{
        editingPick=null;feedback.textContent=action.type==='remove'?'직접 선정 목록에서 삭제했어요.':'저장했어요.';
      }
      renderPicks();
    }catch(error){if(active&&currentMode===c.mode)feedback.textContent=error.message||'저장하지 못했어요. 다시 시도해주세요.';}
  }
  function evidence(){
    if(!raw.posts.length&&!r.picked.length)return empty('아직 읽은 게시물이 없어요','프로필의 게시물 탭에서 목록을 조금 내려주세요. 표시되지 않는 게시물은 읽을 수 없습니다.');
    if(!r.posts.length&&!r.picked.length)return empty('이 기간에 확인한 게시물이 없어요','게시물 정보를 불러오거나 집계 범위를 바꿔주세요.');
    const subject=c.fields.map(k=>A.topics[k][0]).join('·')||(c.terms.trim()?'키워드':'캠페인');
    const total=r.relatedCount;
    const action={store:'매장 방문·안내',product:'제품 사용·소개'}[c.mode];
    const scope='<div class="top"><h3>'+esc(subject)+' 관련 게시물 '+total+'건</h3><small>읽은 게시물 '+r.posts.length+'건</small></div>';
    const counts='<p class="hint">'+A.focus[c.mode]+'</p><p class="hint">캡션 '+r.captions+'건 · 썸네일 설명 '+r.alts+'건</p>';
    if(!total)return scope+counts+empty(r.texts?'현재 조건에 맞는 텍스트를 찾지 못했어요':'읽은 게시물에 설명이 없어요','‘게시물 정보 불러오기’를 눌러 캡션을 확인하세요. 영상에만 보이는 문구는 ‘게시물 직접 추가 → 입력·수정’에 옮겨 적을 수 있어요.');
    const exact='<div class="top"><h3>'+action+' 표현 확인 '+r.matches.length+'건</h3></div>';
    const list='<ol class="list">'+r.matches.slice(0,all?100:3).map(row).join('')+'</ol>';
    const more=r.matches.length>3?'<button class="btn" data-do="more">'+(all?'접기':'근거 '+r.matches.length+'건 모두 보기')+'</button>':'';
    const pending=r.partial.length?'<section class="candidates"><h3>원문 확인 후보 '+r.partial.length+'건</h3><p class="hint">장소·분야·키워드 단서가 있어요. '+action+' 여부는 원문에서 확인하세요.</p><ol class="list">'+r.partial.slice(0,allPartial?100:2).map(row).join('')+'</ol>'+(r.partial.length>2?'<button class="btn" data-do="morePartial">'+(allPartial?'후보 접기':'후보 '+r.partial.length+'건 모두 보기')+'</button>':'')+'</section>':'';
    return scope+counts+exact+list+more+pending+selectedEvidence();
  }
  function metric(label,g,format=A.fmt){
    const value=Number.isFinite(g.value)?format(g.value):g.total?'미확인':'해당 표본 없음';
    return '<div class="metric"><small>'+label+'</small><b>'+esc(value)+'</b><span>중앙값 · '+g.n+' / '+g.total+'건 확인</span></div>';
  }
  function stats(){
    const s=A.metricView(r,statsScope),related=statsScope==='related';
    const toggle='<div class="switch metricSwitch" role="group" aria-label="지표 대상"><button data-scope="account" aria-pressed="'+!related+'">'+(c.fields.length?'선택 분야 전체':'읽은 전체')+' '+r.metricPosts.length+'</button><button data-scope="related" aria-pressed="'+related+'">관련 게시물 '+r.relatedCount+'</button></div>';
    if(related&&!s.metricPosts.length)return toggle+empty('관련 게시물 0건','분야·키워드·홍보 방식을 바꾸거나 관련 게시물을 직접 추가해 주세요.');
    const f=raw.followers;
    if(c.fields.length&&s.posts.length&&!s.metricPosts.length){
      const missing=s.posts.length-s.texts;
      return toggle+'<h3>'+ (related?'관련 게시물 지표':'계정 지표 · '+esc(s.metricLabel))+'</h3>'+empty('분야로 분류된 게시물 0건',
        '기간 내 '+s.posts.length+'건 중 '+s.texts+'건의 글에서 선택 분야 표현을 찾지 못했어요.'+
        (missing?' 나머지 '+missing+'건은 확인할 텍스트가 없어요.':'')+' 제품명이 화면에만 있다면 관련 게시물에서 원문 링크와 화면 문구를 직접 추가해 주세요.');
    }
    const summary='<div class="top"><h3>'+ (related?'관련 게시물 지표':'계정 지표 · '+esc(s.metricLabel))+'</h3><small>게시물 '+s.metricPosts.length+'건 · 영상 '+s.all.total+'건</small></div>';
    const missingReactions=s.metricPosts.length&&['likes','comments','shares','saves'].every(key=>r[key].n===0);
    const coverageHint=missingReactions?'<p class="hint" role="status">이 표본에서 좋아요·댓글·공유·저장을 아직 읽지 못했어요. 프로필을 새로고침하고 게시물 목록을 조금 내려주세요. 계속 미확인이면 아래 ‘게시물별 원문과 공개 반응’에서 원문을 열어주세요.</p>':'';
    const metrics='<div class="statgrid">'+metric('팔로워 대비 게시물 반응률',s.er,A.percent)+metric('영상 조회수',s.all)+metric('조회수 대비 영상 반응률',s.viewEr,A.percent)+metric('게시물 공유',s.shares)+metric('게시물 저장',s.saves)+metric('게시물 좋아요',s.likes)+metric('게시물 댓글',s.comments)+'</div>';
    const hint=f===0?'팔로워가 0명으로 표시되어 참여율을 계산할 수 없어요.':!Number.isFinite(f)?'참여율 계산에 필요한 팔로워 수를 아직 읽지 못했어요.':!s.er.n?'좋아요와 댓글을 모두 읽은 게시물이 필요해요. ‘게시물 정보 불러오기’를 눌러주세요.':'게시물마다 (좋아요 + 댓글) ÷ 현재 팔로워 수 × 100을 계산한 뒤 가운데 값을 표시해요. 같은 사람이 남긴 여러 반응도 포함돼요.';
    const reelsHint='<p class="hint">조회수 대비 영상 반응률은 영상별 (좋아요 + 댓글 + 공유) ÷ 조회수 × 100의 중앙값이에요. 세 반응 수치가 모두 있고 조회수가 1회 이상인 영상만 포함해요. 사진 게시물은 별도로 구분해요.</p>';
    const breakdown='<details class="partial"><summary>협찬 표기별 영상 조회수</summary><div class="statgrid">'+metric('협찬 표기 확인',s.ad)+metric('협찬 표기 미확인',s.other)+'</div></details>';
    const audit='<details class="partial"><summary>게시물별 원문과 공개 반응 · '+s.metricPosts.length+'건</summary>'+s.metricPosts.map(p=>{
      const counts=[['조회',p.viewsRaw||A.fmt(p.views)],['좋아요',A.fmt(p.likes)],['댓글',A.fmt(p.comments)],['공유',A.fmt(p.shares),p.sharesSource],['저장',A.fmt(p.saves),p.savesSource]];
      return '<div class="postCounts"><a '+link(p)+'>'+esc(A.date(p.date))+' · '+(p.reel?'영상':'사진')+' ↗</a><p>'+counts.map(([label,value,source])=>label+' '+esc(value)+(source?' ('+esc(source)+')':'')).join(' · ')+'</p></div>';
    }).join('')+'</details>';
    const scopeHint=related?'현재 관련 게시물 목록의 표현 확인·후보·직접 선정 글을 중복 없이 집계해요. 직접 선정 글은 분야·키워드와 달라도 포함돼요.':'선택 기간·분야에 해당하는 읽은 게시물의 지표예요. 키워드와 홍보 방식은 관련 게시물 지표에 적용돼요.';
    const small=related&&s.metricPosts.length<5?'<p class="hint sampleWarning">관련 게시물이 '+s.metricPosts.length+'건으로 적어요. 계정 전체 경향으로 일반화하기 어려워요.</p>':'';
    return toggle+summary+'<p class="hint">'+scopeHint+' 모든 반응은 확인 시점의 누적 수치예요.</p>'+small+metrics+coverageHint+'<p class="hint">'+hint+'</p>'+reelsHint+breakdown+audit+'<p class="hint">확인한 0회는 포함해요. K·만 단위의 화면 표기는 근삿값이에요.</p>';
  }
  function reviewCount(){
    return CampaignReview.sample(r,c).length;
  }
  function aiPage(){
    const selection=CampaignReview.selection(r,c),sample=selection.posts,targets=CampaignReview.fitTargets(c);
    const hasSource=sample.some(post=>post.text.trim());
    const grading=ReviewRules.split('\n').filter(line=>/^(추천|보통|비추천|판단 보류) · /.test(line)).map(line=>'<li>'+esc(line)+'</li>').join('');
    const evidenceList=items=>(items||[]).map(item=>{
      const post=r.picked.find(p=>p.id===item.id)||r.posts.find(p=>p.id===item.id);
      if(!post)return '';
      return '<li><q>'+esc(item.quote)+'</q> '+esc(item.why)+' <a '+link(post)+'>원문 ↗</a></li>';
    }).join('');
    const cards=Object.entries(CampaignReview.fitLabels).map(([kind,label])=>{
      const target=targets.find(t=>t.kind===kind),fit=ai?.fits?.find(t=>t.kind===kind);
      const verdict=!target?'미입력':fit?.verdict||(!hasSource?'판단 보류':'검토 전');
      const body=!target?'검토할 대상을 입력하면 함께 분석해요.':fit?.reason||(!hasSource?'판단할 원문이 부족해요. 게시물 정보를 불러오거나 원문을 직접 추가해 주세요.':'원문 근거를 바탕으로 판단해요. 아래 요청문을 복사하거나 연결한 GPT로 검토하세요.');
      return '<section class="fitCard"><div class="top"><h3>'+label+'</h3><span class="fitVerdict">'+esc(verdict)+'</span></div>'+(target?'<p class="fitSubject">'+esc(target.subject)+'</p>':'')+'<p>'+esc(body)+'</p>'+(fit?.evidence?.length?'<ul>'+evidenceList(fit.evidence)+'</ul>':'')+(fit?.missing?'<p class="hint"><b>추가 확인</b> · '+esc(fit.missing)+'</p>':'')+'</section>';
    }).join('');
    const conditions=ai?.conditionChecks?.length?'<section class="airesult"><h4>필수조건 확인</h4>'+ai.conditionChecks.map(check=>'<div class="fitCard"><p><b>'+esc(check.state)+' · '+esc(check.text)+'</b></p><p>'+esc(check.reason)+'</p>'+(check.evidence?.length?'<ul>'+evidenceList(check.evidence)+'</ul>':'')+'</div>').join('')+'</section>':'';
    const overall=ai?'<section class="airesult"><h3>종합 섭외 판단 · '+esc(ai.verdict)+'</h3><p>'+esc(ai.summary)+'</p><h4>원문 근거</h4><ul>'+evidenceList(ai.evidence)+'</ul><h4>부족한 자료</h4><p>'+esc(ai.limits)+'</p><h4>섭외 전 질문</h4><p>'+esc(ai.check)+'</p></section>':'';
    return '<h3>제품·매장·브랜드 적합도</h3><p class="hint">원문 있는 '+selection.info.readable+'건 중 검토 표본 '+sample.length+'건 · 미포함 '+selection.info.omitted+'건 · 원문 없는 '+selection.info.missingText+'건. 관련 게시물 '+r.relatedCount+'건의 지표는 별도 범위예요. 실제 고객층·방문·구매 성과는 별도 증빙이 필요해요.</p>'+(!hasSource?'<p class="hint">판단할 원문이 부족해요. 게시물 정보를 불러오거나 원문을 직접 추가해 주세요.</p>':'')+cards+conditions+overall+
      '<div class="ai-actions"><button class="btn primary" data-do="prompt" '+(sample.length?'':'disabled')+'>적합도 검토 요청문 복사</button></div><p class="hint">ChatGPT·Claude에 붙여넣어 검토할 수 있어요. 복사만으로 API가 호출되지는 않아요.</p>'+
      '<details class="partial"><summary>섭외 판단 기준</summary><ul>'+grading+'</ul></details><details class="partial"><summary>패널에서 GPT로 검토</summary><p class="hint">'+(io.demo?'예시 모드에서는 유료 호출을 실행하지 않아요.':'PC 도우미 2.0.1로 공개 게시물 최대 24건과 두 집계 범위의 지표를 보내요. 버튼을 누르면 API 사용료가 발생할 수 있어요.')+'</p><button class="btn" data-do="ask" '+(asking||!sample.length?'disabled':'')+'>'+(asking?'검토 중…':'연결한 GPT로 적합도 검토')+'</button></details>';
  }
  function status(msg,b){progress=msg;working=b;q('.state').textContent=progress||'읽은 게시물 '+raw.posts.length+'건';q('[data-do=scan] span').textContent=working?'불러오기 중단':'게시물 정보 불러오기';}
  function render(){if(!active)return;r=A.results(raw,c,period);
    const {range}=r;
    const dateHint=q('.periodHint');
    q('.dateRange').hidden=period?.type!=='custom';
    if(range.error)dateHint.textContent=range.error;
    else if(range.start)dateHint.textContent=range.start+' ~ '+range.end+' (한국시간) · 기간 내 '+r.posts.length+'건 · '+A.coverage(r);
    else dateHint.textContent=r.unknownDates?A.coverage(r):'';
    if(range.start&&!range.error){
      const saved=(raw.picks?.[c.mode]||[]).filter(p=>!p.detail?.wrongOwner);
      if(saved.length)dateHint.textContent+=' · 직접 선정 '+r.picked.length+'/'+saved.length+'건 포함 (게시일 기준)';
    }
    dateHint.hidden=!dateHint.textContent;
    q('.subtitle').textContent='TikTok  ·  팔로워 '+A.fmt(raw.followers)+(raw.followerSource==='manual'?' (직접 입력)':'')+'  ·  영상 '+r.all.total+'건';for(const [key,activeValue] of [['mode',c.mode],['tab',tab]])root.querySelectorAll('[data-'+key+']').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===activeValue)));root.querySelectorAll('[data-field]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.field==='all'?!c.fields.length:c.fields.includes(b.dataset.field))));q('.badge').textContent=r.relatedCount;renderPicks();
    const manual=raw.followerSource==='manual';
    q('.reviewBrief').hidden=tab!=='ai';q('.followerForm').hidden=!!io.demo||tab!=='stats'||(Number.isFinite(raw.followers)&&!manual);
    q('[data-do=clearFollowers]').hidden=!manual;
    q('.followerForm summary').textContent=manual?'직접 입력한 팔로워 수 수정':'프로필에서 본 팔로워 수 직접 입력';
    if(manual&&!q('.followerForm').open)q('#manualFollowers').value=String(raw.followers);
    q('.content').innerHTML=range.error?'':tab==='posts'?evidence():tab==='stats'?stats():aiPage();q('[data-do=copy]').disabled=!r.posts.length&&!r.picked.length;q('[data-do=csv]').disabled=tab==='stats'?!A.metricView(r,statsScope).metricPosts.length:!r.posts.length&&!r.picked.length;status(progress,working);}
  function invalidate(){version++;ai=null;all=false;allPartial=false;note('');q('.copyFallback').hidden=true;}
  function set(next){invalidate();c=A.campaign(next);io.save(c);render();}
  async function copy(txt){try{await navigator.clipboard.writeText(txt);note('복사했어요.');}catch{const t=q('.copyFallback');t.hidden=false;t.value=txt;t.focus();t.select();note('선택된 내용을 Ctrl+C 또는 ⌘C로 복사하세요.');}}
  root.addEventListener('input',e=>{if(['terms','target','brief','product','store','brand','brandValues','requirements'].includes(e.target.id))set({...c,[e.target.id]:e.target.value});});
  const startInput=q('#rangeStart'),endInput=q('#rangeEnd');
  function applyDates(){
    invalidate();
    period={type:'custom',start:startInput.value,end:endInput.value};
    render();
  }
  q('.scope select').addEventListener('change',e=>{
    if(e.target.value==='custom'){
      if(!startInput.value&&!endInput.value){
        const lastRange=r.range.start?r.range:A.resolvePeriod('30');
        startInput.value=lastRange.start;
        endInput.value=lastRange.end;
      }
      applyDates();
      return;
    }
    invalidate();period=e.target.value;render();
  });
  startInput.addEventListener('input',applyDates);
  endInput.addEventListener('input',applyDates);
  root.addEventListener('click',async e=>{const b=e.target.closest('button,a[data-example]');if(!b)return;const d=b.dataset;
    if(d.example){e.preventDefault();io.example(d.example);return;}if(d.edit){
      const item=raw.picks?.[c.mode]?.find(p=>p.id===d.edit);if(!item)return;
      editingPick=item.id;q('.editTitle').textContent=item.id;q('#pickDay').value=item.day||'';q('#pickQuote').value=item.quote||'';q('#pickScreen').value=item.screen||'';q('#pickNote').value=item.note||'';renderPicks();q('#pickDay').focus();return;
    }
    if(d.scope){statsScope=d.scope==='related'?'related':'account';render();return;}
    if(d.remove){await modifyPick({type:'remove',id:d.remove});return;}
    if(d.mode){if(c.mode!==d.mode){editingPick=null;q('#pickLinks').value='';q('.pickFeedback').textContent='';}set({...c,mode:d.mode});return;}if(d.field){set({...c,fields:d.field==='all'?[]:c.fields.includes(d.field)?c.fields.filter(k=>k!==d.field):[...c.fields,d.field]});return;}if(d.tab){tab=d.tab;render();return;}
    switch(d.do){
      case 'addPicks':await modifyPick({type:'add',input:q('#pickLinks').value});break;
      case 'pickExample':q('#pickLinks').value='#sample-A01\n#sample-A08';break;
      case 'savePick':if(editingPick)await modifyPick({type:'edit',id:editingPick,day:q('#pickDay').value,quote:q('#pickQuote').value,screen:q('#pickScreen').value,note:q('#pickNote').value});break;
      case 'cancelPick':editingPick=null;renderPicks();break;
      case 'fold':case 'unfold':q('.box').hidden=d.do==='fold';q('.pill').hidden=d.do!=='fold';(d.do==='fold'?q('.pill'):q('[data-do=fold]')).focus();break;
      case 'saveFollowers':{const n=A.parseCount(q('#manualFollowers').value);if(n===null||n<=0){note('프로필에서 확인한 양수를 입력해주세요.');break;}io.followers(n);q('.followerForm').open=false;note('이 계정에 직접 입력한 팔로워 수를 적용했어요.');break;}
      case 'clearFollowers':io.followers(null);q('#manualFollowers').value='';q('.followerForm').open=false;break;
      case 'morePartial':allPartial=!allPartial;render();break;
      case 'more':all=!all;render();break;case 'scan':io.scan(c.mode);break;case 'settings':io.settings();break;
      case 'copy':await copy(A.summary(raw,c,r));break;
      case 'prompt':if(!reviewCount())break;await copy((io.demo?'[가상 예시 데이터]\n':'')+CampaignReview.prompt(CampaignReview.payload(raw,c,r)));break;
      case 'csv':{const u=URL.createObjectURL(new Blob([A.csv(raw,c,r,tab==='stats',tab==='stats'?statsScope:'account')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='LinkOne_TikTok_'+raw.user+'_'+(r.range.start?r.range.start+'_'+r.range.end:A.date(raw.at))+'_'+(tab==='stats'?statsScope:'posts')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);break;}
      case 'ask':{if(asking||!reviewCount())break;if(io.demo){note('미리보기에서는 GPT를 호출하지 않아요.');break;}const v=++version;asking=true;note('');render();try{const value=await io.ask(CampaignReview.payload(raw,c,r));if(active&&v===version)ai=value;}catch(err){if(active&&v===version)note(err.message||'연결을 확인하세요.');}finally{if(active){asking=false;if(v!==version)note('조건이나 자료가 바뀌어 이전 결과를 표시하지 않았어요. 새 조건으로 다시 검토해 주세요.');render();}}break;}
    }});
  const rawKey=v=>JSON.stringify(v,(key,value)=>['at','seenAt','checkedAt'].includes(key)?undefined:value);
  let lastRawKey=rawKey(raw);
  render();return {setRaw(v){const nextKey=rawKey(v),changed=lastRawKey!==nextKey;raw=v;lastRawKey=nextKey;if(changed)invalidate();render();},note,status,destroy(){active=false;version++;host.remove();}};
 }
 return {mount};
})();
