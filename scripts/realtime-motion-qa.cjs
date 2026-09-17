'use strict';
// 以真实时钟驱动现有 draw，不逐帧快进；录制 1 倍速画布并记录可见原画切换。
const fs=require('node:fs'),path=require('node:path');
const output=path.join(__dirname,'../artifacts/'+(process.env.PET_QA_OUTPUT||'realtime-motion-qa'));fs.mkdirSync(output,{recursive:true});
if(!process.versions.electron){
 const child=require('node:child_process').spawn(require('electron'),[__filename,`--test-user-data=${path.join(output,'profile')}`],{windowsHide:true,stdio:'inherit'});
 const timer=setTimeout(()=>child.kill(),120000);child.on('exit',code=>{clearTimeout(timer);process.exitCode=code??1;});
}else{
 const {app,BrowserWindow}=require('electron'),sharp=require('sharp');require('../src/main/main.cjs');
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 app.whenReady().then(async()=>{try{
  let pet;for(let i=0;i<200;i++){pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html'));if(pet&&await pet.webContents.executeJavaScript('assetsReady'))break;await sleep(100);}
  if(!pet)throw Error('Pet window missing');
  if(!await pet.webContents.executeJavaScript('assetsReady'))throw Error('Sprite loading timed out');
  pet.showInactive();await sleep(500);
  // 专用测试窗口屏蔽外部状态干扰，运行的仍是原 draw/paint/采样器。
  await pet.webContents.executeJavaScript(`window.qaAction='idle';window.qaStart=Date.now();window.qaPaint=paint;window.qaEvents=[];window.qaShots=[];window.qaChanges=[];window.qaLast='';
   paint=function(p,a){const now=performance.now();qaEvents.push(now);const id=p.atlas+':'+p.frame;if(id!==qaLast){qaChanges.push({at:now,id});qaLast=id;}qaPaint(p,a);if(!qaShots.length||now-qaShots.at(-1).at>=100)qaShots.push({at:now,png:canvas.toDataURL()});};
   window.qaDraw=draw;draw=function(now){state={action:qaAction,started:qaStart,until:qaStart+60000,message:''};qaDraw(now);};true;`);
  const report={speed:1,actions:{}};
  for(const action of (process.env.PET_QA_ACTIONS?.split(',')||['idle','shift','right','wave','eat','jump','sleep','hum','tail-sway'])){
   console.log('Normal-speed recording:',action);
   const length=action==='right'?5200:action==='idle'?6200:4200;
   const result=await pet.webContents.executeJavaScript(`new Promise(resolve=>{
    qaAction=${JSON.stringify(action)};qaStart=Date.now();state={action:qaAction,started:qaStart,until:qaStart+60000,message:''};qaEvents=[];qaShots=[];qaChanges=[];qaLast='';
    const stream=canvas.captureStream(60),chunks=[],rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:3000000});
    rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=async()=>{const buf=new Uint8Array(await new Blob(chunks).arrayBuffer());let str='';for(let i=0;i<buf.length;i+=8192)str+=String.fromCharCode(...buf.subarray(i,i+8192));stream.getTracks().forEach(t=>t.stop());resolve({video:btoa(str),events:qaEvents,shots:qaShots,changes:qaChanges});};rec.start();setTimeout(()=>rec.stop(),${length});
   })`);
   fs.writeFileSync(path.join(output,action+'.webm'),Buffer.from(result.video,'base64'));
   const deltas=result.events.slice(1).map((v,i)=>v-result.events[i]).sort((a,b)=>a-b);
   report.actions[action]={durationMs:length,paintFps:(result.events.length-1)*1000/(result.events.at(-1)-result.events[0]),p95:deltas[Math.floor(deltas.length*.95)],max:deltas.at(-1),changes:result.changes};
   const shots=result.shots.slice(0,40),parts=[];
   if(!shots.length)throw Error('No rendered frames captured for '+action);
   for(const [i,shot]of shots.entries())parts.push({input:await sharp(Buffer.from(shot.png.split(',')[1],'base64')).resize(160,160).png().toBuffer(),left:i%10*160,top:Math.floor(i/10)*160});
   await sharp({create:{width:1600,height:Math.ceil(shots.length/10)*160,channels:4,background:'#edf1f8'}}).composite(parts).png().toFile(path.join(output,action+'-timeline.png'));
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(Object.fromEntries(Object.entries(report.actions).map(([k,v])=>[k,{fps:v.paintFps,p95:v.p95,max:v.max}])));
 }catch(e){console.error(e);process.exitCode=1;}finally{
  // 走正常退出流程以停止主进程的窗口探测器，避免视频已写完但测试进程超时。
  app.once('will-quit',()=>app.exit(process.exitCode||0));app.quit();
 }});
}
