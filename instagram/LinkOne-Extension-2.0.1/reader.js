'use strict';
const IGReader=(()=>{
  const {parseCount,integer,ad}=CreatorReview;
  const reserved=new Set('accounts about api reels reel p explore direct stories developer emails challenge notifications legal locations tags tagged share graphql web tv privacy static terms directory help'.split(' '));
  const route=path=>{const m=path.match(/^\/([a-z0-9._]{1,30})(?:\/(reels))?\/?$/i);return m&&!reserved.has(m[1].toLowerCase())?{user:m[1].toLowerCase(),reels:!!m[2]}:null};
  const txt=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
  const visible=el=>el&&!el.closest('[hidden],[aria-hidden="true"]')&&el.getClientRects().length>0;
  function link(str){let u;try{u=new URL(str,'https://www.instagram.com/');}catch{return null;}if(!['https://www.instagram.com','https://instagram.com'].includes(u.origin))return null;
    const m=u.pathname.match(/^\/(?:([a-z0-9._]+)\/)?(p|reel)\/([a-zA-Z0-9_-]+)\/?$/i);return m?{id:m[3],url:u.origin+u.pathname,owner:m[1]?.toLowerCase(),reel:m[2]==='reel'}:null;}
  function ownership(doc,main,user){const head=main.querySelector('header')||doc.querySelector('header');if(head){const people=[...head.querySelectorAll('a[href]')].map(a=>a.pathname?.match(/^\/([\w.]+)\/(?:followers|following)\/?$/i)?.[1]?.toLowerCase()).filter(Boolean);
    if(people.length)return people.includes(user);if([...head.querySelectorAll('h1,h2,[role=heading]')].some(n=>txt(n).replace(/^@/,'').toLowerCase()===user))return true;}
    return [...main.querySelectorAll('a[role=tab],a[href$="/reels/"]')].some(a=>a.pathname?.toLowerCase()==='/'+user+'/reels/');}
  const numberPattern='([0-9][0-9,.]*(?:\\s*[kmb천만억](?![a-z]))?)';
  const metricWords={views:'(?:views?|plays?|조회(?:수|\\s*횟수)?|재생(?:수|\\s*횟수)?)',likes:'(?:likes?|좋아요)',comments:'(?:comments?|댓글)',followers:'(?:followers|팔로워)'};
  function metricPatterns(key){
    const w=metricWords[key];
    return [
      new RegExp('(?:^|[^a-z0-9가-힣])'+numberPattern+'\\s*(?:회|개|명)?\\s*'+w+'(?![a-z가-힣])','i'),
      new RegExp('(?:^|[^a-z0-9가-힣])'+w+'\\s*[:：]?\\s*'+numberPattern,'i')
    ];
  }
  const metricRegex=Object.fromEntries(Object.keys(metricWords).map(key=>[key,metricPatterns(key)]));
  function labelledCount(label,key){
    const text=label.normalize('NFKC').trim();
    const direction=/[가-힣]/.test(text)?[1,0]:[0,1];
    // When both pairs are in one string, keep the preceding English or following Korean number with its label.
    for(const i of direction) {
      const match=text.match(metricRegex[key][i]);
      if(match&&parseCount(match[1])!==null)return {n:parseCount(match[1]),raw:match[1].trim()};
    }
    return null;
  }
  function followerLabel(text,exact=false){
    const s=String(text||'').normalize('NFKC').trim();
    // Korean puts the label first. In a multi-stat English header the number precedes it.
    const before=new RegExp('(?:^|[^a-z0-9.,])'+numberPattern+'\\s*(?:명\\s*)?followers?\\b','i');
    const after=new RegExp('팔로워\\s*[:：]?\\s*'+numberPattern,'i');
    const isolated=new RegExp('^(?:followers?\\s*[:：]?\\s*'+numberPattern+'|'+numberPattern+'\\s*명?\\s*팔로워)\\s*$','i');
    const single=new RegExp('^(?:팔로워\\s*[:：]?\\s*'+numberPattern+'명?|'+numberPattern+'\\s*followers?)$','i');
    const regs=exact?[single,isolated]:[after,before,isolated];
    for(const re of regs){const m=s.match(re);if(m){const n=parseCount(m[1]||m[2]);if(n!==null)return n;}}
    return null;
  }
  function followers(doc,user){
    const main=doc.querySelector('main')||doc.querySelector('[role="main"]');
    const head=main?.querySelector('header')||doc.querySelector('header');
    const scope=main||head;
    if(scope){
      for(const a of scope.querySelectorAll('a[href]')){
        if(a.pathname?.toLowerCase().replace(/\/$/,'')!=='/'+user+'/followers'||a.closest('aside,[role=dialog]'))continue;
        const n=parseCount(a.querySelector('[title]')?.title)??followerLabel(a.getAttribute('aria-label'))??followerLabel(txt(a))??parseCount(txt(a));
        if(n!==null)return n;
      }
    }
    const url=meta(doc,'og:url')||doc.querySelector('link[rel="canonical"]')?.href;
    let sameMeta=false;
    try{const u=new URL(url);sameMeta=['https://instagram.com','https://www.instagram.com'].includes(u.origin)&&route(u.pathname)?.user===user;}catch{}
    const isAccountName=n=>txt(n).replace(/^@/,'').toLowerCase()===user&&!n.closest('article,aside,[role=dialog]');
    const heading=scope&&([...scope.querySelectorAll('h1,h2,[role=heading]')].find(isAccountName)||
      [...scope.querySelectorAll('span')].find(n=>!n.childElementCount&&isAccountName(n)));
    const roots=[];
    if(head&&(heading&&head.contains?.(heading)||main&&ownership(doc,main,user)))roots.push(head);
    // Some profile layouts have no header element. Climb only from this exact profile heading.
    let box=heading?.parentElement;
    for(let i=0;box&&box!==main&&i<7;i++,box=box.parentElement){
      if(!box.querySelector('a[href*="/reel/"],a[href*="/p/"]')&&/팔로워|followers?\b/i.test(txt(box))){roots.push(box);break;}
    }
    if(!roots.length&&head&&sameMeta&&!head.querySelector('h1,h2,[role=heading]'))roots.push(head);
    for(const root of new Set(roots)){
      for(const el of root.querySelectorAll('li,button,[role=button],[aria-label],span,div')){
        if(!visible(el))continue;
        const text=el.innerText||txt(el),label=el.getAttribute('aria-label');
        const count=followerLabel(label,true)??followerLabel(text,true);
        if(count!==null)return parseCount(el.querySelector('[title]')?.title)??count;
      }
      const text=root.innerText||txt(root);
      if(/게시물|\bposts?\b/i.test(text)&&/팔로잉|\bfollowing\b/i.test(text)){
        const n=followerLabel(text);if(n!==null)return n;
      }
    }
    return sameMeta?followerLabel(meta(doc,'og:description')||meta(doc,'description')):null;
  }
  const isolatedNumbers=el=>[...el.querySelectorAll('span,div,strong')].filter(n=>!n.childElementCount&&visible(n)).map(txt).filter(s=>parseCount(s)!==null);
  function iconValue(el,anchor,key){
    let box=el.parentElement;
    for(let i=0;box&&box!==anchor&&i<4;i++,box=box.parentElement){
      if(!visible(box))continue;
      const icons=[...box.querySelectorAll('svg')];
      if(icons.length>1)break;
      const context=txt(box);
      if(Object.keys(metricWords).some(k=>k!==key&&new RegExp(metricWords[k],'i').test(context)))break;
      const value=parseCount(context);
      if(value!==null)return {n:value,raw:context};
      const labelled=labelledCount(context,key);
      if(labelled)return labelled;
    }
    return null;
  }
  function counters(a,locReels,isReel){
    const els=[a,...a.querySelectorAll('[aria-label],svg title,svg desc')];
    const labels=els.map(el=>({el,text:el.getAttribute('aria-label')||((el.name||el.tagName||'').toLowerCase()==='a'?'':txt(el))})).filter(v=>v.text);
    const out={};
    for(const key of ['likes','comments','views']){
      if(key==='views'&&!isReel)continue;
      let value;
      for(const {el,text} of labels){
        if(!visible(el)&&!(el.closest('svg')&&visible(el.closest('svg'))))continue;
        value=labelledCount(text,key);
        if(!value&&new RegExp('^'+metricWords[key]+'$','i').test(text.trim())){const own=txt(el),n=parseCount(own);value=n===null?iconValue(el,a,key):{n,raw:own};}
        if(value)break;
      }
      if(!value){
        for(const el of a.querySelectorAll('span,div,strong')){
          if(el.childElementCount||!visible(el))continue;
          const text=txt(el);if(text.length>48)continue;
          value=labelledCount(text,key);if(value)break;
        }
      }
      if(value){out[key]=value.n;if(key==='views')out.viewsRaw=value.raw;}
    }
    if(locReels&&out.views===undefined){
      const hasEngagement=labels.some(l=>/좋아요|댓글|\blikes?\b|\bcomments?\b/i.test(l.text))||/좋아요|댓글|\blikes?\b|\bcomments?\b/i.test(txt(a));
      if(!hasEngagement){const values=isolatedNumbers(a);if(values.length===1){out.views=parseCount(values[0]);out.viewsRaw=values[0];}}
    }
    return out;
  }
  function readCardCounts(a,p,loc){
    const found=counters(a,loc.reels,p.reel||loc.reels);
    if(!loc.reels||found.views!==undefined)return found;
    let wrapper=a.parentElement;
    for(let i=0;wrapper&&i<2;i++,wrapper=wrapper.parentElement){
      if(wrapper.matches('main,section,article,body,[role=main]'))break;
      const links=[...wrapper.querySelectorAll('a[href]')];
      if(links.some(other=>link(other.href)?.id!==p.id))break;
      // A sibling overlay belongs to this tile only when this is its sole media link.
      if(!links.includes(a)||wrapper.querySelector('time,button,[role=button]'))break;
      const overlay=counters(wrapper,true,true);
      if(overlay.views!==undefined)return {...found,views:overlay.views,viewsRaw:overlay.viewsRaw};
    }
    return found;
  }
  function linkedDate(anchor){
    if(!anchor || /[?&]comment_id=/i.test(anchor.href))return NaN;
    const times=anchor.querySelectorAll('time[datetime]');
    if(times.length!==1)return NaN;
    return Date.parse(times[0].getAttribute('datetime'));
  }
  function grid(doc,loc){const main=doc.querySelector('main')||doc.querySelector('[role="main"]');if(!main)return [];const verified=ownership(doc,main,loc.user),map=new Map();
    for(const a of main.querySelectorAll('a[href]')){if(a.closest('aside,header,footer,[role=dialog]')||!visible(a))continue;const p=link(a.href);if(!p||(p.owner?p.owner!==loc.user:!verified))continue;
      const img=a.querySelector('img'),alt=img?.alt?.trim().slice(0,900);const published=linkedDate(a);const row={id:p.id,url:p.url,reel:p.reel||loc.reels,...readCardCounts(a,p,loc),...(Number.isFinite(published)?{date:published}:{}),...(alt?{alt}:{}),...(img?.currentSrc?.startsWith('https://')?{thumb:img.currentSrc}:{}),...(ad(alt)?{ad:true}:{})};map.set(p.id,merge(map.get(p.id),row));if(map.size>=100)break;}return [...map.values()];}
  function media(doc,id){for(const s of doc.querySelectorAll('script[type="application/json"],script[type="application/ld+json"]')){if(s.textContent.length>7e6||!s.textContent.includes(id))continue;let obj;try{obj=JSON.parse(s.textContent)}catch{continue}const stack=[obj];while(stack.length){const x=stack.pop();if(!x||typeof x!=='object')continue;if((x.shortcode===id||x.code===id)&&(x.caption||x.taken_at||x.taken_at_timestamp||x.edge_media_to_caption||x.play_count!=null))return x;for(const v of Object.values(x))if(v&&typeof v==='object')stack.push(v);}}return null;}
  const meta=(doc,key)=>doc.querySelector('meta[property="'+key+'"],meta[name="'+key+'"]')?.content||'';
  function details(doc,p,user,manual=false){const m=media(doc,p.id),raw=meta(doc,'og:url')||doc.querySelector('link[rel="canonical"]')?.href,canon=raw?link(raw):null;
    if((raw&&canon?.id!==p.id)||(!m&&!canon))return null;
    const desc=meta(doc,'og:description')||meta(doc,'description'),cut=desc.search(/:\s*["“]/),head=cut<0?desc:desc.slice(0,cut);const owner=(m?.owner?.username||m?.user?.username||canon?.owner||head.match(/\s[-–]\s+@?([\w.]+)\s+(?:on\s|\d{4}년)/i)?.[1])?.toLowerCase();
    if(owner&&owner!==user&&!(m?.coauthor_producers||[]).some(x=>x.username?.toLowerCase()===user))return manual?{wrongOwner:true}:null;
    if(manual&&!owner&&!p.owner)return null;
    const caption=m?.caption?.text||m?.edge_media_to_caption?.edges?.[0]?.node?.text||(cut>=0?desc.slice(cut+1).trim().replace(/^["“]|["”]\.?$/g,''):'');
    const ko=head.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/),en=head.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/i)?.[0];const ts=m?.taken_at??m?.taken_at_timestamp;
    const date=ts?Number(ts)*1000:Date.parse(meta(doc,'article:published_time')||meta(doc,'video:release_date')||(en?en+' UTC':'')||(ko?ko.slice(1).map(x=>x.padStart(2,'0')).join('-'):''));
    const likes=integer(m?.like_count)??integer(m?.edge_media_preview_like?.count)??parseCount((head.match(/좋아요\s*([\d.,]+\s*[km천만억]?)/i)||head.match(/([\d.,]+[km]?)\s*likes?\b/i))?.[1]);
    const comments=integer(m?.comment_count)??integer(m?.edge_media_to_comment?.count)??parseCount((head.match(/댓글\s*([\d.,]+\s*[km천만억]?)/i)||head.match(/([\d.,]+[km]?)\s*comments?\b/i))?.[1]);
    const v=integer(m?.ig_play_count)??integer(m?.play_count)??integer(m?.video_view_count);
    const out={id:p.id,url:p.url,reel:p.reel||m?.product_type==='clips'||!!canon?.reel};if(caption)out.caption=caption.slice(0,1600);if(Number.isFinite(date))out.date=date;
    if(m?.like_and_view_counts_disabled)out.likes=null;else if(likes!==null)out.likes=likes;if(comments!==null)out.comments=comments;if(v!==null)out.detailViews=v;if(m?.is_paid_partnership||m?.sponsor_tags?.length||ad(caption))out.ad=true;return Object.keys(out).length>3?out:null;}
  function merge(old={},p){const v={...old,...p,reel:!!(old.reel||p.reel),ad:!!(old.ad||p.ad||ad(p.caption||p.alt))};if(!v.viewsRaw&&Number.isFinite(v.detailViews))v.views=v.detailViews;return v;}
  return {route,link,followers,grid,details,merge};
})();
