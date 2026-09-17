'use strict';
// 保存整张原画；按页去底并统一脚底，不拆分、扭曲身体部件。
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const {extract}=require('./build-stories.cjs');
const root=path.join(__dirname,'..'),source=path.join(root,'design/sources/stories-v2');
async function main(){
 const tmp=path.join(root,'artifacts/stories');fs.mkdirSync(tmp,{recursive:true});
 for(const name of ['hum','meal','token','walk']){
  const file=path.join(source,name+'.png'),m=await sharp(file).metadata(),frames=[];
  for(let page=0;page<(name==='walk'?1:2);page++){
   const height=name==='walk'?m.height:Math.floor(m.height/2),part=path.join(tmp,`${name}-v2-${page}.png`);
   await sharp(file).extract({left:0,top:page*height,width:m.width,height}).png().toFile(part);
   const full=await extract(part,null,512);
   frames.push(...await Promise.all(full.map(frame=>name==='walk'?frame:sharp(frame).resize(384,384).png().toBuffer())));
  }
  const cell=name==='walk'?512:384;
  await sharp({create:{width:cell*4,height:Math.ceil(frames.length/4)*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
   .composite(frames.map((input,i)=>({input,left:i%4*cell,top:Math.floor(i/4)*cell}))).png()
   .toFile(path.join(root,'assets/whale',name==='walk'?'inbetween-walk.png':`story-${name}.png`));
  console.log(name,frames.length);
 }
 await require('./build-idle-hq.cjs').buildIdle();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
