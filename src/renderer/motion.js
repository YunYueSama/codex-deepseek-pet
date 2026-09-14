/* 所有动作共享一套骨架，按时间连续采样；不再切换整个人物原画。 */
(function(root,factory){const value=factory();if(typeof module==='object')module.exports=value;else root.PetMotion=value;})(globalThis,function(){
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t);return t*t*(3-2*t);};
 const clips={idle:{loop:true,duration:3000},left:{loop:true,duration:1200},right:{loop:true,duration:1200},
  drag:{hold:true,duration:1500},fall:{hold:true,duration:1000},land:{duration:1000},
  shift:{duration:3200},settle:{duration:3200},breathe:{duration:3200},
  eat:{duration:4600},wave:{duration:3000},jump:{duration:2100},dance:{duration:5800},sneak:{duration:3600},
  sleep:{hold:true,duration:2600},curl:{hold:true,duration:2600},stretch:{duration:4000},
  happy:{duration:3000},satisfied:{duration:2800},hungry:{duration:3200},hum:{duration:3600},
  think:{loop:true,duration:6000},review:{loop:true,duration:6000},proud:{duration:3000},protest:{duration:2800},
  sad:{duration:3500},surprise:{duration:2200},peek:{duration:3000},shock:{duration:2500},pout:{duration:3200},sorry:{duration:3200}};
 function blinkAt(elapsed){let t=Math.max(0,elapsed)%31300;for(const n of [5200,7100,4300,8600,6100]){if(t<n){const b=t-n+180;return b<0?0:b<60?b/60:b<110?1:(180-b)/70;}t-=n;}return 0;}
 // 二段逆运动学：手可追踪嘴边，脚可在支撑阶段固定落点；限制不可达目标。
 function ik(x,y,a,b,side=1){
  const d=clamp(Math.hypot(x,y),Math.abs(a-b)+.001,a+b-.001),direction=Math.atan2(-x,y);
  const shoulder=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));
  const elbow=Math.PI-Math.acos(clamp((a*a+b*b-d*d)/(2*a*b),-1,1));
  return [direction-side*shoulder,side*elbow];
 }
 function track(t,keys){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,av]=keys[i-1],[b,bv]=keys[i];return av+(bv-av)*ease((t-a)/(b-a));}return keys.at(-1)[1];}
 function sample(action,elapsed,reduced=false){
  if(!clips[action])action='idle';const c=clips[action];let time=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  if(!c.loop&&!c.hold&&time>=c.duration)return sample('idle',time-c.duration,reduced);
  if(reduced)time=0;const t=time/1000,u=clamp(time/c.duration),envelope=Math.sin(Math.PI*u)**2;
  const p={action,atlas:'rig',frame:0,columns:1,duration:c.duration,flip:action==='left',walking:['left','right'].includes(action),
   x:0,y:0,rotation:0,scaleX:1,scaleY:1,torso:0,head:0,headY:0,turn:0,headTurn:0,hips:0,hair:0,tail:0,skirt:0,
   armL:-.14,elbowL:.08,armR:.14,elbowR:-.08,legL:0,kneeL:0,legR:0,kneeR:0,
   expression:0,blink:reduced?0:blinkAt(time),snack:0,snackX:0,snackY:0,snackScale:1};
  const arm=(which,x,y)=>{const a=ik(x,y,60,55,which==='L'?1:-1);p['arm'+which]=a[0];p['elbow'+which]=a[1];};
  if(!reduced){p.scaleY=1+Math.sin(t*2*Math.PI/3.4)*.003;p.head=Math.sin(t*1.4)*.006;p.hair=Math.sin(t*1.3-.6)*3;p.tail=Math.sin(t*1.5-.9)*.045;p.skirt=Math.sin(t*1.5)*1.3;}
  if(p.walking){
   const cycle=(time%1200)/1200;
   for(const [which,offset]of [['L',0],['R',.5]]){const q=(cycle+offset)%1;const planted=q<.6;
    const x=planted?33-66*q/.6:-33+66*ease((q-.6)/.4),lift=planted?0:22*Math.sin((q-.6)/.4*Math.PI);
    const angles=ik(x,100-lift,52,52,1);p['leg'+which]=angles[0];p['knee'+which]=angles[1];}
   p.armL=.20*Math.sin(cycle*Math.PI*2);p.armR=-p.armL;p.torso=.022*Math.sin(cycle*Math.PI*2);p.head=-p.torso*.5;p.hair+=Math.sin(cycle*Math.PI*2-.8)*4;
  }
  if(['shift','settle','breathe'].includes(action)){p.torso=action==='shift'?Math.sin(u*Math.PI*2)*envelope*.04:0;p.head=-p.torso*.6;p.scaleY+=(action==='breathe'?.015:action==='settle'?-.012:0)*envelope;p.tail+=envelope*.07;}
  if(['wave','happy'].includes(action)){const e=track(u,[[0,0],[.18,1],[.78,1],[1,0]]);arm('R',e*90,110-e*180);p.elbowR+=Math.sin(t*12)*.23*e;p.head=-.045*e;p.expression=action==='happy'?2:0;}
  if(action==='eat'){
   const reach=track(u,[[0,0],[.17,.5],[.33,1],[.72,1],[.88,.3],[1,0]]);
   arm('R',-52*reach,110-162*reach);p.head=.04*reach;p.expression=u>.72?2:0;
   p.snack=u>.12&&u<.78?1:0;p.snackX=70-52*reach;p.snackY=-232+110-162*reach;p.snackScale=1-clamp((u-.5)/.27)*.7;
   if(u>.35&&u<.72)p.headY=Math.sin(t*15)*1.8;
  }
  if(action==='jump'){const lift=track(u,[[0,0],[.18,-7],[.4,50],[.57,50],[.75,0],[.84,-6],[1,0]]);p.y=-lift;p.scaleY=1+(u<.22?-envelope*.12:0);p.armL=.6*envelope;p.armR=-.6*envelope;p.expression=5;p.kneeL=.4*envelope;p.kneeR=.4*envelope;}
  if(action==='land'){const spring=Math.exp(-t*5)*Math.cos(t*18);p.scaleX=1+.14*spring;p.scaleY=1-.14*spring;p.headY=5*spring;p.hair+=8*Math.exp(-t*4)*Math.sin(t*15);p.tail+=.18*Math.exp(-t*4)*Math.sin(t*14);}
  if(['dance','hum'].includes(action)){const e=Math.min(1,u*6,(1-u)*6),s=Math.sin(t*5)*e;p.torso=s*.065;p.head=-s*.05;p.armL=.6+s*.4;p.armR=-.6+s*.4;p.elbowL=.45;p.elbowR=-.45;p.hair+=s*8;p.tail+=s*.14;p.expression=2;if(action==='dance')p.y=-Math.abs(s)*5;}
  if(['sleep','curl'].includes(action)){const e=ease(time/1800);p.legL=-.8*e;p.kneeL=1.6*e;p.legR=.8*e;p.kneeR=-1.6*e;p.y=104*(1-Math.cos(.8*e));p.torso=e*.08;p.head=e*.24;p.expression=1;p.blink=0;arm('L',35*e,110-50*e);arm('R',-35*e,110-50*e);p.hair+=e*8;}
  if(action==='stretch'){const e=Math.sin(u*Math.PI)**2;arm('L',-85*e,110-185*e);arm('R',85*e,110-185*e);p.scaleY+=e*.025;p.head=-e*.06;p.expression=e>.4?1:0;}
  if(['think','review'].includes(action)){arm('L',55,-38);p.head=.075+Math.sin(t*.8)*.01;p.expression=0;}
  if(['sneak','peek'].includes(action)){p.torso=envelope*.12;p.head=-envelope*.08;arm('R',75*envelope,110-85*envelope);p.expression=3;}
  if(['proud','satisfied'].includes(action)){p.expression=3;p.head=-envelope*.055;arm('L',45*envelope,110-120*envelope);p.tail+=envelope*.10;}
  if(['pout','protest'].includes(action)){p.expression=4;p.head=Math.sin(t*9)*envelope*.075;p.elbowL=.5*envelope;p.elbowR=-.5*envelope;}
  if(['surprise','shock'].includes(action)){p.expression=5;arm('L',40*envelope,110-160*envelope);arm('R',-40*envelope,110-160*envelope);p.headY=-4*envelope;p.tail-=envelope*.2;}
  if(['sad','sorry'].includes(action)){p.head=envelope*.13;p.torso=envelope*.045;p.expression=1;arm('L',30*envelope,110-40*envelope);arm('R',-30*envelope,110-40*envelope);}
  if(action==='hungry'){arm('L',45*envelope,110-60*envelope);p.head=.06*envelope;p.expression=4;}
  if(action==='drag'){p.armL=.5;p.armR=-.5;p.elbowL=.3;p.elbowR=-.3;p.legL=.1;p.legR=-.1;p.kneeL=.15;p.kneeR=.15;p.expression=4;}
  if(action==='fall'){p.armL=1.1;p.armR=-1.1;p.head=-.04;p.expression=5;p.hair-=12;p.tail-=.2;}
  // 转向由身体先发力，头部稍后跟随；肩胯反向扭动，避免整张立绘僵硬摇摆。
  if(p.walking){p.turn=1;p.headTurn=.88;p.hips=-p.torso*.7;p.torso+=.035;}
  if(action==='eat'){p.turn=track(u,[[0,0],[.15,.9],[.36,.75],[.74,.75],[1,0]]);p.headTurn=track(u,[[0,0],[.08,0],[.25,.9],[.76,.8],[1,0]]);p.torso+=.08*p.turn;p.hips=-.035*p.turn;p.head-=.05*p.turn;}
  if(['peek','sneak'].includes(action)){p.turn=envelope;p.headTurn=Math.sin(Math.PI*clamp((u-.06)/.94))**2;p.x+=18*envelope;p.hips=-.05*envelope;}
  if(['dance','hum'].includes(action)){p.turn=(.5+.5*Math.sin(t*2.5))*envelope;p.headTurn=(.5+.5*Math.sin(t*2.5-.3))*envelope;p.hips=-Math.sin(t*5)*.045*envelope;p.legL+=p.hips;p.legR+=p.hips;}
  if(action==='stretch'){p.turn=.85*envelope;p.headTurn=.75*Math.sin(Math.PI*clamp((u-.05)/.95))**2;p.torso-=.08*envelope;p.hips=.04*envelope;}
  if(['wave','happy','proud','satisfied','protest','pout','hungry'].includes(action)){p.torso+=.035*envelope;p.hips-=.022*envelope;}
  if(['sleep','curl'].includes(action)){p.turn=.85*ease(time/1600);p.headTurn=.9*ease((time-150)/1600);}
  if(reduced){p.y=0;p.rotation=0;p.scaleX=p.scaleY=1;p.headY=0;p.hair=p.tail=p.skirt=0;p.blink=0;}
  return p;
 }
 function transition(from,to,elapsed,duration=220){
  if(!from||elapsed>=duration)return to;const w=ease(elapsed/duration),p={...to};
  for(const key of ['x','y','rotation','scaleX','scaleY','torso','head','headY','turn','headTurn','hips','hair','tail','skirt','armL','elbowL','armR','elbowR','legL','kneeL','legR','kneeR'])if(Number.isFinite(from[key]))p[key]=from[key]+(to[key]-from[key])*w;
  return p;
 }
 return {clips,sample,blinkAt,transition,ik,track};
});
