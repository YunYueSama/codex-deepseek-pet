'use strict';
// 展示图直接使用桌宠绘制函数，避免离线拼图与实际局部眨眼、步态表现不一致。
const {app,BrowserWindow}=require('electron'),path=require('node:path'),sharp=require('sharp');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const window=new BrowserWindow({width:300,height:360,show:false,webPreferences:{contextIsolation:true,sandbox:true}});
 try{
  await window.loadFile(path.join(__dirname,'../src/renderer/index.html'));
  for(let i=0;i<100;i++){if(await window.webContents.executeJavaScript('assetsReady'))break;await sleep(50);}
  if(!await window.webContents.executeJavaScript('assetsReady'))throw Error('Sprite loading timed out');
  const capture=async(action,time)=>{
   const data=await window.webContents.executeJavaScript(`resizeCanvas();ctx.clearRect(0,0,600,600);paint(PetMotion.sample(${JSON.stringify(action)},${time}));canvas.toDataURL();`);
   return Buffer.from(data.split(',')[1],'base64');
  };
  const names=['idle','right','eat','wave','jump','dance','sneak','sleep'],frames=[];
  for(let n=0;n<128;n++){
   const tiles=[];
   for(let i=0;i<names.length;i++)tiles.push({input:await sharp(await capture(names[i],n*50)).resize(192,192).png().toBuffer(),left:i%4*192,top:Math.floor(i/4)*192});
   frames.push(await sharp({create:{width:768,height:384,channels:4,background:'#edf1f8'}}).composite(tiles).raw().toBuffer());
  }
  await sharp(Buffer.concat(frames),{raw:{width:768,height:384*frames.length,channels:4,pageHeight:384}}).webp({quality:90,loop:0,delay:50}).toFile(path.join(__dirname,'../docs/motion-preview.webp'));
  const blink=[];
  for(const [i,t]of [0,5035,5080,5140,5210].entries())blink.push({input:await sharp(await capture('idle',t)).resize(300,300).png().toBuffer(),left:i*300,top:0});
  await sharp({create:{width:1500,height:300,channels:4,background:'#edf1f8'}}).composite(blink).png().toFile(path.join(__dirname,'../artifacts/blink-contact.png'));
  const motion=require('../src/renderer/motion.js');
  for(const name of [...names,'stop-right','wake']){
   const c=motion.clips[name],duration=c.times.reduce((a,b)=>a+b,0),tiles=[],count=name==='right'?32:16;
   for(let i=0;i<count;i++)tiles.push({input:await sharp(await capture(name,(name==='right'?600:0)+duration*i/count)).resize(192,192).png().toBuffer(),left:i%8*192,top:Math.floor(i/8)*192});
   await sharp({create:{width:1536,height:Math.ceil(count/8)*192,channels:4,background:'#edf1f8'}}).composite(tiles).png().toFile(path.join(__dirname,`../artifacts/${name}-runtime-contact.png`));
  }
  console.log('Runtime animation preview and blink contact generated.');
 }catch(e){console.error(e);process.exitCode=1;}finally{window.destroy();app.exit(process.exitCode||0);}
});
