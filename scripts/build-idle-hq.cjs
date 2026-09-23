'use strict';
// 待机单独使用高分辨率原画；仅清理透明背景碎点，保留原始轮廓与整身比例。
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.join(__dirname,'..'),source=path.join(root,'design/sources/hq-v5/idle-pair-magenta.png');
async function buildIdle(){
 const alphaSource=path.join(root,'artifacts/hq-v5/idle-pair-alpha.png');
 fs.mkdirSync(path.dirname(alphaSource),{recursive:true});
 require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'key-motion.cjs'),source,alphaSource],{stdio:'inherit',windowsHide:true});
 const {data,info}=await sharp(alphaSource).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,labels=new Int32Array(w*h),queue=new Int32Array(w*h),parts=[];
 for(let p=0;p<w*h;p++)if(!labels[p]&&data[p*4+3]>=96){
  const b={id:parts.length+1,left:w,top:h,right:0,bottom:0};let head=0,tail=0;queue[tail++]=p;labels[p]=b.id;
  while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);b.left=Math.min(b.left,x);b.right=Math.max(b.right,x);b.top=Math.min(b.top,y);b.bottom=Math.max(b.bottom,y);
   for(const n of [x?q-1:-1,x<w-1?q+1:-1,y?q-w:-1,y<h-1?q+w:-1])if(n>=0&&!labels[n]&&data[n*4+3]>=96){labels[n]=b.id;queue[tail++]=n;}
  }parts.push({...b,count:tail});
 }
 const bodies=parts.filter(p=>p.count>10000).sort((a,b)=>b.count-a.count).slice(0,2).sort((a,b)=>a.left-b.left);
 if(bodies.length!==2)throw Error('Expected two separated full-body idle drawings');
 const cell=1024,frames=[],report={source:{width:w,height:h},cell,frames:[]};
 for(const b of bodies){
  const nativeHeight=b.bottom-b.top+1;
  if(nativeHeight<800)throw Error(`Idle source only ${nativeHeight}px high; redraw it instead of enlarging a thumbnail`);
  const left=Math.max(0,b.left-3),top=Math.max(0,b.top-3),width=Math.min(w,b.right+4)-left,height=Math.min(h,b.bottom+4)-top;
  const pixels=Buffer.alloc(width*height*4);let centerSum=0,centerCount=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const sx=left+x,sy=top+y,p=sy*w+sx;let keep=labels[p]===b.id;
   if(!keep&&data[p*4+3]>=24)for(let dy=-2;dy<=2&&!keep;dy++)for(let dx=-2;dx<=2;dx++){
    const nx=sx+dx,ny=sy+dy;if(nx>=0&&nx<w&&ny>=0&&ny<h&&labels[ny*w+nx]===b.id){keep=true;break;}
   }
   if(keep){data.copy(pixels,(y*width+x)*4,p*4,p*4+4);if(y>height*.25&&y<height*.55&&data[p*4+3]>200){centerSum+=x;centerCount++;}}
  }
  const factor=Math.min(820/height,960/width,1),dw=Math.round(width*factor),dh=Math.round(height*factor);
  const x=Math.max(24,Math.min(1000-dw,Math.round(488-centerSum/centerCount*factor))),y=952-dh;
  const input=await sharp(pixels,{raw:{width,height,channels:4}}).resize(dw,dh,{kernel:'lanczos3'}).png().toBuffer();
  frames.push(await sharp({create:{width:cell,height:cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left:x,top:y}]).png().toBuffer());
  report.frames.push({nativeHeight,drawnHeight:dh,scale:factor});
 }
 await sharp({create:{width:cell*2,height:cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames.map((input,i)=>({input,left:i*cell,top:0}))).png().toFile(path.join(root,'assets/whale/idle-front.png'));
 await sharp(frames[0]).png().toFile(path.join(root,'assets/whale/portrait.png'));
 fs.mkdirSync(path.join(root,'artifacts/clarity-v10'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/clarity-v10/source-resolution.json'),JSON.stringify(report,null,2));console.log(report);
}
if(require.main===module)buildIdle().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={buildIdle};
