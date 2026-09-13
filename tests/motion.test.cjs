'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {sample,clips}=require('../src/renderer/motion.js');const sharp=require('sharp');
test('walk loops through all sixteen actual frames instead of holding final frame',()=>{
 const frames=Array.from({length:16},(_,i)=>sample('right',i*90).frame);assert.equal(new Set(frames).size,16);
 assert.equal(sample('right',1440).frame,0);assert.equal(sample('left',95).flip,true);
});
test('one-shot has recovery to idle and sleeping has a held final pose',()=>{
 assert.equal(sample('eat',5000).atlas,'motion-idle');assert.ok(sample('eat',5000).frame<16);
 assert.equal(sample('sleep',100000).frame,31);assert.equal(sample('jump',950).frame,7);
});
test('sampling is independent of rendering frequency and reduced motion is still',()=>{
 assert.deepEqual(sample('dance',613),sample('dance',613));
 for(const name of Object.keys(clips)){const a=sample(name,0,true),b=sample(name,50,true);assert.deepEqual(a,b);}
});
test('motion atlases contain 64 transparent cells with margins',async()=>{
 for(const name of ['motion-basic','motion-extra']){
 const {data,info}=await sharp(path.join(__dirname,'../assets/whale',name+'.png')).raw().toBuffer({resolveWithObject:true});
 assert.equal(info.channels,4);assert.equal(info.width,4096);assert.equal(info.height,2048);
 for(let i=0;i<32;i++){let visible=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){
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
 assert.equal(sample('dance',4000).atlas,'motion-idle');
 assert.equal(sample('think',1000).frame,sample('think',9000).frame);
});
