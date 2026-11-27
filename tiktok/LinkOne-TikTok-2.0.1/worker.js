'use strict';
importScripts('analysis.js','reader.js','picks.js');
const prefix='profile.',ttl=12*3600000;
let sequence=Promise.resolve();
async function read(user){const k=prefix+user,obj=(await chrome.storage.local.get(k))[k];if(!obj?.posts||obj.at<Date.now()-ttl)return null;return {...obj,posts:obj.posts.filter(p=>p.seenAt>=Date.now()-ttl)};}
async function update(m){const old=await read(m.user),now=Date.now(),map=new Map((old?.posts||[]).map(p=>[p.id,p]));
 for(const p of (m.posts||[]).slice(0,100)){const link=TikTokReader.link(p.url);if(!link||link.id!==p.id||link.owner&&link.owner!==m.user)continue;map.set(p.id,{...TikTokReader.merge(map.get(p.id),p),seenAt:now});}
 const me=prefix+m.user,all=await chrome.storage.local.get(null),keys=Object.keys(all).filter(k=>k.startsWith(prefix)&&k!==me).sort((a,b)=>all[b].at-all[a].at);
 const remove=keys.filter((k,i)=>i>=7||all[k].at<now-ttl);if(remove.length)await chrome.storage.local.remove(remove);
 await chrome.storage.local.set({[me]:{user:m.user,at:now,followers:CreatorReview.integer(m.followers)??old?.followers??null,manual:CreatorReview.integer(m.followers)!==null?null:Object.hasOwn(m,'manual')?CreatorReview.integer(m.manual):old?.manual??null,posts:[...map.values()].sort((a,b)=>b.seenAt-a.seenAt).slice(0,100)}});
}
const picksKey = (user,mode) => 'picks.' + user + ':' + mode;
async function savedPicks(user) {
  const keys = ['store','product'].map(mode => picksKey(user,mode));
  const values = await chrome.storage.local.get(keys);
  return {store:values[keys[0]] || [], product:values[keys[1]] || []};
}
async function changePicks(message) {
  if (!['store','product'].includes(message.mode)) throw Error('캠페인을 다시 선택해주세요.');
  const key = picksKey(message.user,message.mode);
  const current = (await chrome.storage.local.get(key))[key] || [];
  let action = message.action;
  if (action.type === 'add') {
    const links = ManualPicks.parse(action.input,message.user);
    const profile = await read(message.user);
    for (const link of links) {
      const post = profile?.posts.find(p=>p.id===link.id);
      if (post) link.detail={caption:post.caption,alt:post.alt,date:post.date,reel:post.reel,views:post.views,viewsRaw:post.viewsRaw,likes:post.likes,comments:post.comments,shares:post.shares,saves:post.saves,ad:post.ad};
    }
    action={type:'add',links};
  }
  const next = ManualPicks.change(current,action);
  await chrome.storage.local.set({[key]:next});
  return {ok:true,picks:next};
}
async function ask(payload){if(!await chrome.permissions.contains({origins:['http://127.0.0.1/*']}))throw Error('오른쪽 위 설정에서 PC 도우미를 연결해주세요.');const token=(await chrome.storage.session.get('pair')).pair;if(!token)throw Error('도우미 연결 코드를 설정에 입력해주세요.');let res;
 try{res=await fetch('http://127.0.0.1:41868/review-fit-v201',{method:'POST',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(payload),signal:AbortSignal.timeout(65000)});}catch{throw Error('이 PC에서 도우미가 실행 중인지 확인해주세요.');}
 if(res.status===404)throw Error('기존 PC 도우미를 종료하고 새 ZIP의 GPT 도우미를 실행한 뒤 새 연결 코드를 등록해 주세요.');
 if(res.status===401)throw Error('연결 코드가 만료됐어요. 설정에서 새 코드를 입력해주세요.');const data=await res.json();if(!res.ok)throw Error(data.error||'검토를 마치지 못했어요.');return data.review;}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{if(sender.id!==chrome.runtime.id||!sender.url||!['https://www.tiktok.com'].includes(new URL(sender.url).origin))return;
 const action=async()=>{if(m.type==='ai')return {ok:true,review:await ask(m.payload)};if(m.type==='settings'){await chrome.runtime.openOptionsPage();return true;}if(typeof m.user!=='string'||!/^[a-z0-9._]{1,30}$/.test(m.user))return null;
 if(m.type==='get'){await sequence;return read(m.user);}
 if(m.type==='getPicks'){await sequence;return savedPicks(m.user);}
 if(m.type==='picks'){const next=sequence.then(()=>changePicks(m));sequence=next.catch(()=>{});return next;}if(m.type==='update'){const next=sequence.then(()=>update(m));sequence=next.catch(()=>{});await next;return true;}return null;};action().then(reply).catch(e=>reply({ok:false,error:e.message}));return true;});
