'use strict';
const path=require('path'),sharp=require('sharp');
const source=path.join(__dirname,'../design/sources/sleep-rest-v1');
// 工具把透明底画成了灰白棋盘。只清除与边缘连通的中性底色，保留轮廓内白裙和肤色。
async function clearBackground(input){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 const visit=p=>{if(seen[p])return;const i=p*4,max=Math.max(data[i],data[i+1],data[i+2]),min=Math.min(data[i],data[i+1],data[i+2]);if(max-min<28&&min>120){seen[p]=1;queue[tail++]=p;}};
 for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
 while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);if(x)visit(p-1);if(x<w-1)visit(p+1);if(y)visit(p-w);if(y<h-1)visit(p+w);}
 for(let p=0;p<w*h;p++)if(seen[p])data[p*4+3]=0;
 return sharp(data,{raw:info}).png().toBuffer();
}
async function bounds(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,t=info.height,r=0,b=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>80){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}return {left:l,top:t,width:r-l+1,height:b-t+1};}
module.exports=async function buildSleepRest(){
 const file=path.join(source,'generated.png'),meta=await sharp(file).metadata(),target=await bounds(path.join(source,'reference.png')),frames=[];
 for(let i=0;i<6;i++){
  const left=Math.round(i%3*meta.width/3),top=Math.round(Math.floor(i/3)*meta.height/2),width=Math.round((i%3+1)*meta.width/3)-left,height=Math.round((Math.floor(i/3)+1)*meta.height/2)-top;
  const clean=await clearBackground(await sharp(file).extract({left,top,width,height}).png().toBuffer()),box=await bounds(clean);
  const scaled=await sharp(clean).extract(box).resize({height:target.height}).png().toBuffer(),m=await sharp(scaled).metadata();
  const x=Math.round(target.left+target.width/2-m.width/2),y=target.top;
  if(x<12||x+m.width>500||y<12||y+m.height>500)throw Error('Sleeping sprite outside margins');
  frames.push(await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:scaled,left:x,top:y}]).png().toBuffer());
 }
 return frames;
};
