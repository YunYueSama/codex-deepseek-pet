'use strict';
const fs=require('fs'),path=require('path'),sharp=require('sharp'),{clips}=require('../src/renderer/motion.js');
const out=path.join(__dirname,'../design/sources/inbetween-v1');fs.mkdirSync(out,{recursive:true});
(async()=>{const manifest={};
 for(const [name,action]of [['walk','right'],['jump','jump'],['sleep','sleep']]){
  const c=clips[action],pairs=[];
  for(let i=0;i<16;i++){const j=i%(c.loop?c.frames.length:c.frames.length-1);pairs.push([c.frames[j],c.frames[(j+1)%c.frames.length]]);}
  for(const [index,suffix]of ['from','to'].entries()){
   const parts=[];for(const [i,pair]of pairs.entries())parts.push({input:await sharp(path.join(__dirname,'../assets/whale',c.atlas+'.png')).extract({left:pair[index]%4*512,top:Math.floor(pair[index]/4)*512,width:512,height:512}).png().toBuffer(),left:i%4*512,top:Math.floor(i/4)*512});
   await sharp({create:{width:2048,height:2048,channels:4,background:'#ff00ff'}}).composite(parts).png().toFile(path.join(out,`${name}-${suffix}.png`));
  }manifest[name]={atlas:c.atlas,pairs,used:c.loop?c.frames.length:c.frames.length-1};
 }fs.writeFileSync(path.join(out,'pairs.json'),JSON.stringify(manifest,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
