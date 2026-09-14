/* 动画采样与渲染时间解耦：掉帧时按时间定位，不堆积定时器；同一函数用于预览与测试。 */
(function(root,factory){const value=factory();if(typeof module==='object')module.exports=value;else root.PetMotion=value;})(globalThis,function(){
 'use strict';
 const seq=(start,count=8)=>Array.from({length:count},(_,i)=>start+i);
 const clip=(atlas,frames,ms,loop=false,hold=false)=>({atlas,frames,times:Array.isArray(ms)?ms:frames.map(()=>ms),loop,hold});
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
  hum:clip('motion-extra',seq(16,16),120),
  think:clip('actions',[2],1000,false,true),
  review:clip('legacy',[24],1000,false,true),
  proud:clip('actions',[0,4,4,0],350),protest:clip('actions',[0,8,8,4,0],180),
  sad:clip('actions',[0,9,9,0],450),surprise:clip('actions',[0,14,14,0],180,false,true),
  peek:clip('legacy',[16,17,17,18,19,0],[180,220,350,180,220,180]),
  shock:clip('legacy',[0,25,25,14,0],190),pout:clip('legacy',[8,26,26,4,0],230),
  sorry:clip('legacy',[9,27,27,0],300),
 };
 // 不等长的间隔避免像节拍器一样眨眼；一次闭合/张开约 200ms。
 function blinkAt(elapsed){
  const intervals=[5200,7100,4300,8600,6100],period=intervals.reduce((a,b)=>a+b,0);
  let t=Math.max(0,elapsed)%period;
  for(const span of intervals){if(t<span){const b=t-(span-200);return b<0?0:b<65?b/65:b<105?1:Math.max(0,1-(b-105)/95);}t-=span;}
  return 0;
 }
 function sample(action,elapsed,reduced=false){
  // 起步先由正面完整转向，再进入步态；转向期间主进程保持位置不动。
  const walking=['left','right'].includes(action);
  if(walking&&!reduced&&elapsed<600){
   const frame=Math.min(7,Math.floor(Math.max(0,elapsed)/75));
   return {...sample('idle',0,true),atlas:'motion-turn',columns:4,frame,flip:action==='left'&&frame>0,walking:false,blink:0};
  }
  if(walking&&!reduced)elapsed=Math.max(0,elapsed-600);
  const c=clips[action]||clips.idle;const duration=c.times.reduce((a,b)=>a+b,0);
  let t=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  if(!c.loop&&!c.hold&&t>=duration)return sample('idle',t-duration,reduced);
  if(reduced)t=0;else if(c.loop)t%=duration;else t=Math.min(t,duration-1);
  let index=0;while(index<c.times.length-1&&t>=c.times[index]){t-=c.times[index];index++;}
  let atlas=c.atlas,frame=c.frames[index];if(atlas==='legacy'){atlas=frame>=16?'expressions':'actions';frame%=16;}
  const phase=elapsed/1000;
  // 逐帧肢体是主要运动；小幅呼吸和重心曲线提供帧间连续性，脚底保持锚定。
  const breathing=reduced?0:Math.sin(phase*Math.PI*2/(action==='sleep'?3.4:2.8));
  const spring=reduced?0:Math.exp(-phase*5)*Math.cos(phase*22);
  const squash=action==='land'?.18*spring:0;
  const jumpPhase=Math.max(0,Math.min(1,(elapsed-260)/480));
  const micro=!reduced&&['shift','settle','breathe'].includes(action)?Math.sin(Math.PI*Math.min(1,Math.max(0,elapsed/3200)))**2:0;
  return {atlas,frame,columns:atlas==='idle-front'?2:['motion-basic','motion-extra'].includes(atlas)?8:4,flip:action==='left'||(action==='stop-left'&&frame>0),walking,blink:!reduced&&atlas==='idle-front'?blinkAt(elapsed):0,
   x:0,y:reduced?0:action==='jump'?-Math.sin(jumpPhase*Math.PI)*42:walking?-Math.abs(Math.sin(elapsed/duration*Math.PI*2))*1.5:0,
   scaleX:1+squash+(action==='breathe'?-.008*micro:0),scaleY:1+breathing*.0025-squash+(action==='breathe'?.016:action==='settle'?-.014:0)*micro,
   rotation:action==='shift'?Math.sin(phase*Math.PI*2/3.2)*micro*.018:!reduced&&['dance','hum'].includes(action)?Math.sin(phase*Math.PI*2)*.022:0,index,duration};
 }
 // 只衔接重心、倾角和形变；原画保持单层实像，避免交叉淡化造成双轮廓。
 function transition(from,to,elapsed,duration=180){
  if(!from||elapsed>=duration)return to;
  const t=Math.max(0,elapsed/duration),weight=t*t*(3-2*t),result={...to};
  for(const key of ['x','y','scaleX','scaleY','rotation'])result[key]=from[key]+(to[key]-from[key])*weight;
  return result;
 }
 return {clips,sample,blinkAt,transition};
});
