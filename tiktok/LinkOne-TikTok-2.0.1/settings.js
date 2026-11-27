'use strict';
const el=s=>document.querySelector(s),msg=s=>el('#status').textContent=s;
chrome.storage.session.get('pair').then(v=>{if(v.pair)msg('이번 브라우저 세션에 연결 코드가 저장되어 있습니다.');});
el('#connect').onclick=async()=>{const token=el('#pair').value.trim();if(!/^[A-Za-z0-9_-]{22,86}$/.test(token)){msg('도우미 창에 표시된 연결 코드를 확인해주세요.');return;}
try{if(!await chrome.permissions.request({origins:['http://127.0.0.1/*']})){msg('PC 도우미 연결 권한이 필요합니다.');return;}
const r=await fetch('http://127.0.0.1:41868/check',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(4000)});if(!r.ok){msg('도우미의 연결 코드를 확인해주세요.');return;}const info=await r.json();if(info.protocol!==3){msg('새 ZIP의 GPT 도우미 2.0.1을 실행한 뒤 새 연결 코드를 입력해주세요.');return;}await chrome.storage.session.set({pair:token});el('#pair').value='';msg('연결됐습니다. 틱톡 패널에서 적합도를 열어주세요.');}catch{msg('이 PC에서 도우미를 실행한 뒤 다시 시도해주세요.');}};
el('#disconnect').onclick=async()=>{await chrome.storage.session.remove('pair');await chrome.permissions.remove({origins:['http://127.0.0.1/*']});el('#pair').value='';msg('연결을 해제했습니다.');};
