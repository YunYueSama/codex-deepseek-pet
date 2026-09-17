'use strict';
const fs=require('fs'),path=require('path');
const out=path.join(__dirname,'../artifacts/flow-qa');fs.mkdirSync(out,{recursive:true});
if(!process.versions.electron){const child=require('child_process').spawn(require('electron'),[__filename,`--test-user-data=${path.join(out,'profile')}`],{stdio:'inherit',windowsHide:true});const timer=setTimeout(()=>child.kill(),60000);child.on('exit',code=>{clearTimeout(timer);process.exitCode=code??1;});}
else{
 const {app,BrowserWindow}=require('electron'),assert=require('assert/strict'),sharp=require('sharp');require('../src/main/main.cjs');
 app.whenReady().then(async()=>{try{
  let pet;for(let i=0;i<200;i++){pet=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html'));if(pet&&await pet.webContents.executeJavaScript('assetsReady'))break;await new Promise(r=>setTimeout(r,100));}
  const state=await pet.webContents.executeJavaScript('({ready:flowRenderer?.ready,textures:flowRenderer?.textures.size,fields:Object.keys(PetFlowData.entries).length})');assert.equal(state.ready,true);console.log(state);
  const parts=[];for(const [row,start]of [600,780,1500].entries())for(const [col,progress]of [0,.25,.49,.51,.75,.999].entries()){
   const data=await pet.webContents.executeJavaScript(`(()=>{const p=PetMotion.sample('right',${start+progress*60});p.scaleY=1;p.y=0;ctx.clearRect(0,0,600,600);paint(p);return canvas.toDataURL();})()`);
   parts.push({input:await sharp(Buffer.from(data.split(',')[1],'base64')).resize(300,300).png().toBuffer(),left:col*300,top:row*300});
  }
  await sharp({create:{width:1800,height:900,channels:4,background:'#edf1f8'}}).composite(parts).png().toFile(path.join(out,'walk-transitions.png'));
  const continuity=await pet.webContents.executeJavaScript(`(()=>{
   const result={};for(const smooth of [false,true]){let previous=null;const changes=[];
    for(let i=0;i<116;i++){
     const p=PetMotion.sample('right',600+i*1000/60);p.scaleX=p.scaleY=1;p.y=0;if(!smooth)p.frameMix=0;
     ctx.clearRect(0,0,600,600);paint(p);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     if(previous){let difference=0;for(let k=0;k<pixels.length;k+=4)for(let c=0;c<3;c++)difference+=Math.abs(pixels[k+c]*pixels[k+3]/255-previous[k+c]*previous[k+3]/255);changes.push(difference/(pixels.length/4*3));}previous=pixels;
    }
    const sorted=changes.slice().sort((a,b)=>a-b);result[smooth?'interpolated':'original']={changes,held:changes.filter(v=>v<.001).length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};
   }return result;
  })()`);
  assert.ok(continuity.interpolated.held<continuity.original.held,'interpolation must replace held pictures with intermediate motion');
  assert.ok(continuity.interpolated.p95<continuity.original.p95,'interpolation must reduce high frame-to-frame jumps');
  const hit=await pet.webContents.executeJavaScript(`(()=>{
   let checked=0,mismatched=0;for(const action of ['right','left'])for(const at of [795,825]){
    const p=PetMotion.sample(action,at);p.scaleX=p.scaleY=1;p.y=0;ctx.clearRect(0,0,600,600);paint(p);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,meta=images[p.atlas],cell=meta.width/4;
    for(let y=0;y<canvas.height;y+=3)for(let x=0;x<canvas.width;x+=3){const alpha=pixels[(y*canvas.width+x)*4+3];if(alpha>5&&alpha<240)continue;
     const u=(x+.5)/canvas.width,v=(y+.5)/canvas.height,m=flowRenderer.mapPoint(p,p.flip?1-u:u,v);let predicted=false;
     if(m.x>=0&&m.x<1&&m.y>=0&&m.y<1){const px=m.frame%4*cell+Math.floor(m.x*cell),py=Math.floor(m.frame/4)*cell+Math.floor(m.y*cell),bit=py*meta.width+px;predicted=Boolean(masks[p.atlas][bit>>3]&(1<<(bit&7)));}
     checked++;if(predicted!==(alpha>=240))mismatched++;
    }
   }return {checked,mismatched,ratio:mismatched/checked};
  })()`);
  assert.ok(hit.ratio<.02,'deformed silhouette and pointer hit mask must agree away from antialiasing edges');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({...state,continuity,hit},null,2));console.log({continuity:Object.fromEntries(Object.entries(continuity).map(([name,v])=>[name,{held:v.held,p95:v.p95,max:v.max}])),hit});
 }catch(e){console.error(e);process.exitCode=1;}finally{app.once('will-quit',()=>app.exit(process.exitCode||0));app.quit();}});
}
