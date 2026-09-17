'use strict';
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),{extract}=require('./build-stories.cjs');
const root=path.join(__dirname,'..'),out=path.join(root,'assets/whale'),source=path.join(root,'design/sources/dense-v1');
const groups={idle:['motion-idle',4,0,16],eat:['motion-basic',8,16,16],wave:['motion-basic',8,32,16],jump:['motion-extra',8,0,16],dance:['motion-extra',8,16,16],sneak:['motion-extra',8,32,16],sleep:['motion-extra',8,48,16]};
async function geometry(frame){const {data,info}=await sharp(frame).ensureAlpha().raw().toBuffer({resolveWithObject:true});let minY=512,maxY=0,sum=0,count=0;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(y*info.width+x)*4+3]>80){minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 for(let y=Math.round(minY+(maxY-minY)*.25);y<minY+(maxY-minY)*.55;y++)for(let x=0;x<512;x++)if(data[(y*info.width+x)*4+3]>200){sum+=x;count++;}
 return {height:maxY-minY+1,bottom:maxY+1,center:sum/count};
}
(async()=>{fs.mkdirSync(path.join(root,'artifacts/stories'),{recursive:true});const report={};
 for(const [name,[atlas,cols,start,count]]of Object.entries(groups)){
  const keys=[];for(let i=0;i<count;i++){const frame=start+i;keys.push(await sharp(path.join(out,atlas+'.png')).extract({left:frame%cols*512,top:Math.floor(frame/cols)*512,width:512,height:512}).png().toBuffer());}
  const geometryList=await Promise.all(keys.map(geometry)),between=[];
  for(let page=0;page<count/16;page++)between.push(...await extract(path.join(source,`${name}-${page+1}.png`),geometryList.slice(page*16,page*16+16),512));
  const frames=keys.flatMap((frame,i)=>[frame,between[i]]);
  await sharp({create:{width:2048,height:frames.length/4*512,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%4*512,top:Math.floor(i/4)*512}))).png().toFile(path.join(out,`dense-${name}.png`));report[name]=frames.length;
 }
 // 新步态独立重画，避免把旧的重复大跨步混进支撑/经过阶段。
 const walk=[...await extract(path.join(source,'walk-cycle.png'),null,512),...await extract(path.join(source,'walk-between.png'),null,512)];
 await sharp({create:{width:2048,height:4096,channels:4,background:'#00000000'}}).composite(walk.map((input,i)=>({input,left:i%4*512,top:Math.floor(i/4)*512}))).png().toFile(path.join(out,'dense-walk.png'));
 report.walk=32;fs.writeFileSync(path.join(root,'artifacts/dense-motion.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1;});
