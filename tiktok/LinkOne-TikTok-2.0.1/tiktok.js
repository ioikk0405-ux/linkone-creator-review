'use strict';
(()=>{
  const A=CreatorReview,R=TikTokReader,send=m=>chrome.runtime.sendMessage(m);
  let current=null,timer,last='',campaign=chrome.storage.local.get('campaign').then(v=>A.campaign(v.campaign)).catch(()=>A.campaign());
  const valid=s=>s===current&&R.route(location.pathname)?.user===s.user;
  const raw=s=>({user:s.user,at:s.at,followers:s.followers??s.manual??null,followerSource:s.followers!=null?'profile':s.manual!=null?'manual':null,picks:s.picks,posts:[...s.map.values()]});
  function apply(s,patches,followers=null){
    if(!valid(s))return;let change=followers!==null&&followers!==s.followers;const delta=[];
    if(followers!==null){s.followers=followers;s.manual=null;}
    for(const p of patches){const old=s.map.get(p.id);if(!old&&s.map.size>=100)continue;const v=R.merge(old,p);if(JSON.stringify(v)===JSON.stringify(old))continue;s.map.set(p.id,v);delta.push(p);change=true;}
    if(change){s.at=Date.now();s.panel.setRaw(raw(s));send({type:'update',user:s.user,posts:delta,followers}).catch(()=>{});}
  }
  async function editPicks(s, mode, action){
    const res=await send({type:'picks',user:s.user,mode,action});
    if(!res?.ok)throw Error(res?.error||'직접 선정한 게시물을 저장하지 못했어요.');
    if(valid(s)){s.picks[mode]=res.picks;s.panel.setRaw(raw(s));}
    return res.picks;
  }
  async function scan(s,manual=true,mode='store'){
    if(!valid(s))return;if(s.run){if(manual){s.run.abort();s.panel.status('불러오기 중단 중…',true);}return;}
    const selected=manual?(s.picks[mode]||[]).filter(p=>!s.map.has(p.id)&&!p.detail?.wrongOwner&&(!p.detail?.caption||!Number.isFinite(p.detail?.date)||!Number.isFinite(p.detail?.shares)||!Number.isFinite(p.detail?.saves))).map(p=>({...p,fromPicks:true})):[];
    const needsInfo=p=>!p.caption||!Number.isFinite(p.date)||['likes','comments','shares','saves'].some(key=>!Number.isFinite(p[key]))||p.reel&&!Number.isFinite(p.views);
    const missing=[...s.map.values()].filter(p=>needsInfo(p)&&(manual||!p.checked)).sort((a,b)=>(a.checked||0)-(b.checked||0));
    const todo=selected.concat(missing).slice(0,manual?24:6);
    if(!todo.length){s.panel.status((s.map.size||s.picks[mode]?.length)?'확인한 게시물 정보를 모두 불러왔어요.':'틱톡 프로필에서 게시물 목록을 펼쳐주세요.',false);return;}
    const run=new AbortController();s.run=run;let done=0,ok=0,msg='';
    try{for(const p of todo){if(!valid(s)||run.signal.aborted)break;s.panel.status('게시물 정보 불러오는 중 '+(done+1)+' / '+todo.length+'건',true);const parsed=R.link(p.url);if(!parsed||parsed.id!==p.id)continue;
      const u=new URL(parsed.url);u.host=location.host;const one=new AbortController(),stop=()=>one.abort();run.signal.addEventListener('abort',stop,{once:true});const timeout=setTimeout(stop,7000);
      try{const res=await fetch(u.href,{credentials:'same-origin',signal:one.signal});if([401,403,429].includes(res.status)||/\/(?:challenge|login|captcha|verify)/.test(new URL(res.url).pathname)){msg='틱톡 접근 제한 · 불러오기 중단';break;}
        if(!res.ok){done++;continue;}if(R.link(res.url)?.id!==p.id){msg='원문 연결을 확인하지 못했어요.';break;}
        const doc=new DOMParser().parseFromString(await res.text(),'text/html');if(R.restricted(doc)){msg='틱톡에서 로그인이나 화면 확인을 요청해 불러오기를 중단했어요.';break;}
        const row=R.details(doc,{...p,owner:parsed.owner},s.user,!!p.fromPicks);if(!valid(s)||run.signal.aborted)break;if(p.fromPicks){
          if(row)await editPicks(s,mode,{type:'read',id:p.id,addedAt:p.addedAt,detail:row});
        }else{apply(s,[{...(row||{id:p.id,url:p.url}),checked:Date.now()}]);}
        done++;if(row&&!row.wrongOwner)ok++;
      }catch{if(!run.signal.aborted)msg='원문 응답을 받지 못했어요.';break;}finally{clearTimeout(timeout);run.signal.removeEventListener('abort',stop);}
      if(done<todo.length)await new Promise(r=>setTimeout(r,480));
    }}finally{if(valid(s)&&s.run===run){s.run=null;s.panel.status(msg||(run.signal.aborted?'불러오기를 중단했어요.':(done&&!ok?'원문 '+done+'건에서 추가 정보를 읽지 못했어요. 게시물별 원문을 열어 확인해주세요.':'원문 정보 '+ok+' / '+done+'건 확인')),false);}}
  }
  function collect(){timer=null;const s=current,loc=R.route(location.pathname);if(!s?.panel||!valid(s))return;apply(s,R.grid(document,loc),R.followers(document,s.user));if(!s.auto&&[...s.map.values()].some(p=>!p.checked)){s.auto=true;scan(s,false).catch(()=>{});}}
  let lastDetail='';
  function refresh(){
    timer=null;
    if(current?.panel){collect();return;}
    const post=R.link(location.href||'');
    if(!post||R.restricted(document))return;
    const full=R.openPost(document,post);
    if(!full)return;
    const signature=JSON.stringify(full);
    if(signature===lastDetail)return;
    lastDetail=signature;
    send({type:'update',user:post.owner,posts:[full],followers:null}).catch(()=>{if(lastDetail===signature)lastDetail='';});
  }
  const schedule=()=>{if(!timer&&(current?.panel||R.link(location.href||'')))timer=setTimeout(refresh,380);};
  window.addEventListener('linkone-tiktok-public-items',event=>{
    if(typeof event.detail!=='string'||event.detail.length>700000)return;
    try{R.remember(JSON.parse(event.detail));schedule();}catch{}
  });
  if(typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('linkone-tiktok-request-public-items'));
  async function enter(loc){if(current){current.run?.abort();current.panel?.destroy();}current=null;if(!loc)return;
    const s={user:loc.user,at:Date.now(),followers:null,manual:null,map:new Map(),picks:{store:[],product:[]},auto:false};current=s;
    const [c,cache,picks]=await Promise.all([campaign,send({type:'get',user:s.user}).catch(()=>null),send({type:'getPicks',user:s.user}).catch(()=>null)]);if(!valid(s))return;
    if(picks?.store&&picks?.product)s.picks=picks;
    if(cache?.posts){cache.posts.forEach(p=>s.map.set(p.id,p));s.at=cache.at;s.followers=cache.followers;s.manual=cache.manual??null;}
    const host=document.createElement('aside');host.id='linkone-tiktok-review';document.documentElement.append(host);s.host=host;
    s.panel=ReviewPanel.mount(host,{raw:raw(s),cfg:c,tab:'posts'},{brandMark:chrome.runtime.getURL('icon48.png'),followers:n=>{s.manual=n;s.panel.setRaw(raw(s));send({type:'update',user:s.user,manual:n,posts:[]}).catch(()=>s.panel.note('이 화면에 적용됐지만 입력값을 저장하지 못했어요.'));},save:cfg=>{campaign=Promise.resolve(cfg);chrome.storage.local.set({campaign:cfg}).catch(()=>s.panel.note('조건을 저장하지 못했어요.'));},picks:(mode,action)=>editPicks(s,mode,action),scan:mode=>scan(s,true,mode).catch(()=>s.panel.status('게시물 정보를 다시 불러와 주세요.',false)),settings:()=>send({type:'settings'}).catch(()=>s.panel.note('확장 관리에서 옵션을 열어주세요.')),
      ask:async payload=>{const res=await send({type:'ai',payload});if(!res?.ok)throw Error(res?.error||'도우미 연결을 확인해주세요.');return res.review;}});
    collect();
  }
  chrome.storage.onChanged?.addListener((changes,area)=>{
    const s=current;
    if(area!=='local'||!s?.panel||!valid(s))return;
    const updated=changes['profile.'+s.user]?.newValue;
    if(updated){
      for(const post of updated.posts){
        const old=s.map.get(post.id);
        if(!old && s.map.size>=100)continue;
        const {seenAt,...detail}=post;
        s.map.set(post.id,R.merge(old,detail));
      }
      if(updated.followers!=null){s.followers=updated.followers;s.manual=null;}
      else s.manual=updated.manual??null;
      s.panel.setRaw(raw(s));
    }
    for(const mode of ['store','product']){
      const change=changes['picks.'+s.user+':'+mode];
      if(change){s.picks[mode]=change.newValue||[];s.panel.setRaw(raw(s));}
    }
  });
  function sync(){const path=location.pathname,loc=R.route(path),removed=current?.host&&!current.host.isConnected;if(path!==last||removed){last=path;lastDetail='';if(removed||current?.user!==loc?.user)enter(loc).catch(()=>{});else schedule();if(!loc)schedule();}}
  new MutationObserver(()=>{sync();schedule()}).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-e2e','href','src','alt','aria-label','title','hidden','datetime']});window.addEventListener('pageshow',sync);window.addEventListener('popstate',sync);setInterval(sync,650);sync();
})();
