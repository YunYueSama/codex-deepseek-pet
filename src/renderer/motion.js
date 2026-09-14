/* 动画采样与渲染时间解耦：掉帧时按时间定位，不堆积定时器；同一函数用于预览与测试。 */
(function(root,factory){const value=factory();if(typeof module==='object')module.exports=value;else root.PetMotion=value;})(globalThis,function(){
 'use strict';
 const seq=(start,count=8)=>Array.from({length:count},(_,i)=>start+i);
 const clip=(atlas,frames,ms,loop=false,hold=false)=>({atlas,frames,times:Array.isArray(ms)?ms:frames.map(()=>ms),loop,hold});
 const clips={
  drag:clip('motion-extra',[4],100,false,true),fall:clip('motion-extra',[5],100,false,true),land:clip('motion-extra',[6,7],[100,900]),
  idle:clip('idle-front',[0],1000,true),
  shift:clip('idle-front',[0],3200),settle:clip('idle-front',[0],3200),breathe:clip('idle-front',[0],3200),
  right:clip('motion-walk',seq(0,16),90,true),left:clip('motion-walk',seq(0,16),90,true),
  eat:clip('motion-basic',[16,17,18,19,18,19,20,21,20,21,22,23],[150,130,120,140,100,150,130,150,130,160,450,220]),
  wave:clip('motion-basic',[24,25,26,27,28,27,28,29,30,31],120),
  jump:clip('motion-extra',seq(0),[120,140,80,110,150,90,130,220]),
  dance:clip('motion-extra',seq(8),180),
  sneak:clip('motion-extra',seq(16),[180,150,130,200,160,200,350,300]),
  sleep:clip('motion-extra',seq(24),[300,200,400,220,200,200,180,800],false,true),
  curl:clip('motion-extra',seq(24),[180,160,250,180,180,180,180,800],false,true),
  stretch:clip('motion-extra',[31,30,29,28,27,26,25,24],160),
  happy:clip('motion-basic',[24,25,26,27,28,29,30,31],130),
  satisfied:clip('motion-basic',[20,21,22,22,23],180),
  hungry:clip('motion-basic',[0,16,17,16,0],240),
  hum:clip('motion-extra',seq(8),240),
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
  const c=clips[action]||clips.idle;const duration=c.times.reduce((a,b)=>a+b,0);
  let t=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  if(!c.loop&&!c.hold&&t>=duration)return sample('idle',t-duration,reduced);
  if(reduced)t=0;else if(c.loop)t%=duration;else t=Math.min(t,duration-1);
  let index=0;while(index<c.times.length-1&&t>=c.times[index]){t-=c.times[index];index++;}
  let atlas=c.atlas,frame=c.frames[index];if(atlas==='legacy'){atlas=frame>=16?'expressions':'actions';frame%=16;}
  const phase=elapsed/1000,walking=['left','right'].includes(action);
  // 逐帧肢体是主要运动；小幅呼吸和重心曲线提供帧间连续性，脚底保持锚定。
  const breathing=reduced?0:Math.sin(phase*Math.PI*2/(action==='sleep'?3.4:2.8));
  const spring=reduced?0:Math.exp(-phase*5)*Math.cos(phase*22);
  const squash=action==='land'?.18*spring:0;
  const jumpPhase=Math.max(0,Math.min(1,(elapsed-260)/480));
  const micro=!reduced&&['shift','settle','breathe'].includes(action)?Math.sin(Math.PI*Math.min(1,Math.max(0,elapsed/3200)))**2:0;
  return {atlas,frame,columns:atlas==='idle-front'?2:['motion-basic','motion-extra'].includes(atlas)?8:4,flip:action==='left',walking,blink:!reduced&&atlas==='idle-front'?blinkAt(elapsed):0,
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
