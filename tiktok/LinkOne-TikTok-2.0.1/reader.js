'use strict';
const TikTokReader = (() => {
  const readCount = CreatorReview.parseCount;
  const handles = '[a-z0-9._]{1,30}';
  const profilePath = new RegExp('^/@(' + handles + ')/?$','i');
  const itemPath = new RegExp('^/@(' + handles + ')/(video|photo)/([0-9]{1,24})/?$','i');
  const origin = 'https://www.tiktok.com';
  function route(path) {
    const match = profilePath.exec(path);
    return match ? {user:match[1].toLowerCase()} : null;
  }
  function link(value) {
    let url;
    try { url = new URL(value,origin); } catch { return null; }
    if (!['https://www.tiktok.com','https://tiktok.com','https://m.tiktok.com'].includes(url.origin) || url.username || url.password) return null;
    const match = itemPath.exec(url.pathname);
    if (!match) return null;
    const owner = match[1].toLowerCase(), id = match[3];
    return {id, owner, reel:match[2]==='video', url:origin+'/@'+owner+'/'+match[2].toLowerCase()+'/'+id};
  }
  const visible = el => el && !el.closest('[hidden],[aria-hidden="true"]') && el.getClientRects().length>0;
  const text = el => el?.textContent?.trim() || '';
  function field(root,selector) {
    return [...root.querySelectorAll(selector)].find(el=>visible(el)&&text(el));
  }
  const cache = new WeakMap();
  function state(doc,selector) {
    const script=doc.querySelector(selector);
    if(!script)return {};
    const content=script.textContent;
    if(!content || content.length>12000000)return {};
    let saved=cache.get(script);
    if(saved?.content===content)return saved.parsed;
    let parsed;
    try{parsed=JSON.parse(content)||{};}catch{parsed={};}
    cache.set(script,{content,parsed});
    return parsed;
  }
  const scope = doc => state(doc,'script[id="__UNIVERSAL_DATA_FOR_REHYDRATION__"]').__DEFAULT_SCOPE__ || {};
  const legacy = doc => state(doc,'script[id="SIGI_STATE"]');
  function followers(doc,user) {
    const info=scope(doc)['webapp.user-detail']?.userInfo;
    if(info?.user?.uniqueId?.toLowerCase()===user) {
      const count=readCount(info.statsV2?.followerCount ?? info.stats?.followerCount);
      if(count!==null)return count;
    }
    const heading=[...doc.querySelectorAll('[data-e2e="user-title"],[data-e2e="user-subtitle"]')].find(el=>visible(el)&&text(el).replace(/^@/,'').toLowerCase()===user);
    if(!heading)return null;
    const parent=heading.closest('[data-e2e="user-page"]')||doc;
    return readCount(text(field(parent,'[data-e2e="followers-count"]')));
  }
  function itemOwner(item) {
    const name=typeof item?.author==='string'?item.author:item?.author?.uniqueId;
    return typeof name==='string'?name.toLowerCase():null;
  }
  function itemData(item,p,user) {
    if(String(item?.id)!==p.id || itemOwner(item)!==user)return null;
    const row={id:p.id,url:p.url,reel:p.reel && !item.imagePost};
    if(typeof item.desc==='string' && item.desc.trim())row.caption=item.desc.trim().slice(0,2000);
    const stamp=Number(item.createTime);
    if(Number.isFinite(stamp)&&stamp>0&&stamp<2e10)row.date=stamp*1000;
    const map={views:'playCount',likes:'diggCount',comments:'commentCount',shares:'shareCount',saves:'collectCount'};
    for(const [key,property] of Object.entries(map)){
      const value=readCount(item.statsV2?.[property] ?? item.stats?.[property]);
      if(value!==null){
        row[key]=value;
        if(key==='shares'||key==='saves')row[key+'Source']='게시물 데이터 · '+property;
      }
    }
    if(Number.isFinite(row.views))row.viewsRaw=String(row.views);
    if(item.isPaidPartnership===true || CreatorReview.ad(row.caption))row.ad=true;
    return row;
  }
  const pageItems = new Map();
  function remember(items) {
    if(!Array.isArray(items))return;
    for(const item of items.slice(0,150)){
      if(typeof item?.id!=='string'||!/^\d{1,24}$/.test(item.id)||typeof item.author!=='string'||!/^[a-z0-9._]{1,30}$/i.test(item.author))continue;
      const key=item.author.toLowerCase()+'/'+item.id;
      const previous=pageItems.get(key);
      pageItems.delete(key);pageItems.set(key,{...previous,...item,stats:{...previous?.stats,...item.stats}});
      if(pageItems.size>150)pageItems.delete(pageItems.keys().next().value);
    }
  }
  function grid(doc,loc) {
    const rows=new Map();
    const byId=new Map();
    const site=scope(doc);
    const initial=site['webapp.user-post']?.itemList??site['webapp.user-detail']?.itemList??[];
    if(Array.isArray(initial))for(const item of initial){if(itemOwner(item)===loc.user)byId.set(String(item.id),item);}
    const payload=legacy(doc).ItemModule||{};
    const list=doc.querySelector('[data-e2e="user-post-item-list"]');
    const anchors=list?list.querySelectorAll('a[href]'):doc.querySelectorAll('[data-e2e="user-post-item"] a[href]');
    for(const anchor of anchors){
      if(!visible(anchor))continue;
      const p=link(anchor.href);
      if(!p||p.owner!==loc.user)continue;
      const card=anchor.closest('[data-e2e="user-post-item"]')||anchor;
      const row={id:p.id,url:p.url,reel:p.reel,...itemData(payload[p.id],p,loc.user),...itemData(byId.get(p.id),p,loc.user),...itemData(pageItems.get(p.owner+'/'+p.id),p,loc.user)};
      const caption=text(field(card,'[data-e2e="user-post-item-desc"]'));
      const image=card.querySelector('img[alt]');
      if(!row.caption && caption)row.caption=caption.slice(0,2000);
      if(image?.alt?.trim())row.alt=image.alt.trim().slice(0,1000);
      if(image?.currentSrc?.startsWith('https://'))row.thumb=image.currentSrc;
      if(!Number.isFinite(row.views)){
        const viewsRaw=text(field(card,'[data-e2e="video-views"]'));
        const count=readCount(viewsRaw);
        if(count!==null){row.views=count;row.viewsRaw=viewsRaw;}
      }
      const instant=Date.parse(card.querySelector('time[datetime]')?.getAttribute('datetime'));
      if(!Number.isFinite(row.date)&&Number.isFinite(instant))row.date=instant;
      rows.set(p.id,merge(rows.get(p.id),row));
      if(rows.size>=100)break;
    }
    return [...rows.values()];
  }
  const samePost=(a,b)=>a && a.id===b.id && a.owner===b.owner;
  function canonical(doc){
    const address=doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || doc.querySelector('meta[property="og:url"]')?.getAttribute('content');
    return link(address||'');
  }
  function schemaData(doc,p){
    if(!samePost(canonical(doc),p))return null;
    const videos=[];
    for(const script of doc.querySelectorAll('script[type="application/ld+json"]')){
      if(!script.textContent || script.textContent.length>2000000)continue;
      try{
        const parsed=JSON.parse(script.textContent);
        for(const obj of [parsed].flat()){
          for(const node of [obj,...(Array.isArray(obj?.['@graph'])?obj['@graph']:[])]){
            if([node?.['@type']].flat().includes('VideoObject'))videos.push(node);
          }
        }
      }catch{}
    }
    const belongs=node=>[node.url,node['@id'],node.mainEntityOfPage?.['@id']].map(x=>link(x||'')).find(Boolean);
    const match=videos.find(node=>samePost(belongs(node),p)) || (videos.length===1&&!belongs(videos[0])?videos[0]:null);
    if(!match)return null;
    if(match.author?.url){
      let handle;
      try{handle=route(new URL(match.author.url,origin).pathname)?.user;}catch{}
      if(handle && handle!==p.owner)return null;
    }
    const row={};
    const actions={LikeAction:'likes',CommentAction:'comments',ShareAction:'shares',BookmarkAction:'saves',WatchAction:'views'};
    for(const entry of [match.interactionStatistic||[]].flat()){
      const interaction=entry?.interactionType;
      const name=typeof interaction==='string'?interaction:interaction?.['@type'];
      const key=typeof name==='string'?actions[name.split('/').pop()]:null;
      const value=readCount(entry?.userInteractionCount);
      if(key && value!==null){
        row[key]=value;
        if(key==='shares'||key==='saves')row[key+'Source']='원문 구조화 데이터';
      }
    }
    const timestamp=typeof match.uploadDate==='string'?Date.parse(match.uploadDate):NaN;
    if(Number.isFinite(timestamp))row.date=timestamp;
    if(typeof match.description==='string'&&match.description.trim())row.caption=match.description.trim().slice(0,2000);
    if(row.views!==undefined)row.viewsRaw=String(row.views);
    return row;
  }
  const counterLabels={
    likes:['like-count','browse-like-count'],
    comments:['comment-count','browse-comment-count'],
    shares:['share-count','browse-share-count'],
    saves:['collect-count','favorite-count','bookmark-count','browse-collect-count','browse-favorite-count','browse-bookmark-count']
  };
  const authorSelector='[data-e2e="browse-username"],[data-e2e="video-author-uniqueid"]';
  const copySelector='[data-e2e="browse-video-link"],[data-e2e="video-copytext"]';
  const secondaryContent='[data-e2e="comment-list"],[data-e2e^="comment-level-"],[data-e2e="comment-item"],[data-e2e="user-post-item"],[data-e2e="recommend-list-item-container"]';
  function detailArea(doc,post,accept){
    const authors=[...doc.querySelectorAll(authorSelector)].filter(el=>accept(el)&&!el.closest(secondaryContent));
    const matches=authors.filter(author=>{
      const anchor=author.closest('a[href]')||author.querySelector('a[href]');
      try{return anchor && route(new URL(anchor.getAttribute('href'),origin).pathname)?.user===post.owner;}catch{return false;}
    });
    if(matches.length!==1)return null;
    const author=matches[0],boundary=author.closest('article,[role="dialog"]');
    let area=null,localIdentity=false;
    // A related post elsewhere on the page must not invalidate this post's action bar.
    for(let node=author.parentElement;node;node=node.parentElement){
      if(authors.some(other=>other!==author&&node.contains(other)))break;
      const refs=[...node.querySelectorAll('a[href],'+copySelector)].filter(accept)
        .map(el=>({post:link(el.getAttribute('href')||el.value||text(el)),copy:el.matches(copySelector)})).filter(ref=>ref.post);
      if(refs.some(ref=>!samePost(ref.post,post)))break;
      if(refs.some(ref=>ref.copy))localIdentity=true;
      area=node;
      if(node===boundary)break;
    }
    if(!localIdentity && !samePost(canonical(doc),post))return null;
    return area;
  }
  const actionNames={
    likes:/^(?:like(?: video)?|unlike(?: video)?|likes|좋아요(?: 취소)?)$/i,
    comments:/^(?:comments?|view comments|댓글(?: 보기)?)$/i,
    shares:/^(?:shares?|share video|공유(?:하기| 횟수)?)$/i,
    saves:/^(?:add to (?:my )?favou?rites|remove from (?:my )?favou?rites|favou?rites?|bookmarks?|saves|즐겨찾기(?:에 추가|에서 삭제)?|북마크|저장 수)$/i
  };
  function buttonCounter(button,accept){
    const label=(button.getAttribute('aria-label')||'').normalize('NFKC').trim();
    const numbers=label.match(/\d+(?:[.,]\d+)*(?:\s*[KMB천만억])?(?:\s*(?:회|개))?/gi)||[];
    if(numbers.length>1)return null;
    const words=(numbers.length?label.replace(numbers[0],''):label).split(/[.,:·]/).map(s=>s.trim()).filter(Boolean);
    const key=words.length && Object.keys(actionNames).find(k=>words.every(s=>actionNames[k].test(s)));
    if(!key)return null;
    let raw=readCount(text(button))!==null?text(button):numbers[0];
    // Some action bars put the count beside their single labelled button.
    const sibling=button.nextElementSibling;
    if(!raw && key==='saves' && sibling?.matches('strong:not([data-e2e]),[data-e2e="undefined-count"]')
        && button.parentElement.childElementCount===2 && accept(sibling)
        && button.parentElement.querySelectorAll('button,[role="button"],a[href]').length===1)raw=text(sibling);
    return readCount(raw)!==null?{key,raw}:null;
  }
  function readCounters(unit,accept,row,live){
    const isPostAction=el=>accept(el)&&!el.closest(secondaryContent)
      && (el.closest('article,[role="dialog"]')||null)===(unit.closest('article,[role="dialog"]')||null);
    const buttons=[...unit.querySelectorAll('button[aria-label],[role="button"][aria-label]')].filter(isPostAction)
      .map(button=>buttonCounter(button,isPostAction)).filter(Boolean);
    for(const [key,labels] of Object.entries(counterLabels)){
      const selector=labels.map(label=>'[data-e2e="'+label+'"]').join(',');
      const named=[...unit.querySelectorAll(selector)].filter(isPostAction).map(text).filter(raw=>readCount(raw)!==null);
      const readings=named.length?named:buttons.filter(b=>b.key===key).map(b=>b.raw);
      if(!readings.length||new Set(readings.map(readCount)).size!==1)continue;
      const exact=readings.some(raw=>!/[KMB천만억]/i.test(raw));
      if(!Number.isFinite(row[key])||live&&exact){
        row[key]=readCount(readings[0]);
        if(key==='shares'||key==='saves')row[key+'Source']='원문 화면';
      }
    }
  }
  function details(doc,p,user,manual=false,live=false){
    const site=scope(doc);
    const items=[site['webapp.video-detail']?.itemInfo?.itemStruct,site['webapp.photo-detail']?.itemInfo?.itemStruct,legacy(doc).ItemModule?.[p.id]];
    const main=items.find(item=>item && String(item.id)===p.id);
    if(main && itemOwner(main) && itemOwner(main)!==user)return manual?{wrongOwner:true}:null;
    const identity={...p,owner:user};
    const model=itemData(main,p,user);
    const row={id:p.id,url:p.url,reel:p.reel,...schemaData(doc,identity),...model};
    if(live)Object.assign(row,itemData(pageItems.get(user+'/'+p.id),p,user));
    // A fetched document has no layout boxes. Its counters still need an exact item identity.
    const accept=live?visible:el=>!el.closest('[hidden],[aria-hidden="true"]');
    const unit=detailArea(doc,identity,accept);
    if(unit){
      readCounters(unit,accept,row,live);
      const caption=[...unit.querySelectorAll('[data-e2e="browse-video-desc"],[data-e2e="video-desc"]')].filter(accept);
      if(!row.caption&&caption.length===1&&text(caption[0]))row.caption=text(caption[0]).slice(0,2000);
      const stamp=unit.querySelector('time[datetime]')?.getAttribute('datetime');
      if(!Number.isFinite(row.date)&&stamp&&unit.querySelectorAll('time[datetime]').length===1){
        const timestamp=Date.parse(stamp);
        if(Number.isFinite(timestamp))row.date=timestamp;
      }
    }
    return Object.keys(row).length>3?row:null;
  }
  function openPost(doc,p){return details(doc,p,p.owner,false,true);}
  function restricted(doc) {
    return !!doc.querySelector('#captcha-verify-container,#secsdk-captcha-drag-wrapper,input[type="password"]');
  }
  function merge(previous={},incoming){
    const row={...previous,...incoming};
    // Keep a full count already read from the original when the grid only shows a rounded number.
    if(previous.viewsRaw && /^\d+$/.test(previous.viewsRaw) && /[KMB천만억]/i.test(incoming.viewsRaw||'')){
      row.views=previous.views;row.viewsRaw=previous.viewsRaw;
    }
    row.ad=!!(previous.ad||incoming.ad||CreatorReview.ad(row.caption)||CreatorReview.ad(row.alt));
    return row;
  }
  return {route,link,followers,grid,details,openPost,restricted,merge,remember};
})();
