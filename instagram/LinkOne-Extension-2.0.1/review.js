'use strict';
const CampaignReview = (() => {
  const A = CreatorReview;


  function sourceRows(post){
    const caption=(post.caption||'').trim(),alt=(post.alt||'').trim();
    const normalize=text=>text.replace(/\s+/g,' ').trim(),rows=[];
    if(caption)rows.push([post.copiedCaption?'직접 옮긴 캡션':'캡션',caption]);
    if(alt&&normalize(alt)!==normalize(caption))rows.push(['썸네일 설명',alt]);
    if((post.screen||'').trim())rows.push(['직접 옮긴 화면 문구',post.screen.trim()]);
    return rows;
  }
  function postExcerpt(post,keywordHit,anchorLists=[]){
    const rows=sourceRows(post),limit=Math.floor(620/Math.max(1,rows.length));
    return rows.map(([label,text])=>{
      if(text.length<=limit)return label+' · '+text;
      const anchors=[];
      for(const terms of anchorLists){
        const term=terms.find(term=>A.termIndex(text,term)>=0);
        if(term)anchors.push(A.termIndex(text,term));
      }
      if(keywordHit?.label===label)anchors.push(keywordHit.at);
      if(!anchors.length)anchors.push(0);
      const positions=[...new Set(anchors)].slice(0,Math.max(1,Math.floor(limit/120)));
      const width=Math.floor(limit/positions.length)-4;
      const ranges=positions.map(at=>{const start=Math.max(0,Math.min(text.length-width,at-Math.floor(width/3)));return [start,Math.min(text.length,start+width)];}).sort((a,b)=>a[0]-b[0]);
      const merged=[];
      for(const range of ranges){const last=merged.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push(range);}
      return label+' · '+merged.map(([start,end])=>(start?'…':'')+text.slice(start,end)+(end<text.length?'…':'')).join(' ');
    }).join('\n');
  }

  function sample(result, config) { return selection(result,config).posts; }
  function selection(result, config={}) {
    const items=[...result.matches,...result.partial],candidates=items.map(item=>item.post);
    const hits=new Map(items.map(item=>[item.post.id,item.keywordHit]));
    const hasText=post=>sourceRows(post).length>0;
    const targets=fitTargets(config),targeted=targets.length>0;
    const candidateIds=new Set(candidates.map(post=>post.id));
    const other=result.hasKeywords?[]:result.metricPosts.filter(post=>!candidateIds.has(post.id)&&hasText(post));
    const leading=candidates.filter(hasText).slice(0,24-Math.min(8,other.length));
    const legacy=[...leading,...other,...candidates];
    const pool=new Map((targeted?result.posts:legacy).map(post=>[post.id,post]));
    for(const post of result.picked)pool.set(post.id,post);
    const readable=[...pool.values()].filter(hasText),selected=new Map();
    const textOf=post=>sourceRows(post).map(([,text])=>text).join('\n');
    const lists=targets.map(target=>({kind:target.kind,primary:A.reviewTerms(target.subject),secondary:A.reviewTerms(target.criteria)}));
    if(targeted&&(config.requirements||config.target))lists.push({kind:'conditions',primary:A.reviewTerms(config.requirements),secondary:A.reviewTerms(config.target)});
    const terms=[...new Set(lists.flatMap(t=>[...t.primary,...t.secondary]))];
    const documents=new Map(readable.map(post=>[post.id,textOf(post)]));
    const rarity=new Map(terms.map(term=>[term,1+Math.log((readable.length+1)/(1+readable.filter(post=>A.termIndex(documents.get(post.id),term)>=0).length))]));
    const score=(post,list)=>[...list.primary.map(term=>[term,4]),...list.secondary.map(term=>[term,1])].reduce((n,[term,weight])=>n+(A.termIndex(documents.get(post.id),term)>=0?weight*rarity.get(term):0),0);
    const ranked=lists.map(list=>readable.map(post=>({post,score:score(post,list)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||(b.post.date||0)-(a.post.date||0)||a.post.id.localeCompare(b.post.id)));
    const add=post=>{if(selected.size<24&&hasText(post)&&!selected.has(post.id))selected.set(post.id,post);};
    result.picked.forEach(add);
    // Round-robin protects each entered target; retain room for contextual posts.
    let progressed=true;
    while(targeted&&selected.size<18&&progressed){
      progressed=false;
      for(const queue of ranked){
        while(queue.length&&selected.has(queue[0].post.id))queue.shift();
        if(queue.length&&selected.size<18){add(queue.shift().post);progressed=true;}
      }
    }
    for(const post of legacy)add(pool.get(post.id)||post);
    if(targeted)for(const post of readable)add(post);
    const anchorLists=lists.map(list=>[...list.primary,...list.secondary].sort((a,b)=>(rarity.get(b)||0)-(rarity.get(a)||0)));
    const relatedIds=new Set(result.relatedPosts.map(post=>post.id));
    const posts=Array.from(selected.values(),post=>({
      id:post.id,url:post.url,text:postExcerpt(post,hits.get(post.id),anchorLists),
      source:post.chosen?'담당자 직접 선정':'',note:post.note||'',related:relatedIds.has(post.id),
      format:post.reel?'릴스':'피드',views:post.views??null,
      
      disclosed:!!post.ad
    }));
    return {posts,info:{eligible:pool.size,readable:readable.length,selected:posts.length,omitted:readable.length-posts.length,missingText:pool.size-readable.length,targeted}};
  }

  function conditionList(config={}){
    const text=String(config.requirements||'').replace(/\u00a0/g,' ').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    const parts=text.split('\n').map(s=>s.trim()).filter(Boolean);
    const grouped=parts.length>8?[...parts.slice(0,7),parts.slice(7).join('; ')]:parts;
    return grouped.map((part,index)=>({id:'r'+(index+1),text:part}));
  }

  const fitLabels={product:'제품 적합도',store:'매장 홍보 적합도',brand:'브랜드 적합도'};
  function fitTargets(config){
    return Object.entries(fitLabels).flatMap(([kind,label])=>{
      const subject=(config[kind]||'').trim();
      return subject?[{kind,label,subject,criteria:kind==='brand'?(config.brandValues||''):''}]:[];
    });
  }

  function payload(raw, config, result) {
    const picked=selection(result,config);
    const metrics = {};
    for (const key of ['er', 'all', 'likes', 'comments', 'ad', 'other']) {
      const {value, n, total} = result[key];
      metrics[key] = {value, n, total};
    }
    return {
      user: raw.user, campaign: A.name(config), focus: A.focus[config.mode], brief: config.brief || '',
      target: config.target, period: result.range.label+' · '+A.coverage(result)+' · 계정 지표 범위 '+result.metricLabel+' '+result.metricPosts.length+'건 / 기간 내 읽은 '+result.posts.length+'건', checkedAt: A.date(raw.at),
      followers: raw.followers, followerSource: raw.followerSource,
      metrics, relatedMetrics:result.relatedMetrics, relatedCount:result.relatedCount, relatedIds:result.relatedPosts.map(p=>p.id),
      fitTargets:fitTargets(config),requirements:config.requirements||'',conditions:conditionList(config),sampleInfo:picked.info,posts:picked.posts
    };
  }

  function prompt(data) {
    const metric = (label, group, format = A.fmt) => {
      const value = !group.total ? '해당 표본 없음' : !group.n ? '미확인' : format(group.value);
      return label + ' · ' + value + ' (' + group.n + '/' + group.total + '건 확인)';
    };
    const m = data.metrics;
    return [
      ReviewRules,
      '다음 순서로 간결하게 작성해. ① 종합 섭외 판단 ② 제품·매장·브랜드별 적합도(입력된 대상만 각각 추천/보통/비추천/판단 보류, 이유와 원문 인용·링크) ③ 계정 표본과 관련 게시물 지표 비교 ④ 부족한 자료 ⑤ 섭외 전 질문. 각 인용 끝에 해당 원문 링크를 붙여.',
      '', '계정 · @' + data.user, '선택한 캠페인 조건 · ' + data.campaign, '이 캠페인의 검토 기준 · ' + data.focus,
      '홍보 목적·보충 설명 · ' + (data.brief.trim() || '미지정'),
      ...(data.fitTargets||[]).map(t=>t.label+' 대상 · '+t.subject+(t.criteria?' / 브랜드 특징·원하는 이미지 · '+t.criteria:'')),
      '필수조건 · '+(data.requirements||'미지정'),
      ...(data.conditions||[]).map(item=>'조건 '+item.id+' · '+item.text),
      '각 조건을 확인·미확인·충돌로 나누고 확인/충돌은 해당 조건을 입증하는 짧은 원문과 링크를 붙여. 미확인 필수조건이 있으면 추천하지 마. 과거 활동은 이번 촬영 가능 여부나 실제 고객층의 증빙이 아니야.',
      'GPT 검토용 타깃·지역 · ' + (data.target.trim() || '미지정'),
      data.period + ' · 확인일 ' + data.checkedAt,
      '팔로워 · ' + A.fmt(data.followers) + (data.followerSource === 'manual' ? ' (직접 입력)' : ''),
      metric('팔로워 대비 게시물 반응률 중앙값', m.er, A.percent), metric('릴스 조회수 중앙값', m.all),
      metric('좋아요 중앙값', m.likes), metric('댓글 중앙값', m.comments),
      metric('협찬 표기 릴스 조회수 중앙값', m.ad), metric('표기 미확인 릴스 조회수 중앙값', m.other),
      '', '관련 게시물 지표 · '+(data.relatedCount||0)+'건 (표현 확인·후보·직접 선정, 중복 제외)',
      ...Object.entries(data.relatedMetrics||{}).map(([k,g])=>metric(({er:'팔로워 대비 반응률',all:'영상 조회수',ad:'협찬 표기 영상 조회수',other:'협찬 표기 미확인 영상 조회수',likes:'좋아요',comments:'댓글',shares:'공유',saves:'저장',viewEr:'조회수 대비 반응률'}[k])+' 중앙값',g,['er','viewEr'].includes(k)?A.percent:A.fmt)),
      '관련 게시물 지표와 AI에 전달되는 최대 24건의 텍스트 표본은 별개입니다. 미확인을 0으로 해석하지 마세요.',
      '', '적합도 검토 범위 · 원문 있는 '+data.sampleInfo.readable+'건 중 '+data.sampleInfo.selected+'건 / 미포함 '+data.sampleInfo.omitted+'건 / 원문 없는 '+data.sampleInfo.missingText+'건. 입력 대상별 표현을 우선 선정한 발췌 자료이며 계정 전체를 검토한 것이 아닙니다.',
      '', '계정 지표 표본 ' + m.er.total + '건 · 검토할 게시물 ' + data.posts.length + '건',
      ...data.posts.map(post => post.url + ' | ' + [post.format,post.source].filter(Boolean).join(' · ') + '\n' + (post.text || '원문 텍스트 미확인') + (post.note?'\n선정 메모(담당자 의견) · '+post.note:''))
    ].join('\n');
  }
  return {payload, prompt, sample, selection, conditionList, fitTargets, fitLabels};
})();
