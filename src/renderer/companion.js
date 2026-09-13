'use strict';
const api=window.petApi, $=s=>document.querySelector(s);
let state={},currentSettings={},busy=false,attached=false,gameTimer=null,gameEnd=0,score=0;
function notice(text){$('#notice').textContent=text;$('#notice').hidden=!text;}
function tab(name){if(name!=='play'&&gameTimer)stopGame();document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id===name));document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('selected',e.dataset.tab===name));notice('');}
document.querySelectorAll('[data-tab]').forEach(e=>e.onclick=()=>tab(e.dataset.tab));
$('#start-chat').onclick=()=>{tab('chat');$('#prompt').focus();};
$('#feed').onclick=()=>api?.interact('feed');
document.querySelectorAll('[data-action]').forEach(e=>e.onclick=()=>api?.interact(e.dataset.action));
async function call(fn){try{const r=await fn();if(!r.ok)throw new Error(r.error);return r.value;}catch(e){notice(e.message||'暂时无法完成，请重试。');return undefined;}}
function updateState(value){state=value;$('#mode-label').textContent=({company:'自在陪伴',focus:'一起专注',quiet:'安静陪伴'})[state.mode]||'自在陪伴';$('#status').textContent=state.chatBusy?'大肥鱼正在想……':'我在这里';$('#fullness').textContent=state.fullness>85?'满足了，下一顿再叫我。':state.fullness<35?'有点馋，想补充脑力口粮。':'刚刚好，还能再吃一点。';$('#focus').textContent=state.mode==='focus'?'结束专注':'开始专注';updateClock();}
function updateClock(){const s=Math.max(0,Math.ceil(((state.focusUntil||0)-Date.now())/1000));$('#focus-clock').textContent=s?`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:'一起专注';}
setInterval(updateClock,1000);
$('#focus').onclick=()=>call(()=>api.mode(state.mode==='focus'?'company':'focus',Number($('#minutes').value))).then(v=>v&&updateState(v));
$('#quiet').onclick=()=>call(()=>api.mode(state.mode==='quiet'?'company':'quiet')).then(v=>v&&updateState(v));
function message(role,text,error=false){$('#messages .chat-empty')?.remove();const el=document.createElement('div');el.className=`message ${role}${error?' error':''}`;el.textContent=text;$('#messages').append(el);el.scrollIntoView({block:'end'});return el;}
function setBusy(value){busy=value;$('#send').disabled=value;$('#cancel').hidden=!value;$('#capture').disabled=value;$('#clear-chat').disabled=value;}
$('#chat-form').onsubmit=async e=>{e.preventDefault();if(busy||!api)return;const text=$('#prompt').value.trim();if(!text)return;
  message('user',text);const pending=message('assistant','让我想想……');setBusy(true);notice('');
  try{const result=await api.chat({text,attach:attached});if(!result.ok)throw new Error(result.error);pending.textContent=result.value;$('#prompt').value='';}
  catch(err){pending.textContent=err.message;pending.classList.add('error');}
  finally{setBusy(false);removeCapture();}
};
$('#prompt').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#chat-form').requestSubmit();}};
$('#cancel').onclick=()=>api?.cancel();
$('#clear-chat').onclick=async()=>{const v=await call(()=>api.clear());if(v){$('#messages').replaceChildren();removeCapture();notice('对话已清空。');}};
function removeCapture(){attached=false;$('#capture-preview').removeAttribute('src');$('#attachment').hidden=true;api?.discardCapture();}
$('#remove-capture').onclick=removeCapture;
$('#capture').onclick=async()=>{const image=await call(()=>api.capture());if(image){attached=true;$('#capture-preview').src=image;$('#attachment').hidden=false;}};
function fillSettings(s){currentSettings=s;const form=$('#settings-form');for(const [key,value] of Object.entries(s)){const field=form.elements.namedItem(key);if(!field)continue;if(field.type==='checkbox')field.checked=value===true;else field.value=value??'';}
  $('#size-slider').value=Math.round(s.scale*100);$('#size-output').textContent=`${Math.round(s.scale*100)}%`;
  form.elements.apiKey.value='';form.elements.removeKey.checked=false;$('#key-state').textContent=s.hasKey?'已安全保存访问密钥。':'尚未保存密钥；无认证的本机服务可留空。';$('#memory-summary').textContent=s.memory||'你可以在设置里告诉我，希望怎样陪你。';}
$('#settings-form').onsubmit=async e=>{e.preventDefault();$('#save-settings').disabled=true;const form=e.currentTarget;const values={};
  for(const field of form.elements){if(!field.name||['apiKey','removeKey'].includes(field.name))continue;values[field.name]=field.type==='checkbox'?field.checked:field.name==='scale'?Number(field.value):field.value;}
  values.scale=Number($('#size-slider').value)/100;delete values.scalePercent;
  if(form.elements.apiKey.value)values.apiKey=form.elements.apiKey.value;if(form.elements.removeKey.checked)values.apiKey='';
  const result=await call(()=>api.save(values));if(result){fillSettings(result);notice('设置已保存。');}$('#save-settings').disabled=false;
};
$('#export').onclick=async()=>{const dest=await call(()=>api.exportPet());if(dest)notice(`宠物包已导出到：${dest}`);};
let sizeTimer=null;
$('#size-slider').oninput=()=>{const percent=Number($('#size-slider').value);$('#size-output').textContent=`${percent}%`;clearTimeout(sizeTimer);sizeTimer=setTimeout(()=>call(()=>api.scale(percent/100)),60);};
const expressions=[['摸摸','pet'],['吃 token','feed'],['跳舞','dance'],['庆祝','celebrate'],['打招呼','wave'],['探头','peek'],['偷偷伸手','sneak'],['吃饱满足','satisfied'],['认真审阅','review'],['震惊','shock'],['鼓腮赌气','pout'],['认错','sorry'],['哼歌','hum'],['蜷起来','curl'],['伸懒腰','stretch']];
for(const [name,kind]of expressions){const button=document.createElement('button');button.textContent=name;button.onclick=()=>api?.interact(kind);$('#expression-gallery').append(button);}
function moveToken(){const board=$('#game-board');const token=$('#token');token.style.left=`${12+Math.random()*Math.max(1,board.clientWidth-72)}px`;token.style.top=`${12+Math.random()*Math.max(1,board.clientHeight-72)}px`;}
function stopGame(){clearInterval(gameTimer);gameTimer=null;$('#token').hidden=true;$('#game-start').disabled=false;$('#score').textContent=`接住 ${score} 口！大肥鱼收好了。`;api?.interact(score>5?'celebrate':'feed');}
$('#game-start').onclick=()=>{score=0;gameEnd=Date.now()+30000;$('#token').hidden=false;$('#game-start').disabled=true;moveToken();$('#token').focus();gameTimer=setInterval(()=>{const left=Math.max(0,Math.ceil((gameEnd-Date.now())/1000));$('#score').textContent=`${score} 口 · 剩余 ${left} 秒`;if(!left)stopGame();},200);};
$('#token').onclick=()=>{if(!gameTimer)return;score++;moveToken();};
window.addEventListener('beforeunload',()=>clearInterval(gameTimer));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&gameTimer)stopGame();});
api?.onState(updateState);api?.onNotice(notice);
api?.onSettings(s=>{currentSettings=s;if(!s.autoVision)$('#settings-form').elements.autoVision.checked=false;$('#memory-summary').textContent=s.memory||'你可以在设置里告诉我，希望怎样陪你。';});
if(api){call(()=>api.settings()).then(data=>{if(!data)return;fillSettings(data.settings);updateState(data.state);for(const m of data.history)message(m.role,m.content);});api.ready();}else notice('这是界面预览。桌面功能请通过应用启动。');
