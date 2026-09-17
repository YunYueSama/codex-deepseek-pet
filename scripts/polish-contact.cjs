'use strict';
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const {clips}=require('../src/renderer/motion.js');
(async()=>{
 const out=path.join(__dirname,'../artifacts/polish');fs.mkdirSync(out,{recursive:true});
 for(const name of ['jump','sleep','right']){
  const c=clips[name],layers=[];
  for(let n=0;n<c.frames.length;n++){
   const i=c.frames[n];
   const input=await sharp(path.join(__dirname,'../assets/whale',c.atlas+'.png')).extract({left:i%4*512,top:Math.floor(i/4)*512,width:512,height:512}).resize(250,250).png().toBuffer();
   layers.push({input,left:n%6*250,top:Math.floor(n/6)*280});
   layers.push({input:Buffer.from(`<svg width="250" height="30"><text x="15" y="23" font-size="20">${n}: frame ${i}</text></svg>`),left:n%6*250,top:Math.floor(n/6)*280+250});
  }
  await sharp({create:{width:1500,height:Math.ceil(c.frames.length/6)*280,channels:4,background:'#cdd9e3'}}).composite(layers).png().toFile(path.join(out,name+'-keys.png'));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
