'use strict';
// 无录制、无同步截图：分别记录 rAF 间隔和 paint CPU 耗时，包含首次动作切换。
const fs=require('fs'),path=require('path');
const output=path.join(__dirname,'../artifacts',process.env.PET_QA_OUTPUT||'frame-pacing');fs.mkdirSync(output,{recursive:true});
if(!process.versions.electron){
 const child=require('child_process').spawn(require('electron'),[__filename,`--test-user-data=${path.join(output,'profile')}`],{windowsHide:true,stdio:'inherit'});
 const timer=setTimeout(()=>child.kill(),90000);child.on('exit',code=>{clearTimeout(timer);process.exitCode=code??1;});
}else{
 const {app,BrowserWindow}=require('electron');require('../src/main/main.cjs');
 app.whenReady().then(async()=>{try{
  let pet;for(let i=0;i<300;i++){pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html'));if(pet&&await pet.webContents.executeJavaScript('assetsReady'))break;await new Promise(r=>setTimeout(r,100));}
  const result=await pet.webContents.executeJavaScript(`new Promise(resolve=>{
   const actions=['right','jump','land','sleep','wake','wave','eat','dance','sneak','hum','meal-break','token-game','tail-sway','shift'];
   const originalDraw=draw,originalPaint=paint,records=[];let index=0,start=performance.now(),previous=0;
   paint=function(p,a){const t=performance.now();originalPaint(p,a);Object.assign(records.at(-1),{paintAt:t,paintMs:performance.now()-t});};
   draw=function(now){
    const elapsed=now-start;if(elapsed>=2000){index++;start=now;}
    if(index>=actions.length){draw=originalDraw;paint=originalPaint;resolve(records);originalDraw(now);return;}
    records.push({action:actions[index],delta:previous?now-previous:0,paintMs:0});previous=now;
    state={action:actions[index],started:Date.now()-(now-start),until:Date.now()+5000,message:''};originalDraw(now);
   };
  })`);
  const stats=values=>{values=values.slice().sort((a,b)=>a-b);return {p95:values[Math.floor(values.length*.95)],max:values.at(-1),over33:values.filter(v=>v>33.4).length,over50:values.filter(v=>v>50).length};};
  const report={recording:false,actions:{}};
  for(const action of new Set(result.map(r=>r.action))){
   const r=result.filter(r=>r.action===action&&r.delta>0),painted=r.filter(v=>v.paintAt);
   report.actions[action]={callbacks:r.length,rafHz:r.length*1000/r.reduce((sum,v)=>sum+v.delta,0),paintFps:(painted.length-1)*1000/(painted.at(-1).paintAt-painted[0].paintAt),raf:stats(r.map(v=>v.delta)),paint:stats(painted.map(v=>v.paintMs)),paintIntervals:stats(painted.slice(1).map((v,i)=>v.paintAt-painted[i].paintAt))};
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }catch(e){console.error(e);process.exitCode=1;}finally{app.once('will-quit',()=>app.exit(process.exitCode||0));app.quit();}});
}
