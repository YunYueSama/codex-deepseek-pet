'use strict';
const {app,BrowserWindow,screen}=require('electron');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http');
const {spawn}=require('node:child_process');let fixture=null;
require('../src/main/main.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn){for(let i=0;i<120;i++){const value=await fn();if(value)return value;await sleep(100);}throw new Error('UI condition timed out');}
app.whenReady().then(async()=>{
 const server=http.createServer((req,res)=>{let text='';req.on('data',c=>text+=c);req.on('end',()=>{
  const body=JSON.parse(text);assert.equal(body.model,'mock-whale');assert.equal(body.stream,true);
  res.setHeader('Content-Type','text/event-stream');res.write(`data: ${JSON.stringify({choices:[{delta:{content:'我在这里，'}}]})}\n\n`);
  const timer=setTimeout(()=>res.end(`data: ${JSON.stringify({choices:[{delta:{content:'我们慢慢来。'},finish_reason:'stop'}]})}\n\ndata: [DONE]\n\n`),1200);
  res.on('close',()=>clearTimeout(timer));
 });});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 const panel=await wait(()=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('companion.html')));
 const pet=await wait(()=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html')));
 await wait(()=>panel.webContents.executeJavaScript('Boolean(window.petApi && document.querySelector("#focus"))'));
 await wait(()=>pet.webContents.executeJavaScript('assetsReady'));
 const errors=[];for(const w of [pet,panel])w.webContents.on('console-message',(_e,level,message)=>{if(level>=3)errors.push(message);});
 const initial=pet.getBounds();
 await panel.webContents.executeJavaScript(`document.querySelector('[data-tab="settings"]').click();document.querySelector('[name="baseUrl"]').value='http://127.0.0.1:${server.address().port}/v1';document.querySelector('[name="model"]').value='mock-whale';document.querySelector('#settings-form').requestSubmit();`);
 await wait(()=>panel.webContents.executeJavaScript('document.querySelector("#notice").textContent.includes("设置已保存")'));
 await panel.webContents.executeJavaScript('document.querySelector("#start-chat").click();document.querySelector("#prompt").value="你好";document.querySelector("#chat-form").requestSubmit();');
 await wait(()=>panel.webContents.executeJavaScript('busy && document.querySelector("#messages .assistant:last-child").textContent === "我在这里，"'));
 await wait(()=>panel.webContents.executeJavaScript('document.querySelector("#messages").textContent.includes("我们慢慢来")'));
 await wait(()=>panel.webContents.executeJavaScript('!busy'));
 await panel.webContents.executeJavaScript('document.querySelector("#prompt").value="取消测试";document.querySelector("#chat-form").requestSubmit();');
 await wait(()=>panel.webContents.executeJavaScript('activeReply?.text === "我在这里，"'));
 await panel.webContents.executeJavaScript('document.querySelector("#cancel").click()');
 await wait(()=>panel.webContents.executeJavaScript('!busy && document.querySelector("#messages").textContent.includes("这次回复已取消")'));
 assert.equal(await panel.webContents.executeJavaScript('document.querySelectorAll("#messages .assistant")[1].textContent'),'我在这里，');
 assert.equal(await panel.webContents.executeJavaScript('(async()=> (await api.settings()).value.history.length)()'),2);
 const maskReport=await pet.webContents.executeJavaScript('({bytes:Object.values(masks).reduce((n,a)=>n+a.byteLength,0),pixels:Object.values(images).reduce((n,img)=>n+img.width*img.height,0)})');
 assert.equal(maskReport.bytes,maskReport.pixels/8);console.log('Hit mask memory:',JSON.stringify(maskReport));
 await panel.webContents.executeJavaScript('document.querySelector("#feed").click()');await sleep(200);
 assert.equal(await pet.webContents.executeJavaScript('state.action'),'eat');
 await panel.webContents.executeJavaScript('document.querySelector("#focus").click()');await sleep(200);
 assert.equal(await pet.webContents.executeJavaScript('state.mode'),'focus');
 await pet.webContents.executeJavaScript('window.petApi.drag("start",{x:500,y:500});window.petApi.drag("move",{x:520,y:530});');await sleep(200);
 assert.equal(await pet.webContents.executeJavaScript('document.querySelector("#chat")===null'),true);
 assert.equal(await pet.webContents.executeJavaScript('getComputedStyle(bubble).fontSize'),'15px');
 fs.writeFileSync(path.join(__dirname,'../docs/bubble-preview.png'),(await pet.webContents.capturePage()).toPNG());
 await pet.webContents.executeJavaScript('window.petApi.drag("end");');await sleep(200);
 const moved=pet.getBounds();assert.equal(initial.width,moved.width);assert.equal(initial.height,moved.height);
 await panel.webContents.executeJavaScript('document.querySelector("[data-tab=play]").click();document.querySelector("#game-start").click();document.querySelector("#token").click();');
 assert.equal(await panel.webContents.executeJavaScript('score'),1);
 for(const percent of [42,1,0,100]){
  const result=await panel.webContents.executeJavaScript(`api.scale(${percent/100})`);assert.equal(result.ok,true);
  await wait(()=>pet.webContents.executeJavaScript(`settings.scale===${percent/100}`));
  if(percent===0)assert.equal(pet.isVisible(),false);else{
   assert.equal(pet.getBounds().width,Math.max(32,Math.round(300*percent/100)));assert.equal(pet.isVisible(),true);
   assert.equal(await pet.webContents.executeJavaScript('canvas.getBoundingClientRect().width'),300*percent/100);
  }
 }
 await panel.webContents.executeJavaScript('document.querySelector("[data-tab=settings]").click();document.querySelector("#size-slider").value=42;document.querySelector("#size-slider").dispatchEvent(new Event("input"));');
 await wait(()=>pet.webContents.executeJavaScript('settings.scale===.42'));
 assert.equal(await panel.webContents.executeJavaScript('document.querySelector("#size-output").textContent'),'42%');
 fs.writeFileSync(path.join(__dirname,'../docs/size-settings-preview.png'),(await panel.webContents.capturePage()).toPNG());
 await panel.webContents.executeJavaScript('document.querySelector("#size-slider").value=100;document.querySelector("#size-slider").dispatchEvent(new Event("input"));');
 await wait(()=>pet.webContents.executeJavaScript('settings.scale===1'));
 await panel.webContents.executeJavaScript('document.querySelector("[data-tab=company]").click()');
 await wait(()=>panel.webContents.executeJavaScript('document.querySelector("#company").classList.contains("active")'));
 for(const width of [720,930]){
  panel.setSize(width,740);await sleep(150);
  const layout=await panel.webContents.executeJavaScript(`(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {input:box('#minutes'),label:box('.minutes'),focus:box('#focus'),quiet:box('#quiet')};})()`);
  assert.ok(Math.abs(layout.input.y-layout.focus.y)<1,'Focus input and button must align');
  assert.ok(Math.abs(layout.label.height-layout.input.height)<1,'Minutes unit must stay beside input');
  assert.ok(layout.quiet.x>=layout.focus.x+layout.focus.width,'Focus buttons must not overlap');
 }
 await sleep(350);
 fs.writeFileSync(path.join(__dirname,'../docs/preview-v2.png'),(await panel.webContents.capturePage()).toPNG());
 fs.writeFileSync(path.join(__dirname,'../docs/qa-pet-v2.png'),(await pet.webContents.capturePage()).toPNG());
 const sharp=require('sharp'),landingFrames=[];
 for(let i=0;i<20;i++){
  const png=await pet.webContents.executeJavaScript(`ctx.clearRect(0,0,600,600);paint(PetMotion.sample('land',${i*50}));canvas.toDataURL('image/png');`);
  landingFrames.push(await sharp(Buffer.from(png.split(',')[1],'base64')).resize(300,300).flatten({background:'#edf1f8'}).ensureAlpha().raw().toBuffer());
 }
 assert.notDeepEqual(landingFrames[0],landingFrames[3]);
 await sharp(Buffer.concat(landingFrames),{raw:{width:300,height:6000,channels:4,pageHeight:300}}).webp({quality:85,loop:0,delay:50}).toFile(path.join(__dirname,'../docs/landing-preview.webp'));
 if(process.env.PET_TEST_EDGES){
  panel.hide();
  const area=screen.getDisplayMatching(pet.getBounds()).workArea;
  const target={x:area.x+Math.round(area.width*.3),y:area.y+Math.round(area.height*.6),width:640,height:200};
  fixture=spawn(process.execPath,[path.join(__dirname,'window-fixture.cjs'),path.join(app.getPath('userData'),'fixture'),JSON.stringify(target)],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Fixture timeout')),10000);fixture.stdout.on('data',b=>{if(b.toString().includes('"ready":true')){clearTimeout(timer);resolve();}});});
  await sleep(1500);
  const b=pet.getBounds(),foot=require('../src/main/physics.cjs').footOffset(b);
  const dx=target.x+200-b.width/2-b.x,dy=target.y-75-foot-b.y;
  await pet.webContents.executeJavaScript(`api.drag('start',{x:500,y:500});api.drag('move',{x:${500+dx},y:${500+dy}});`);
  // 停住鼠标后释放，不带人为测试移动的甩动速度。
  await sleep(250);await pet.webContents.executeJavaScript(`api.drag('move',{x:${500+dx},y:${500+dy}});api.drag('end');`);
  await wait(()=>pet.webContents.executeJavaScript("state.action === 'land'"));
  assert.ok(Math.abs(pet.getBounds().y+foot-target.y)<12,`Expected external window landing: target=${JSON.stringify(target)}, pet=${JSON.stringify(pet.getBounds())}, foot=${foot}`);
  const beforeMove=pet.getBounds();fs.writeFileSync(path.join(app.getPath('userData'),'fixture','move.json'),JSON.stringify({...target,x:target.x+80,y:target.y+30}));
  try { await wait(()=>Math.abs(pet.getBounds().x-beforeMove.x-80)<5&&Math.abs(pet.getBounds().y-beforeMove.y-30)<5); }
  catch(e){throw new Error(`Window following failed: before=${JSON.stringify(beforeMove)}, after=${JSON.stringify(pet.getBounds())}`);}
  fixture.kill();fixture=null;await sleep(800);
  await wait(()=>Math.abs(pet.getBounds().y+foot-(area.y+area.height))<3);
  console.log('Native window edge test passed: external window landing, moving support, and support removal.');
  pet.showInactive();panel.show();
 }
 if(process.env.PET_TEST_VISUAL){
  panel.hide();pet.showInactive();await sleep(200);
  await pet.webContents.executeJavaScript(`window.visualTimes=[];window.originalPaint=paint;paint=function(p,a){visualTimes.push(performance.now());return originalPaint(p,a);};state={...state,action:'right',started:Date.now(),until:Date.now()+15000};`);
  await sleep(6000);
  const report=await pet.webContents.executeJavaScript(`(()=>{paint=originalPaint;const times=visualTimes,d=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b);return {frames:times.length,fps:(times.length-1)*1000/(times.at(-1)-times[0]),p95:d[Math.floor(d.length*.95)],max:d.at(-1)};})()`);
  fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../artifacts/visual-metrics.json'),JSON.stringify(report,null,2));
  assert.ok(report.fps>=57,`Actual rendering rate too low for 60 FPS: ${report.fps}`);assert.ok(report.p95<22,`Frame pacing p95 too high: ${report.p95}`);
  console.log('Visual pacing:',JSON.stringify(report));
  // 遍历所有动作的真实绘制路径，防止只验收走路而漏掉其他图集。
  const allActions=await pet.webContents.executeJavaScript('Object.keys(PetMotion.clips)');
  const allShots=[];
  await pet.webContents.executeJavaScript('visualTimes=[];paint=function(p,a){visualTimes.push(performance.now());return originalPaint(p,a);};true;');
  for(const [i,action]of allActions.entries()){
   await pet.webContents.executeJavaScript(`state={...state,action:${JSON.stringify(action)},started:Date.now(),until:Date.now()+10000};lastDraw='';`);
   await sleep(220);
   const data=await pet.webContents.executeJavaScript('canvas.toDataURL()');
   allShots.push({input:await sharp(Buffer.from(data.split(',')[1],'base64')).resize(192,192).png().toBuffer(),left:i%8*192,top:Math.floor(i/8)*192});
  }
  const allReport=await pet.webContents.executeJavaScript(`(()=>{paint=originalPaint;const t=visualTimes,d=t.slice(1).map((v,i)=>v-t[i]).sort((a,b)=>a-b);return {frames:t.length,fps:(t.length-1)*1000/(t.at(-1)-t[0]),p95:d[Math.floor(d.length*.95)],max:d.at(-1)};})()`);
  assert.ok(allReport.fps>=57,`All-action rendering below target: ${allReport.fps}`);
  assert.ok(allReport.p95<22,`All-action frame pacing too high: ${allReport.p95}`);
  fs.writeFileSync(path.join(__dirname,'../artifacts/all-action-visual-metrics.json'),JSON.stringify({actions:allActions,...allReport},null,2));
  await sharp({create:{width:1536,height:Math.ceil(allActions.length/8)*192,channels:4,background:'#edf1f8'}}).composite(allShots).png().toFile(path.join(__dirname,'../docs/all-actions-contact.png'));
  console.log('All-action visual pacing:',JSON.stringify(allReport));
  const shots=[];
  for(let i=0;i<16;i++){
   const data=await pet.webContents.executeJavaScript(`ctx.clearRect(0,0,600,600);paint(PetMotion.sample('right',${i*90}));canvas.toDataURL();`);
   shots.push({input:await sharp(Buffer.from(data.split(',')[1],'base64')).resize(300,300).png().toBuffer(),left:i%4*300,top:Math.floor(i/4)*300});
  }
  await sharp({create:{width:1200,height:1200,channels:4,background:'#edf1f8'}}).composite(shots).png().toFile(path.join(__dirname,'../docs/visual-walk-contact.png'));
 }
 // 跳过启动时 CPU 零基线；短窗采样仅作诊断，不能代替长时间资源验收。
 const sample=()=>app.getAppMetrics().map(m=>({type:m.type,cpu:m.cpu.percentCPUUsage,memoryKB:m.memory.workingSetSize}));
 sample();const metrics={visible:[],hidden:[]};
 for(let i=0;i<3;i++){await sleep(2000);metrics.visible.push(sample());}
 pet.hide();panel.hide();
 for(let i=0;i<3;i++){await sleep(2000);metrics.hidden.push(sample());}
 fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../artifacts/integration-metrics.json'),JSON.stringify(metrics,null,2));
 assert.deepEqual(errors,[]);console.log('Integration passed: atlases, settings, local mock chat, feeding, focus, drag size, game and screenshots.');
 }catch(e){console.error(e);process.exitCode=1;}finally{fixture?.kill();server.closeAllConnections();server.close();app.once('will-quit',()=>app.exit(process.exitCode||0));app.quit();}
});
