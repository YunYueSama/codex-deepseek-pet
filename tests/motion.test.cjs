'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {sample,clips,transition,ik}=require('../src/renderer/motion.js');
test('actions turn the torso and coordinate hips and delayed head follow',()=>{
 assert.equal(sample('idle',1200).turn,0);
 for(const action of ['left','right']){const p=sample(action,300);assert.equal(p.turn,1);assert.ok(p.headTurn>.5);assert.notEqual(p.hips,0);}
 for(const action of ['eat','peek','stretch','sleep']){const p=sample(action,1500);assert.ok(p.turn>.48,action);assert.notEqual(p.torso,0,action);}
 const reach=sample('eat',460);assert.ok(reach.turn>reach.headTurn);
 const dance=sample('dance',2200);assert.notEqual(dance.hips,0);assert.notEqual(dance.legL,0);
 const from=sample('idle',0),to=sample('right',300),mid=transition(from,to,110);assert.ok(mid.turn>0&&mid.turn<to.turn);assert.ok(mid.headTurn>0&&mid.headTurn<to.headTurn);
});
test('walking has continuous joints and repeats exactly after a full stride',()=>{
 const poses=Array.from({length:72},(_,i)=>sample('right',i*1000/60));assert.ok(new Set(poses.map(p=>p.legL)).size>60);
 assert.equal(sample('right',1200).legL,sample('right',0).legL);assert.equal(sample('left',120).flip,true);
 for(let i=1;i<poses.length;i++)assert.ok(Math.abs(poses[i].legL-poses[i-1].legL)<.3);
});
test('all actions use new rig and finite positive transforms at 60Hz',()=>{
 for(const [action,clip]of Object.entries(clips))for(let t=0;t<clip.duration+500;t+=1000/60){const p=sample(action,t);assert.equal(p.atlas,'rig');for(const value of Object.values(p))if(typeof value==='number')assert.ok(Number.isFinite(value),`${action} ${t}`);assert.ok(p.scaleX>0&&p.scaleY>0);}
});
test('one shot settles, sleep holds and reduced motion is stable',()=>{
 assert.equal(sample('eat',5000).action,'idle');assert.equal(sample('sleep',100000).expression,1);
 for(const action of Object.keys(clips))assert.deepEqual(sample(action,0,true),sample(action,50,true));
});
test('IK reaches feasible hand and foot targets without invalid angles',()=>{
 for(const [x,y]of [[0,90],[40,75],[-45,-50],[15,-95]]){const [a,b]=ik(x,y,60,55);const dx=-Math.sin(a)*60-Math.sin(a+b)*55,dy=Math.cos(a)*60+Math.cos(a+b)*55;assert.ok(Math.hypot(dx-x,dy-y)<.01);}
 for(const [x,y]of [[0,0],[900,900]])assert.ok(ik(x,y,60,55).every(Number.isFinite));
});
test('transitions blend every joint without crossfading character images',()=>{
 const a=sample('wave',900),b=sample('sleep',2300),start=transition(a,b,0),end=transition(a,b,220),mid=transition(a,b,110);
 assert.equal(start.armR,a.armR);assert.ok(Math.abs(mid.head-(a.head+b.head)/2)<1e-12);assert.deepEqual(end,b);
});
test('eating has reach, snack, chewing and recovery phases',()=>{
 assert.equal(sample('eat',0).snack,0);assert.equal(sample('eat',1600).snack,1);assert.ok(sample('eat',3300).snackScale<sample('eat',1600).snackScale);assert.equal(sample('eat',4500).snack,0);
});
test('runtime has no gaze mapping or old sprite atlas fallback',()=>{
 for(const f of ['src/renderer/app.js','src/renderer/motion.js','src/preload.cjs'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),/lookIndex|pointerVector|onPointer|gaze\.png|motion-basic|motion-extra|motion-walk/);
});
