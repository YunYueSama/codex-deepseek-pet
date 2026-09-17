'use strict';
const fs=require('fs'),path=require('path'),sharp=require('sharp'),{extract}=require('./build-stories.cjs');
const root=path.join(__dirname,'..'),source=path.join(root,'design/sources/inbetween-v1'),manifest=require('../design/sources/inbetween-v1/pairs.json');
async function geometry(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let min=512,max=0,sum=0,count=0;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(y*info.width+x)*4+3]>80){min=Math.min(min,y);max=Math.max(max,y);}
 for(let y=Math.round(min+(max-min)*.25);y<min+(max-min)*.55;y++)for(let x=0;x<512;x++)if(data[(y*info.width+x)*4+3]>200){sum+=x;count++;}
 return {height:max-min+1,bottom:max+1,center:sum/count,faceWidth:require('./face-width.cjs')(data,512,512)};
}
(async()=>{fs.mkdirSync(path.join(root,'artifacts/stories'),{recursive:true});
 for(const [name,m]of Object.entries(manifest)){
  const keys=[];for(let i=0;i<32;i++)keys.push(await sharp(path.join(root,'assets/whale',m.atlas+'.png')).extract({left:i%4*512,top:Math.floor(i/4)*512,width:512,height:512}).png().toBuffer());
  const g=await Promise.all(keys.map(geometry));const targets=m.pairs.map(([a,b])=>Object.fromEntries(['height','bottom','center','faceWidth'].map(k=>[k,(g[a][k]+g[b][k])/2])));
  // 侧脸宽度随转角改变，不作缩放依据；两张阴影干扰肤色测量的帧按三联图校正。
  if(name==='walk')for(const t of targets)t.faceWidth=null;
  if(name==='jump')targets[3].faceWidth*=1.2;
  if(name==='sleep')targets[10].faceWidth*=.8;
  const added=await extract(path.join(source,`${name}-new.png`),targets,512),frames=[...keys,...added];
  const registration=require('../design/sources/inbetween-v1/registration.json')[name]||{};
  for(const [frame,rule]of Object.entries(registration))frames[frame]=await require('./register-sprite.cjs')(frames[frame],rule.scale,rule.shiftX);
  if(name==='sleep'){
   const rest=await require('./build-sleep-rest.cjs')();
   for(const [i,frame]of [21,23,25,27,29,31].entries())frames[frame]=rest[i];
  }
  await sharp({create:{width:2048,height:6144,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%4*512,top:Math.floor(i/4)*512}))).png().toFile(path.join(root,'assets/whale',`inbetween-${name}.png`));
  console.log(name,added.length,'drawn candidates compiled');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
