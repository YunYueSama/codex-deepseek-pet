'use strict';
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.join(__dirname,'..'),out=path.join(root,'assets/whale');
const transparent={r:0,g:0,b:0,alpha:0};
const empty=(w,h)=>sharp({create:{width:w,height:h,channels:4,background:transparent}});
// 仅消费高清构建结果，旧版素材不再作为隐式回退来源。
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const readFrames=async name=>{
  const file=path.join(out,name+'.png'),meta=await sharp(file).metadata(),cell=meta.width/4;
  return Promise.all(Array.from({length:16},(_,i)=>sharp(file).extract({left:i%4*cell,top:Math.floor(i/4)*cell,width:cell,height:cell}).png().toBuffer()));
 };
 const actions=await readFrames('actions');
 const extra=await readFrames('expressions');
 const front=await sharp(path.join(out,'idle-front.png')).extract({left:0,top:0,width:512,height:512}).png().toBuffer();
 const frontBlink=await sharp(path.join(out,'idle-front.png')).extract({left:512,top:0,width:512,height:512}).png().toBuffer();
 await sharp(front).toFile(path.join(out,'portrait.png'));
 // 应用图标由 build-brand.cjs 单独编译，禁止重新用全身立绘覆盖。
 const all=[...actions,...extra];
 // 沿用仓库 v2 的行顺序与有效帧数：idle/right/left/wave/jump/failure/waiting/running/complete。
 const sequences=[[0,0,1,0,0,0],[13,13,13,13,13,13,13,13],[12,12,12,12,12,12,12,12],[0,10,10,0],
 [0,5,15,15,5],[0,9,9,27,27,9,0,0],[0,2,14,2,0,0],[0,2,24,2,3,0],[0,4,5,10,5,0]];
 const tiles=[];
 const motionFrame=async(name,row,col,flip=false)=>{
  const columns=['motion-idle','motion-walk'].includes(name)?4:8;
  const cell=(await sharp(path.join(out,name+'.png')).metadata()).width/columns;
  let image=sharp(path.join(out,name+'.png')).extract({left:col*cell,top:row*cell,width:cell,height:cell});
  if(flip)image=image.flop();return image.resize(192,192).png().toBuffer();
 };
 for(let row=0;row<9;row++)for(let col=0;col<sequences[row].length;col++){
  let buffer;
  if(row===0){buffer=await sharp(col===4?frontBlink:front).resize(192,192).png().toBuffer();}
  else if(row===1||row===2){const frame=col*4;buffer=await motionFrame('motion-walk',Math.floor(frame/4),frame%4,row===2);}
  else if(row===3){const frame=32+[0,4,8,14][col];buffer=await motionFrame('motion-basic',Math.floor(frame/8),frame%8);}
  else if(row===4){const frame=[0,3,7,12,15][col];buffer=await motionFrame('motion-extra',Math.floor(frame/8),frame%8);}
  else buffer=await sharp(all[sequences[row][col]]).resize(192,192).png().toBuffer();
  tiles.push({input:buffer,left:col*192,top:row*208+16});
 }
 const desktop=path.join(root,'codex-deepseek-pet');
 const web=await empty(1536,1872).composite(tiles).png().toBuffer();
 await sharp(web).webp({lossless:true}).toFile(path.join(desktop,'spritesheet-web.webp'));
 // v2 宿主保留行数契约，但方向槽全部使用同一中立姿势，不再随鼠标转向。
 for(let i=0;i<16;i++)tiles.push({input:await sharp(front).resize(192,192).png().toBuffer(),left:(i%8)*192,top:(9+Math.floor(i/8))*208+16});
 await empty(1536,2288).composite(tiles).webp({lossless:true}).toFile(path.join(desktop,'spritesheet.webp'));
 fs.writeFileSync(path.join(desktop,'pet.json'),JSON.stringify({id:'deepseek-whale-v2',displayName:'大肥鱼 · 贪吃的桌面伙伴',description:'饭要好好吃，问题也要慢慢嚼。',spriteVersionNumber:2,spritesheetPath:'spritesheet.webp'},null,2)+'\n');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:5,cell:512,columns:4,actions:32,gaze:0,motion:{idle:16,walk:32,eat:16,wave:16,jump:16,dance:16,sneak:16,sleep:16,turn:8},rows:sequences.map(s=>s.length)},null,2)+'\n');
 console.log('Compiled expressions and neutral Codex direction slots.');
})().catch(e=>{console.error(e.message);process.exit(1);});
