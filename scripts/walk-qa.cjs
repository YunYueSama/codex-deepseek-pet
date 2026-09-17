'use strict';
const path=require('path'),fs=require('fs');const out=path.join(__dirname,'../artifacts/walk-qa-v9');fs.mkdirSync(out,{recursive:true});
if(!process.versions.electron){const child=require('child_process').spawn(require('electron'),[__filename,`--test-user-data=${path.join(out,'profile')}`],{stdio:'inherit',windowsHide:true});const timer=setTimeout(()=>child.kill(),60000);child.on('exit',code=>{clearTimeout(timer);process.exitCode=code??1;});}
else{
 const {app,BrowserWindow,screen}=require('electron'),assert=require('assert/strict'),main=require('../src/main/main.cjs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 app.whenReady().then(async()=>{try{
  let pet;for(let i=0;i<200;i++){pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html'));if(pet&&await pet.webContents.executeJavaScript('assetsReady'))break;await sleep(100);}
  const area=screen.getDisplayMatching(pet.getBounds()).workArea,position={x:area.x+Math.round(area.width/2)-150,y:area.y+area.height-360},report=[];
  for(const direction of [1,-1]){
   main.startTestWalk(position,direction*90);const samples=[];let previous=position.x,previousPhase=0;
   for(let i=0;i<300;i++){
    await sleep(30);const state=main.walkState(),render=await pet.webContents.executeJavaScript('({elapsed:walkElapsed,offset:walkOffset,flow:flowRenderer?.ready})');
    assert.ok((state.bounds.x-previous)*direction>=0,'native position must not jump backward');previous=state.bounds.x;
    if(state.target!==null&&render.elapsed!==null){assert.ok(render.elapsed>=previousPhase);previousPhase=render.elapsed;assert.ok(Math.abs(render.elapsed-state.travel/55*1000)<100,'gait phase must follow travelled distance');}
    samples.push({...state,render,at:Date.now()});if(state.target===null)break;
   }
   assert.equal(main.walkState().target,null,'walk must reach endpoint');assert.equal(pet.getBounds().x,position.x+direction*90);
   assert.ok(samples.some(s=>s.travel>0&&s.render.flow),'real movement must use enabled interpolation');
   await sleep(100);assert.equal(await pet.webContents.executeJavaScript('walkElapsed'),null,'stop must reset walking phase');report.push({direction,samples});
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('Actual left/right walking, monotonic displacement, distance-driven gait and stop reset passed');
 }catch(e){console.error(e);process.exitCode=1;}finally{app.once('will-quit',()=>app.exit(process.exitCode||0));app.quit();}});
}
