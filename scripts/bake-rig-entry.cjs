'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.join(__dirname,'..'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const w=new BrowserWindow({width:600,height:650,show:false,webPreferences:{contextIsolation:true,sandbox:true}});
 try{
  await w.loadFile(path.join(root,'src/renderer/index.html'));
  for(let i=0;i<100&&!await w.webContents.executeJavaScript('assetsReady');i++)await sleep(50);
  if(!await w.webContents.executeJavaScript('assetsReady'))throw Error('Rig assets unavailable');
  await w.webContents.executeJavaScript('canvas.width=600;canvas.height=600;ctx.setTransform(1,0,0,1,0,0);true;');
  const shot=async(action,time,extra={})=>{const data=await w.webContents.executeJavaScript(`ctx.clearRect(0,0,600,600);paint({...PetMotion.sample(${JSON.stringify(action)},${time}),...${JSON.stringify(extra)}});canvas.toDataURL();`);return Buffer.from(data.split(',')[1],'base64');};
  await sharp(await shot('idle',0)).resize(512,512).png().toFile(path.join(root,'assets/whale/portrait.png'));
  const rows=[['idle',6,6000],['right',8,1200],['left',8,1200],['wave',4,3000],['jump',5,2100],['sad',8,3500],['think',6,6000],['review',8,6000],['happy',6,3000]],tiles=[];
  for(const [r,[action,count,duration]]of rows.entries())for(let i=0;i<count;i++)tiles.push({input:await sharp(await shot(action,i*duration/count)).resize(192,192).png().toBuffer(),left:i*192,top:r*208+16});
  const empty=(width,height)=>sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}});
  await empty(1536,1872).composite(tiles).webp({lossless:true}).toFile(path.join(root,'codex-deepseek-pet/spritesheet-web.webp'));
  const neutral=await sharp(await shot('idle',0)).resize(192,192).png().toBuffer();for(let i=0;i<16;i++)tiles.push({input:neutral,left:i%8*192,top:(9+Math.floor(i/8))*208+16});
  await empty(1536,2288).composite(tiles).webp({lossless:true}).toFile(path.join(root,'codex-deepseek-pet/spritesheet.webp'));
  const contacts=[],actions=[['right',1200],['wave',3000],['eat',4600],['dance',5800],['sleep',2600],['stretch',4000]];
  for(const [row,[action,duration]]of actions.entries())for(let frame=0;frame<8;frame++)contacts.push({input:await sharp(await shot(action,frame*duration/8)).resize(150,150).png().toBuffer(),left:frame*150,top:row*150});
  await sharp({create:{width:1200,height:900,channels:4,background:'#edf1f8'}}).composite(contacts).png().toFile(path.join(root,'docs/rig-motion-contact.png'));
  const designs=[];for(let i=0;i<6;i++)designs.push({input:await sharp(await shot('idle',0,{expression:i})).resize(400,400).png().toBuffer(),left:i%3*400,top:Math.floor(i/3)*400});
  await sharp({create:{width:1200,height:800,channels:4,background:'#f6f7fc'}}).composite(designs).png().toFile(path.join(root,'design/character-sheet.png'));
  const quality=[];
  for(const density of [1,1.5,2]){
   await w.webContents.executeJavaScript(`canvas.width=${300*density};canvas.height=${300*density};ctx.setTransform(${density/2},0,0,${density/2},0,0);true;`);
   for(const action of ['idle','right','wave','eat','sleep','drag','land']){
    const result=await w.webContents.executeJavaScript(`(()=>{ctx.clearRect(0,0,600,600);paint(PetMotion.sample('${action}',800));const d=ctx.getImageData(0,0,canvas.width,canvas.height),s=canvas.width/600;let checked=0,matched=0,edge=0;for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){const a=d.data[(y*d.width+x)*4+3];if((x===0||y===0||x===d.width-1||y===d.height-1)&&a)edge++;if(x%11===0&&y%11===0&&a>240){checked++;if(rig.hit((x+.5)/s,(y+.5)/s))matched++;}}return {checked,matched,edge,backend:rig.backend};})()`);
    if(result.edge||!result.checked||result.matched/result.checked<.99)throw Error(`Rig quality failure ${action}/${density}: ${JSON.stringify(result)}`);
    quality.push({density,action,...result});
   }
  }
  fs.writeFileSync(path.join(root,'artifacts/rig-quality.json'),JSON.stringify(quality,null,2));
  console.log('Baked rig portrait, Codex exports and full-cycle contact sheet.');
 }catch(e){console.error(e);process.exitCode=1;}finally{w.destroy();app.exit(process.exitCode||0);}
});
