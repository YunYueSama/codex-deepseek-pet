/* 动画采样与渲染时间解耦：掉帧时按时间定位，不堆积定时器；同一函数用于预览与测试。 */
(function(root,factory){const value=factory();if(typeof module==='object')module.exports=value;else root.PetMotion=value;})(globalThis,function(){
 'use strict';
 const seq=(start,count=8)=>Array.from({length:count},(_,i)=>start+i);
 const clip=(atlas,frames,ms,loop=false,hold=false)=>({atlas,frames,times:Array.isArray(ms)?ms:frames.map(()=>ms),loop,hold});
 const flowAtlases=new Set(['inbetween-walk','dense-wave','dense-eat','story-hum','inbetween-jump','inbetween-sleep','dense-dance','dense-sneak','dense-idle','story-meal','story-token','story-tail','actions','expressions']);
 const clips={
  drag:clip('motion-extra',[8],100,false,true),fall:clip('motion-extra',[10],100,false,true),land:clip('motion-extra',[13,14,15],[100,180,720]),
  idle:clip('idle-front',[0],1000,true),
  shift:clip('motion-idle',[0,1,2,3,0],[200,300,400,300,200]),
  settle:clip('motion-idle',[4,5,6,7,0],[200,300,400,300,200]),
  breathe:clip('motion-idle',[8,9,14,15],[350,350,350,350]),
  right:clip('motion-walk',seq(0,32),45,true),left:clip('motion-walk',seq(0,32),45,true),
  'stop-right':clip('motion-turn',[6,5,4,3,2,1,0],60),'stop-left':clip('motion-turn',[6,5,4,3,2,1,0],60),
  wake:clip('motion-extra',seq(48,16).reverse(),100),
  eat:clip('motion-basic',seq(16,16),100),
  wave:clip('motion-basic',seq(32,16),80),
  jump:clip('motion-extra',seq(0,16),[60,60,70,70,40,40,55,55,75,75,45,45,65,65,110,110]),
  dance:clip('motion-extra',seq(16,16),90),
  sneak:clip('motion-extra',seq(32,16),110),
  sleep:clip('motion-extra',seq(48,16),150,false,true),
  curl:clip('motion-extra',seq(48,16),125,false,true),
  stretch:clip('motion-idle',[0,1,2,3,4,5,6,7,0],140),
  happy:clip('motion-basic',seq(32,16),80),
  satisfied:clip('motion-basic',seq(28,4),160),
  hungry:clip('actions',[0,6,6,0],240),
  // 剔除试绘中尾巴跨到另一侧的姿势；保持单尾在同侧连续摆动。
  hum:clip('story-hum',[...seq(0,11),12,15,...seq(16,16)],90),
  'meal-break':clip('story-meal',seq(0,32),110),
  'token-game':clip('story-token',[...seq(0,12),14,15,...seq(16,16)],120),
  'tail-sway':clip('story-tail',seq(0,16),100),
  'story-recover':clip('idle-front',[0],100),
  think:clip('story-token',[0,1,2,3],[120,150,180,350],false,true),
  review:clip('legacy',[24],1000,false,true),
  proud:clip('actions',[0,4,4,0],350),protest:clip('actions',[0,8,8,4,0],180),
  sad:clip('actions',[0,9,9,0],450),surprise:clip('actions',[0,14,14,0],180,false,true),
  peek:clip('legacy',[16,17,17,18,19,0],[180,220,350,180,220,180]),
  shock:clip('legacy',[0,25,25,14,0],190),pout:clip('legacy',[8,26,26,4,0],230),
  sorry:clip('legacy',[9,27,27,0],300),
 };
 // 每个阶段同时定义姿势与停留时间；不再把两个批次按奇偶机械交错。
 const odds=(start,count)=>seq(start,count).map(i=>i*2+1);
 function timeline(atlas,stages,hold=false){
  const c=clip(atlas,[],[],false,hold);c.stages=[];let at=0;
  for(const [name,frames,ms]of stages){const times=Array.isArray(ms)?ms:frames.map(()=>ms);if(times.length!==frames.length)throw Error('动作阶段时长不匹配');
   c.stages.push({name,start:at,end:at+times.reduce((a,b)=>a+b,0)});at=c.stages.at(-1).end;c.frames.push(...frames);c.times.push(...times);
  }return c;
 }
 clips.wave=timeline('dense-wave',[
  ['raise',[1,3,5,7],[80,70,65,65]],['greet',[9,11,13,15,17,19],[70,65,65,65,65,70]],['lower',[21,23,25,27,29,31],[65,65,70,75,80,100]]]);
 clips.happy=clips.wave;
 clips.eat=timeline('dense-eat',[
  ['reach',[1,3,5],[90,100,100]],['lift',[7,9,11,13,15],85],['taste',[17,19,21,23,25],[110,100,100,100,110]],['put-away',[27,29,31],[110,100,150]]]);
 clips.satisfied=clip('dense-eat',[25,27,29,31],[140,110,100,160]);
 clips.sneak=timeline('dense-sneak',[
  ['reach',[1,3,5,7,9],[100,100,90,100,100]],['eat',[11,15,17,19,21,23,25,27,29,13],[90,80,80,80,80,80,80,80,90,100]],['recover',[31],150]]);
 clips.dance=timeline('dense-dance',[
  ['prepare',[1,3,5],80],['sway',odds(3,10),85],['recover',[27,29,31],[90,100,140]]]);
 clips.sleep=timeline('dense-sleep',[
  ['yawn',[1,3,5,7],[130,170,170,130]],['sit',[9,11,13],[120,130,140]],['lie-down',[17,19],[150,180]],['close-eyes',[21,23],[150,180]],['settle',[25,27,29,31],[180,180,180,220]]],true);
 clips.curl=clips.sleep;
 // 起身使用明确方向，不倒放打哈欠，也不在已经闭眼后插回睁眼姿势。
 clips.wake=timeline('dense-sleep',[
  ['open-eyes',[31,29,27,25,23,21,19],[100,80,80,80,90,100,150]],['rise',[17,13,11,9,7,1],[130,130,100,100,110,150]]]);
 clips.jump=timeline('dense-jump',[
  ['prepare',[0,1,3],[65,85,90]],['airborne',[5,7,9,11,13,15,17,19],[45,45,50,65,65,50,45,45]],['land',[21,23],[65,70]],['recover',[25,27,29,31],[60,65,70,100]]]);
 clips.drag=clip('dense-jump',[13],100,false,true);clips.fall=clip('dense-jump',[19],100,false,true);
 clips.land=timeline('dense-jump',[['compress',[21,23],[75,85]],['recover',[25,27,29,31],[75,85,100,180]]]);
 // 微动作只在同批稳定姿势间往返，避免把站姿突然换成抱腹姿势。
 clips.shift=clip('dense-idle',[1,3,5,7,5,3,1],[75,80,90,100,90,80,100]);
 clips.settle=clip('dense-idle',[1,3,5,3,1],[100,110,130,110,130]);
 clips.breathe=clip('idle-front',[0],1100);
 clips.stretch=clip('dense-idle',[1,3,5,7,5,3,1],[90,100,120,160,120,100,120]);
 // 每半步为伸腿 -> 缩步 -> 经过 -> 下一次接触，删除成组近似画面造成的停顿。
 const gait=[0,16,5,6,22,10,26,13,14,30];
 clips.right=clip('dense-walk',gait,[110,90,90,90,100,110,90,90,90,100],true);clips.left=clips.right;
 // 小剧情只取同批补绘画面，并按道具/表情阶段重排，剔除跨侧尾巴姿势。
 clips.hum=timeline('story-hum',[
  ['prepare',seq(0,7),70],['hum',seq(7,13),85],
  ['notice',seq(20,4),75],['recover',seq(24,8),75]]);
 clips['meal-break']=timeline('story-meal',[
  ['prepare',seq(0,8),75],['meal',seq(8,16),90],['recover',seq(24,8),75]]);
 clips['token-game']=timeline('story-token',[
  ['prepare',seq(0,12),80],['puzzle',seq(12,12),85],['recover',seq(24,8),75]]);
 clips['tail-sway']=timeline('story-tail',[
  ['out',odds(0,8),70],['return',odds(8,8),80]]);
 clips.think=clip('story-token',[0,1,2],[110,130,180],false,true);
 // 按前后姿势补绘并筛选的中间帧；均分原停留时间，保留阶段与物理事件边界。
 const additions={walk:[[16,5,33],[30,0,41]],jump:[[3,5,34],[5,7,35],[7,9,36],[25,27,45],[27,29,46],[29,31,47]],sleep:[[7,9,35],[11,13,37],[13,17,38],[17,19,39]]};
 function addInbetweens(c,group){
  const frames=[],times=[];
  for(let i=0;i<c.frames.length;i++){
   const a=c.frames[i],b=c.frames[(i+1)%c.frames.length];
   const pair=additions[group].find(p=>p[0]===a&&p[1]===b);
   // 起身可反向使用相同的身体过渡，但不在片段最后强行接回首帧。
   const reverse=!pair&&additions[group].find(p=>p[1]===a&&p[0]===b);
   const middle=(i<c.frames.length-1||c.loop)&&(pair||reverse);
   frames.push(a);times.push(middle?c.times[i]/2:c.times[i]);
   if(middle){frames.push(middle[2]);times.push(c.times[i]/2);}
  }
  c.atlas='inbetween-'+group;c.frames=frames;c.times=times;
 }
 const expanded=new Set();
 for(const [group,names]of Object.entries({jump:['jump','land','drag','fall'],sleep:['sleep','curl','wake']}))for(const name of names){
  if(expanded.has(clips[name]))continue;expanded.add(clips[name]);addInbetweens(clips[name],group);
 }
 // 新整身步态保持单帧短停留；不混入旧批次的脸型和衣服。
 clips.right=clip('inbetween-walk',[0,1,3,2,4,5,6,7,8,9,11,10,12,13,14,15],60,true);clips.left=clips.right;
 // 过短的中间姿势会像闪帧。延长跳跃短帧，同时重算阶段边界，让腾空曲线与落地同步。
 for(const name of ['jump','land']){
  const c=clips[name],original=c.times.slice();let oldAt=0,newAt=0;
  const boundaries=new Map([[0,0]]);
  c.times=c.times.map(ms=>Math.max(40,ms));
  for(let i=0;i<original.length;i++){oldAt+=original[i];newAt+=c.times[i];boundaries.set(oldAt,newAt);}
  c.stages=c.stages.map(s=>({...s,start:boundaries.get(s.start),end:boundaries.get(s.end)}));
 }
 // 不等长的间隔避免像节拍器一样眨眼；一次闭合/张开约 200ms。
 function blinkAt(elapsed){
  const intervals=[5200,7100,4300,8600,6100],period=intervals.reduce((a,b)=>a+b,0);
  let t=Math.max(0,elapsed)%period;
  for(const span of intervals){if(t<span){const b=t-(span-200);return b<0?0:b<65?b/65:b<105?1:Math.max(0,1-(b-105)/95);}t-=span;}
  return 0;
 }
 function recoveryClip(action,elapsed){
  const c=clips[action];if(!c||!['hum','meal-break','token-game'].includes(action))return null;
  let index=0,t=Math.max(0,elapsed);while(index<c.times.length-1&&t>=c.times[index]){t-=c.times[index];index++;}
  // 前半段从当前姿势收回，后半段接着放下道具；第一张必须与被点击时相同。
  const frames=index<c.frames.length/2?c.frames.slice(0,index+1).reverse():c.frames.slice(index);
  return clip(c.atlas,frames,Math.min(85,1800/frames.length));
 }
 function sample(action,elapsed,reduced=false,recovery=null){
  // 起步先由正面完整转向，再进入步态；转向期间主进程保持位置不动。
  const walking=['left','right'].includes(action);
  if(walking&&!reduced&&elapsed<600){
   const frame=Math.min(7,Math.floor(Math.max(0,elapsed)/75));
   return {...sample('idle',0,true),atlas:'motion-turn',columns:4,frame,flip:action==='left'&&frame>0,walking:false,blink:0};
  }
  if(walking&&!reduced)elapsed=Math.max(0,elapsed-600);
  const c=(action==='story-recover'&&recovery)||clips[action]||clips.idle;const duration=c.times.reduce((a,b)=>a+b,0);
  let t=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  if(!c.loop&&!c.hold&&t>=duration)return sample('idle',t-duration,reduced);
  if(reduced)t=0;else if(c.loop)t%=duration;else t=Math.min(t,duration-1);
  let index=0;while(index<c.times.length-1&&t>=c.times[index]){t-=c.times[index];index++;}
  const rawAtlas=c.atlas,rawFrame=c.frames[index],rawNext=c.frames[index+1]??(c.loop?c.frames[0]:rawFrame);
  let atlas=rawAtlas,frame=rawFrame,nextAtlas=rawAtlas,nextFrame=rawNext;
  if(rawAtlas==='legacy'){
   atlas=rawFrame>=16?'expressions':'actions';frame=rawFrame%16;
   nextAtlas=rawNext>=16?'expressions':'actions';nextFrame=rawNext%16;
  }
  const flow=!reduced&&flowAtlases.has(atlas)&&nextAtlas===atlas&&nextFrame!==frame?{nextFrame,frameMix:t/c.times[index]}:{};
  const phase=elapsed/1000;
  // 逐帧肢体是主要运动；小幅呼吸和重心曲线提供帧间连续性，脚底保持锚定。
  // 静止待机保持原尺寸，避免每帧微缩放使细线在相邻像素间变软；呼吸仍有专用动作。
  const breathing=reduced||action==='idle'?0:Math.sin(phase*Math.PI*2/(action==='sleep'?3.4:2.8));
  const spring=reduced?0:Math.exp(-phase*5)*Math.cos(phase*22);
  const squash=action==='land'?.18*spring:0;
  const air=clips.jump.stages.find(s=>s.name==='airborne');
  const jumpPhase=Math.max(0,Math.min(1,(elapsed-air.start)/(air.end-air.start)));
  const microDuration=duration;
  const micro=!reduced&&['shift','settle','breathe'].includes(action)?Math.sin(Math.PI*Math.min(1,Math.max(0,elapsed/microDuration)))**2:0;
  return {atlas,frame,...flow,columns:atlas==='idle-front'?2:['motion-basic','motion-extra'].includes(atlas)?8:4,flip:action==='left'||(action==='stop-left'&&frame>0),walking,blink:!reduced&&atlas==='idle-front'?blinkAt(elapsed):0,
   x:0,y:reduced?0:action==='jump'?(jumpPhase>0&&jumpPhase<1?-Math.sin(jumpPhase*Math.PI)*42:0):walking?-Math.abs(Math.sin(elapsed/duration*Math.PI*2))*1.5:0,
   scaleX:1+squash+(action==='breathe'?-.008*micro:0),scaleY:1+breathing*.0025-squash+(action==='breathe'?.016:action==='settle'?-.014:0)*micro,
   rotation:action==='shift'?Math.sin(phase*Math.PI*2/3.2)*micro*.018:0,index,duration};
 }
 // 只衔接重心、倾角和形变；原画保持单层实像，避免交叉淡化造成双轮廓。
 function transition(from,to,elapsed,duration=180){
  if(!from||elapsed>=duration)return to;
  const t=Math.max(0,elapsed/duration),weight=t*t*(3-2*t),result={...to};
  for(const key of ['x','y','scaleX','scaleY','rotation'])result[key]=from[key]+(to[key]-from[key])*weight;
  return result;
 }
 return {clips,sample,blinkAt,transition,recoveryClip};
});
