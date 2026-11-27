// Runs before TikTok renders the page. Read only the public item responses the page itself requests.
(() => {
  'use strict';
  const origin = location.origin;
  const eventName = 'linkone-tiktok-public-items';
  const buffer = new Map();
  const allowed = new Set(['/api/post/item_list','/api/item/detail']);
  const properties = ['playCount','diggCount','commentCount','shareCount','collectCount'];
  function relevant(input) {
    try {
      const url = new URL(input, origin);
      return url.origin === origin && allowed.has(url.pathname.replace(/\/$/,''));
    } catch { return false; }
  }
  function publish(items) {
    if(items.length)window.dispatchEvent(new CustomEvent(eventName,{detail:JSON.stringify(items)}));
  }
  function capture(payload) {
    if(!payload || payload.statusCode && Number(payload.statusCode)!==0)return;
    const items = payload.itemList ?? [payload.itemInfo?.itemStruct];
    if(!Array.isArray(items))return;
    const rows = [];
    for(const item of items.slice(0,150)){
      if(!item || !/^\d{1,24}$/.test(item.id) || typeof item.id==='number'&&!Number.isSafeInteger(item.id))continue;
      const author=typeof item.author==='string'?item.author:item.author?.uniqueId;
      if(typeof author!=='string'||!/^[a-z0-9._]{1,30}$/i.test(author))continue;
      const row={id:String(item.id),author:author.toLowerCase(),stats:{}};
      for(const name of properties){
        const raw=item.statsV2?.[name]??item.stats?.[name];
        if((typeof raw==='number'||typeof raw==='string')&&/^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw)))row.stats[name]=Number(raw);
      }
      if(/^\d{1,10}$/.test(item.createTime))row.createTime=Number(item.createTime);
      if(typeof item.desc==='string'&&item.desc.trim())row.desc=item.desc.slice(0,2000);
      if(!Object.keys(row.stats).length&&!row.desc)continue;
      if(item.imagePost)row.imagePost=true;
      if(item.isPaidPartnership===true)row.isPaidPartnership=true;
      const key=row.author+'/'+row.id;
      const previous=buffer.get(key);
      const current={...previous,...row,stats:{...previous?.stats,...row.stats}};
      buffer.delete(key);buffer.set(key,current);
      if(buffer.size>150)buffer.delete(buffer.keys().next().value);
      rows.push(current);
    }
    publish(rows);
  }
  window.addEventListener('linkone-tiktok-request-public-items',()=>publish([...buffer.values()]));
  const originalFetch=window.fetch;
  if(typeof originalFetch==='function'){
    window.fetch=function(input,...options){
      const result=Reflect.apply(originalFetch,this,[input,...options]);
      if(relevant(input?.url??input)){
        result.then(response=>{
          if(response.ok&&relevant(response.url)&&Number(response.headers.get('content-length')||0)<12000000)
            return response.clone().json().then(capture);
        }).catch(()=>{});
      }
      return result;
    };
  }
  // Use the completed response URL; TikTok may reuse an XHR instance.
  const proto=window.XMLHttpRequest?.prototype;
  if(proto){
    const originalOpen=proto.open, listeners=new WeakMap();
    proto.open=function(...args){
      const result=Reflect.apply(originalOpen,this,args);
      const previous=listeners.get(this);
      if(previous){this.removeEventListener('load',previous);listeners.delete(this);}
      if(relevant(args[1])){
        const onLoad=()=>{
          try{
            if(this.status!==200||!relevant(this.responseURL))return;
            if(this.responseType==='json')capture(this.response);
            else if((!this.responseType||this.responseType==='text')&&this.responseText.length<12000000)capture(JSON.parse(this.responseText));
          }catch{}
        };
        listeners.set(this,onLoad);this.addEventListener('load',onLoad,{once:true});
      }
      return result;
    };
  }
})();
