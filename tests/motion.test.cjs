'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {sample,clips}=require('../src/renderer/motion.js');const sharp=require('sharp');
test('every sampled frame fits its actual atlas and finite actions recover',async()=>{
 const cache={};
 for(const [name,c]of Object.entries(clips)){
  const duration=c.times.reduce((a,b)=>a+b,0);
  for(let t=0;t<duration+650;t+=37){
   const p=sample(name,t);cache[p.atlas]??=await sharp(path.join(__dirname,'../assets/whale',p.atlas+'.png')).metadata();
   const m=cache[p.atlas],cell=m.width/p.columns;assert.ok((Math.floor(p.frame/p.columns)+1)*cell<=m.height,`${name} at ${t}: ${p.atlas}/${p.frame}`);
  }
 }
 for(const name of ['eat','wave','jump','dance','sneak','sleep'])assert.equal(clips[name].frames.length,16);
});
test('walk loops through all thirty-two drawn frames instead of holding final frame',()=>{
 const frames=Array.from({length:32},(_,i)=>sample('right',600+i*45).frame);assert.equal(new Set(frames).size,32);
 assert.equal(sample('right',2040).frame,0);assert.equal(sample('left',95).flip,true);
});

test('walking turns the whole body before stepping and stops toward the front',()=>{
 for(const action of ['left','right']){
  for(let frame=0;frame<8;frame++){const p=sample(action,frame*75);assert.equal(p.atlas,'motion-turn');assert.equal(p.walking,false);assert.equal(p.frame,frame);}
  assert.equal(sample(action,600).atlas,'motion-walk');
  assert.equal(sample('stop-'+action,0).frame,6);assert.equal(sample('stop-'+action,380).frame,0);
  assert.equal(sample('stop-'+action,450).atlas,'idle-front');
 }
});
test('one-shot has recovery to idle and sleeping has a held final pose',()=>{
 assert.equal(sample('eat',5000).atlas,'idle-front');assert.ok(sample('eat',5000).frame<16);
 assert.equal(sample('sleep',100000).frame,63);assert.equal(sample('jump',950).frame,15);
});
test('sampling is independent of rendering frequency and reduced motion is still',()=>{
 assert.deepEqual(sample('dance',613),sample('dance',613));
 for(const name of Object.keys(clips)){const a=sample(name,0,true),b=sample(name,50,true);assert.deepEqual(a,b);}
});
test('expanded motion atlases contain complete transparent cells with margins',async()=>{
 for(const name of ['motion-basic','motion-extra']){
 const {data,info}=await sharp(path.join(__dirname,'../assets/whale',name+'.png')).raw().toBuffer({resolveWithObject:true});
 const count=name==='motion-basic'?48:64;
 assert.equal(info.channels,4);assert.equal(info.width,4096);assert.equal(info.height,count/8*512);
 for(let i=0;i<count;i++){let visible=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){
 const a=data[((Math.floor(i/8)*512+y)*4096+(i%8)*512+x)*4+3];if(a>200)visible++;
 if(x<12||x>499||y<12||y>499)assert.equal(a,0);
 }assert.ok(visible>3000,`${name} ${i} visible`);}
 }
});
test('runtime has no gaze frame mapping or pointer direction subscription',()=>{
 for(const file of ['src/renderer/app.js','src/preload.cjs','src/main/main.cjs']){
 const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');assert.doesNotMatch(source,/lookIndex|pointerVector|onPointer|gaze\.png/);
 }
});
test('idle holds a stable body and blinks briefly at spaced intervals',()=>{
 let active=0;
 for(let t=0;t<30000;t+=10){const p=sample('idle',t);assert.equal(p.frame,0);if(p.blink>0)active++;}
 assert.ok(active>40&&active<110,'Blinks occupy only a small fraction of idle time');
 assert.equal(sample('idle',3000).blink,0);assert.ok(sample('idle',5100).blink>.9);
});
test('short gestures settle instead of looping and thinking holds its pose',()=>{
 assert.equal(sample('dance',4000).atlas,'idle-front');
 assert.equal(sample('think',1000).frame,sample('think',9000).frame);
});

test('transitions preserve the outgoing transform then settle on one incoming sprite',()=>{
 const {transition}=require('../src/renderer/motion.js'),from=sample('jump',480),to=sample('idle',0);
 const start=transition(from,to,0),mid=transition(from,to,90),end=transition(from,to,180);
 assert.equal(start.y,from.y);assert.equal(start.atlas,to.atlas);assert.equal(mid.y,(from.y+to.y)/2);assert.deepEqual(end,to);
 for(const action of Object.keys(clips))for(const t of [0,16,90,179,180]){
  const p=transition(from,sample(action,500),t);assert.ok(Number.isFinite(p.y)&&p.scaleX>0&&p.scaleY>0);
 }
});
