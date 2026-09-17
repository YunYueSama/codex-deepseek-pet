'use strict';
// 整体连通区域提取，避免裁断呆毛；脚底与躯体中心对齐，限制生成原画的尺度漂移。
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),sharp=require('sharp');
const root=path.join(__dirname,'..'),source=path.join(root,'design/sources/stories-v1'),out=path.join(root,'assets/whale');
const clear={r:0,g:0,b:0,alpha:0},cell=384;
async function extract(file,targets=null,outputCell=cell){
 const alpha=path.join(root,'artifacts/stories',path.basename(file));
 execFileSync(process.execPath,[path.join(__dirname,'key-motion.cjs'),file,alpha],{windowsHide:true,stdio:'pipe'});
 const {data,info}=await sharp(alpha).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n),parts=[];
 for(let p=0;p<n;p++)if(!labels[p]&&data[p*4+3]>=80){
  let head=0,tail=0;const id=parts.length+1,b={id,minX:w,minY:h,maxX:0,maxY:0};queue[tail++]=p;labels[p]=id;
  while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);b.minY=Math.min(b.minY,y);b.maxY=Math.max(b.maxY,y);
   for(const k of [x?q-1:-1,x<w-1?q+1:-1,y?q-w:-1,y<h-1?q+w:-1])if(k>=0&&!labels[k]&&data[k*4+3]>=80){labels[k]=id;queue[tail++]=k;}
  }parts.push({...b,count:tail});
 }
 const bodies=parts.filter(b=>b.count>5000).sort((a,b)=>b.count-a.count).slice(0,16).sort((a,b)=>a.minY-b.minY);
 if(bodies.length!==16)throw Error(`${file}: expected 16 separate bodies, found ${bodies.length}`);
 const ordered=[];for(let r=0;r<4;r++)ordered.push(...bodies.slice(r*4,r*4+4).sort((a,b)=>a.minX-b.minX));
 const heights=ordered.map(b=>b.maxY-b.minY+1).sort((a,b)=>a-b),pageScale=410/heights[8];
 const frames=[];
 for(const [index,b]of ordered.entries()){
  if(b.minX<1||b.minY<1||b.maxX>=w-1||b.maxY>=h-1)throw Error(`${file}:${index} touches page edge`);
  const ids=new Set([b.id]);
  for(const part of parts)if(!bodies.includes(part)&&part.count>=10&&part.minX>=b.minX-3&&part.maxX<=b.maxX+3&&part.minY>=b.minY-3&&part.maxY<=b.maxY+3)ids.add(part.id);
  const left=Math.max(0,b.minX-3),top=Math.max(0,b.minY-3),sw=Math.min(w,b.maxX+4)-left,sh=Math.min(h,b.maxY+4)-top;
  const pixels=Buffer.alloc(sw*sh*4);let centerSum=0,centerCount=0;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
   const p=(y+top)*w+x+left;let keep=ids.has(labels[p]);
   if(!keep&&data[p*4+3])for(let dy=-2;dy<=2&&!keep;dy++)for(let dx=-2;dx<=2;dx++){
    const nx=x+left+dx,ny=y+top+dy;if(nx>=0&&nx<w&&ny>=0&&ny<h&&ids.has(labels[ny*w+nx])){keep=true;break;}
   }
   if(keep){data.copy(pixels,(y*sw+x)*4,p*4,p*4+4);if(y>sh*.25&&y<sh*.55&&data[p*4+3]>200){centerSum+=x;centerCount++;}}
  }
  // 全身等比例校正，不单独拉伸头或腿；保留少量自然起伏，防止跨页忽大忽小。
  const face=targets?.[index].faceWidth&&require('./face-width.cjs')(pixels,sw,sh);
  const preferred=face?targets[index].faceWidth/face:(targets?targets[index].height:Math.max(402,Math.min(418,sh*pageScale)))/sh;
  const scale=Math.min(488/sw,((targets?targets[index].bottom:476)-12)/sh,preferred);
  const width=Math.round(sw*scale),height=Math.round(sh*scale),center=centerSum/centerCount;
  const x=Math.max(12,Math.min(500-width,Math.round((targets?targets[index].center:244)-center*scale))),y=Math.round((targets?targets[index].bottom:476)-height);
  if(x<12||y<12||x+width>500)throw Error(`${file}:${index} exceeds safe runtime margins`);
  const input=await sharp(pixels,{raw:{width:sw,height:sh,channels:4}}).resize(width,height,{kernel:'lanczos3'}).png().toBuffer();
  const canvas=await sharp({create:{width:512,height:512,channels:4,background:clear}}).composite([{input,left:x,top:y}]).png().toBuffer();
  frames.push(await sharp(canvas).resize(outputCell,outputCell).png().toBuffer());
 }
 return frames;
}
async function main(){
 fs.mkdirSync(path.join(root,'artifacts/stories'),{recursive:true});const report={cell,groups:{}};
 for(const name of ['hum','meal','token','tail']){
  const pages=name==='tail'?1:2,list=[];
  for(let i=1;i<=pages;i++){
   const keys=await extract(path.join(source,`${name}-${i}.png`)),between=await extract(path.join(source,`${name}-${i}-between.png`));
   list.push(...keys.flatMap((frame,index)=>[frame,between[index]]));
  }
  await sharp({create:{width:cell*4,height:Math.ceil(list.length/4)*cell,channels:4,background:clear}}).composite(list.map((input,i)=>({input,left:i%4*cell,top:Math.floor(i/4)*cell}))).png().toFile(path.join(out,`story-${name}.png`));
  report.groups[name]=list.length;
 }
 fs.writeFileSync(path.join(root,'artifacts/stories/compiled.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={extract};
