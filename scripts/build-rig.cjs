'use strict';
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),source=path.join(root,'design/sources/rig'),out=path.join(root,'assets/whale/rig'),temp=path.join(root,'artifacts/rig');
async function splitParts(file,names,columns){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,labels=new Int32Array(w*h),queue=new Int32Array(w*h),parts=[];
 for(let p=0;p<w*h;p++)if(!labels[p]&&data[p*4+3]>=100){
  const id=parts.length+1;let head=0,tail=0,minX=w,minY=h,maxX=0,maxY=0;labels[p]=id;queue[tail++]=p;
  while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const k of [x?q-1:-1,x<w-1?q+1:-1,y?q-w:-1,y<h-1?q+w:-1])if(k>=0&&!labels[k]&&data[k*4+3]>=100){labels[k]=id;queue[tail++]=k;}
  }parts.push({id,count:tail,minX,minY,maxX,maxY});
 }
 const major=parts.filter(p=>p.count>1500).sort((a,b)=>b.count-a.count).slice(0,names.length).sort((a,b)=>(a.minY+a.maxY)-(b.minY+b.maxY));
 if(major.length!==names.length)throw Error('Rig parts count mismatch');
 const ordered=[];for(let i=0;i<major.length;i+=columns)ordered.push(...major.slice(i,i+columns).sort((a,b)=>a.minX-b.minX));
 for(let i=0;i<ordered.length;i++){
  const part=ordered[i],pad=3,left=Math.max(0,part.minX-pad),top=Math.max(0,part.minY-pad),width=Math.min(w-left,part.maxX-part.minX+1+pad*2),height=Math.min(h-top,part.maxY-part.minY+1+pad*2);
  const image=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const old=(top+y)*w+left+x;let keep=labels[old]===part.id;
   if(!keep&&data[old*4+3]>0)for(let dy=-2;dy<=2&&!keep;dy++)for(let dx=-2;dx<=2;dx++){const nx=left+x+dx,ny=top+y+dy;if(nx>=0&&nx<w&&ny>=0&&ny<h&&labels[ny*w+nx]===part.id){keep=true;break;}}
   if(keep&&data[old*4+3]>=24)data.copy(image,(y*width+x)*4,old*4,old*4+4);
  }
  await sharp(image,{raw:{width,height,channels:4}}).resize(512,512,{fit:'inside',withoutEnlargement:true}).png().toFile(path.join(out,names[i]+'.png'));
 }
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});fs.mkdirSync(temp,{recursive:true});
 for(const name of ['parts','heads','side'])execFileSync(process.execPath,[path.join(__dirname,'key-motion.cjs'),path.join(source,`${name}-magenta.png`),path.join(temp,`${name}.png`)],{stdio:'inherit',windowsHide:true});
 await splitParts(path.join(temp,'parts.png'),['torso','hair','tail','armL','armR','legL','legR','token','packet'],3);
 await splitParts(path.join(temp,'heads.png'),Array.from({length:6},(_,i)=>`head${i}`),3);
 await splitParts(path.join(temp,'side.png'),['sideHead0','sideHead1','sideHead2','sideTorso','sideHair','sideArmL','sideArmR','sideLegL','sideLegR'],3);
 const names=fs.readdirSync(out).filter(n=>n.endsWith('.png')),manifest={version:1,render:'skeletal',assets:{}};
 for(const name of names){const m=await sharp(path.join(out,name)).metadata();manifest.assets[name.slice(0,-4)]={width:m.width,height:m.height};}
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Compiled all new rig layers.');
})().catch(e=>{console.error(e);process.exitCode=1;});
