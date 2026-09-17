'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.join(__dirname,'../artifacts/story-qa');fs.mkdirSync(output,{recursive:true});
if(!process.versions.electron){
 const child=require('node:child_process').spawn(require('electron'),[__filename,`--test-user-data=${path.join(output,'profile')}`,'--panel'],{windowsHide:true,stdio:'inherit'});
 const timer=setTimeout(()=>child.kill(),90000);child.on('exit',code=>{clearTimeout(timer);process.exitCode=code??1;});
}else{
 const {app,BrowserWindow}=require('electron'),sharp=require('sharp');require('../src/main/main.cjs');
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function wait(fn){for(let i=0;i<150;i++){if(await fn())return;await sleep(100);}throw Error('Story UI timeout');}
 app.whenReady().then(async()=>{try{
  let pet,panel;await wait(()=>{pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html'));panel=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('companion.html'));return pet&&panel;});
  await wait(()=>pet.webContents.executeJavaScript('assetsReady'));panel.hide();console.log('Story assets ready');
  const actions=['hum','meal-break','token-game','tail-sway'],report={clips:{},scales:[]},contacts=[];
  await pet.webContents.executeJavaScript('window.qaTimes=[];window.qaPaint=paint;paint=function(p,a){qaTimes.push(performance.now());return qaPaint(p,a);};true;');
  for(const action of actions){
   console.log('Playing',action);
   await pet.webContents.executeJavaScript(`api.interact(${JSON.stringify(action)});true;`);
   await wait(()=>pet.webContents.executeJavaScript(`state.action===${JSON.stringify(action)}`));await sleep(2400);
   if(action!=='tail-sway'){
    await pet.webContents.executeJavaScript("api.interact('pet');true;");await wait(()=>pet.webContents.executeJavaScript("state.action==='story-recover'"));
    await wait(()=>pet.webContents.executeJavaScript("state.action==='idle'"));
   }
  }
  report.pacing=await pet.webContents.executeJavaScript(`(()=>{paint=qaPaint;const t=qaTimes,d=t.slice(1).map((v,i)=>v-t[i]).sort((a,b)=>a-b);return {frames:t.length,fps:(t.length-1)*1000/(t.at(-1)-t[0]),p95:d[Math.floor(d.length*.95)],max:d.at(-1)};})()`);
  assert.ok(report.pacing.fps>=55,JSON.stringify(report.pacing));
  // 检查真正 Canvas 输出，预览文件使用同一采样函数与 paint 路径。
  const captureActions=Object.keys(require('../src/renderer/motion.js').clips).filter(a=>a!=='story-recover');
  for(const [row,action]of captureActions.entries()){
   console.log('Capturing',action);
   const c=require('../src/renderer/motion.js').clips[action],frames=[];let elapsed=['left','right'].includes(action)?600:0;
   report.clips[action]={originalFrames:c.frames.length,durationMs:c.times.reduce((a,b)=>a+b,0)};
   for(let i=0;i<c.frames.length;i++){
    const png=await pet.webContents.executeJavaScript(`ctx.clearRect(0,0,600,600);paint(PetMotion.sample(${JSON.stringify(action)},${elapsed}));canvas.toDataURL();`);
    const buffer=Buffer.from(png.split(',')[1],'base64');
    frames.push(await sharp(buffer).resize(300,300).flatten({background:'#edf1f8'}).ensureAlpha().raw().toBuffer());
    const step=Math.ceil(c.frames.length/8);
    if(i%step===0)contacts.push({input:await sharp(buffer).resize(220,220).png().toBuffer(),left:Math.floor(i/step)*220,top:row*220});
    elapsed+=c.times[i];
   }
   await sharp(Buffer.concat(frames),{raw:{width:300,height:300*frames.length,channels:4,pageHeight:300}}).webp({quality:92,loop:0,delay:c.times.map(Math.round)}).toFile(path.join(output,action+'.webp'));
  }
  await sharp({create:{width:1760,height:captureActions.length*220,channels:4,background:'#edf1f8'}}).composite(contacts).png().toFile(path.join(output,'contact.png'));
  await panel.webContents.executeJavaScript("document.querySelector('[data-tab=play]').click();true;");
  panel.showInactive();await sleep(200);
  await panel.webContents.capturePage().then(img=>fs.writeFileSync(path.join(output,'panel.png'),img.toPNG()));
  for(const scale of [0,.01,.42,1]){
   await panel.webContents.executeJavaScript(`api.scale(${scale});`);
   await sleep(200);report.scales.push({scale,bounds:pet.getBounds()});
  }
  report.maskBytes=await pet.webContents.executeJavaScript('Object.values(masks).reduce((n,m)=>n+m.byteLength,0)');
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }catch(error){console.error(error);process.exitCode=1;}finally{app.exit(process.exitCode||0);}});
}

