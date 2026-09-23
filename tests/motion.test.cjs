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
 for(const c of Object.values(clips)){assert.equal(c.frames.length,c.times.length);assert.ok(c.times.every(t=>t>0));}
});
test('walk completes one continuous cycle without grouped pose holds',()=>{
 const c=clips.right;let elapsed=600;const frames=[];
 for(const time of c.times){frames.push(sample('right',elapsed+1).frame);elapsed+=time;}
 assert.equal(new Set(frames).size,c.frames.length);assert.equal(sample('right',elapsed).frame,c.frames[0]);
 assert.ok(Math.max(...c.times)<=110);assert.equal(sample('left',95).flip,true);
});

test('walking turns the whole body before stepping and stops toward the front',()=>{
 for(const action of ['left','right']){
  for(let frame=0;frame<8;frame++){const p=sample(action,frame*75);assert.equal(p.atlas,'motion-turn');assert.equal(p.walking,false);assert.equal(p.frame,frame);}
  assert.equal(sample(action,600).atlas,'inbetween-walk');
  assert.equal(sample('stop-'+action,0).frame,6);assert.equal(sample('stop-'+action,380).frame,0);
  assert.equal(sample('stop-'+action,450).atlas,'idle-front');
 }
});
test('one-shot has recovery to idle and sleeping has a held final pose',()=>{
 assert.equal(sample('eat',5000).atlas,'idle-front');assert.ok(sample('eat',5000).frame<16);
 assert.equal(sample('sleep',100000).frame,31);assert.equal(sample('jump',2000).atlas,'idle-front');
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

test('dense full-body frames preserve transparent safe margins and distinct drawings',async()=>{
 for(const name of ['idle','walk','eat','wave','jump','dance','sneak','sleep']){
  const {data,info}=await sharp(path.join(__dirname,'../assets/whale',`dense-${name}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,2048);assert.equal(info.height,4096);
  const hashes=new Set();
  for(let f=0;f<32;f++){
   const pixels=Buffer.alloc(512*512*4);let visible=0;
   for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=((Math.floor(f/4)*512+y)*info.width+f%4*512+x)*4,a=data[i+3];
    data.copy(pixels,(y*512+x)*4,i,i+4);
    if(a>200)visible++;
    if(x<10||x>=502||y<10||y>=502)assert.equal(a,0,`${name}:${f} cropped`);
    if(a>200)assert.ok(!(data[i]>180&&data[i]>data[i+1]+80&&data[i+2]>data[i+1]+80),`${name}:${f} magenta spill`);
   }
   assert.ok(visible>3000);hashes.add(require('node:crypto').createHash('sha256').update(pixels).digest('hex'));
  }assert.equal(hashes.size,32,`${name}: duplicate drawings`);
 }
});
test('idle holds a stable body and blinks briefly at spaced intervals',()=>{
 let active=0;
 for(let t=0;t<30000;t+=10){const p=sample('idle',t);assert.equal(p.frame,0);assert.equal(p.scaleX,1);assert.equal(p.scaleY,1);if(p.blink>0)active++;}
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

test('story originals have transparent margins and no magenta background in used frames',async()=>{
 for(const action of ['hum','meal-break','token-game','tail-sway']){
  const c=clips[action],{data,info}=await sharp(path.join(__dirname,'../assets/whale',c.atlas+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const cell=384;assert.equal(info.width,cell*4);assert.ok(new Set(c.frames).size>=(action==='tail-sway'?16:29));
  for(const frame of c.frames){let visible=0,spill=0;
   for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
    const i=((Math.floor(frame/4)*cell+y)*info.width+frame%4*cell+x)*4,a=data[i+3];
    if(a>200){visible++;if(data[i]>data[i+1]+80&&data[i+2]>data[i+1]+80&&data[i]>180)spill++;}
    if(x<6||x>=cell-6||y<6||y>=cell-6)assert.equal(a,0,`${action}:${frame} clipped margin`);
   }assert.ok(visible>10000);assert.equal(spill,0,`${action}:${frame} magenta remnants`);
  }
 }
});

test('story action blues stay within the current idle palette',async()=>{
 const hsv=(r,g,b)=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;
  if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}
  return {h:(h+360)%360,s:max?d/max:0,v:max};};
 const profile=async(file,cell,columns,rows)=>{
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),hues=[],sats=[];
  for(let y=0;y<info.height;y+=4)for(let x=0;x<info.width;x+=4){
   if(Math.floor(y/cell)>=rows||Math.floor(x/cell)>=columns)continue;
   const i=(y*info.width+x)*4;if(data[i+3]<200)continue;const c=hsv(data[i],data[i+1],data[i+2]);
   if(c.h>=215&&c.h<=270&&c.s>.2&&c.v>.16&&c.v<.92){hues.push(c.h);sats.push(c.s);}
  }
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
  return {hue:median(hues),saturation:median(sats)};
 };
 const target=await profile(path.join(__dirname,'../assets/whale/idle-front.png'),1024,1,1);
 for(const name of ['hum','meal','token']){
  const actual=await profile(path.join(__dirname,`../assets/whale/story-${name}.png`),384,4,8);
  assert.ok(Math.abs(actual.hue-target.hue)<=3,`${name} blue hue ${actual.hue.toFixed(1)} vs idle ${target.hue.toFixed(1)}`);
  assert.ok(Math.abs(actual.saturation-target.saturation)<=.06,`${name} blue saturation ${actual.saturation.toFixed(2)} vs idle ${target.saturation.toFixed(2)}`);
 }
});



test('airborne displacement follows the actual jump stage and returns to the floor',()=>{
 const c=clips.jump,air=c.stages.find(s=>s.name==='airborne');
 assert.equal(sample('jump',air.start).y,0);
 assert.ok(sample('jump',(air.start+air.end)/2).y < -40);
 assert.ok(Math.abs(sample('jump',air.end).y)<1e-8);
 assert.equal(sample('jump',air.end+100).y,0);
 for(let t=0;t<air.start;t+=10)assert.equal(sample('jump',t).y,0);
});
test('sleep never reopens eyes after the close-eyes phase and recovery is monotonic',()=>{
 const c=clips.sleep,start=c.stages.find(s=>s.name==='close-eyes').start;
 for(let t=start;t<6000;t+=10){const p=sample('sleep',t);assert.ok([21,23,25,27,29,31,41,42].includes(p.frame));}
 const wave=clips.wave;
 assert.ok(wave.frames.every(f=>f%2===1),'do not alternate incompatible drawing batches');
 for(const action of ['sleep','eat','wave','jump']){
  const stages=clips[action].stages;for(let i=1;i<stages.length;i++)assert.equal(stages[i].start,stages[i-1].end);
 }
});

test('selected inbetweens and registered keys fit their atlases and revised timelines',async()=>{
 const expected={right:{count:0,duration:960},jump:{count:6,duration:1195},sleep:{count:4,duration:2410}};
 for(const [name,rule]of Object.entries(expected)){
  const c=clips[name],added=c.frames.filter(f=>f>=32);assert.equal(new Set(added).size,rule.count);
  assert.equal(c.times.reduce((a,b)=>a+b,0),rule.duration);
  const {data,info}=await sharp(path.join(__dirname,'../assets/whale',c.atlas+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(const f of c.frames){let visible=0;
   for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=((Math.floor(f/4)*512+y)*info.width+f%4*512+x)*4,a=data[i+3];
    if(x<10||x>=502||y<10||y>=502)assert.equal(a,0,`${name}:${f} clipping`);
    if(a>200){visible++;assert.ok(!(data[i]>180&&data[i]>data[i+1]+80&&data[i+2]>data[i+1]+80),`${name}:${f} magenta`);}
   }assert.ok(visible>3000);
  }
 }
 const air=clips.jump.stages.find(s=>s.name==='airborne');assert.equal(air.start,240);assert.equal(air.end,720);
});
test('jump inbetweens remain visible and physical stages end on pose boundaries',()=>{
 for(const name of ['jump','land']){
  const c=clips[name];let at=0;const boundaries=new Set([0]);
  for(const ms of c.times){assert.ok(ms>=40,'no one-refresh flash poses');at+=ms;boundaries.add(at);}
  for(const s of c.stages){assert.ok(boundaries.has(s.start));assert.ok(boundaries.has(s.end));assert.ok(s.end>s.start);}
  assert.equal(c.stages.at(-1).end,at);
 }
});
