'use strict';
// 每页四个原画，保留足够原生像素；先完整验证全部源图，再替换运行图集。
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),sharp=require('sharp');
const root=path.join(__dirname,'..'),source=path.join(root,'design/sources/hq'),out=path.join(root,'assets/whale');
const groups={idle:4,walk:4,eat:2,wave:2,jump:2,dance:2,sneak:2,sleep:2,actions:4,expressions:4};
const cell=512,clear={r:0,g:0,b:0,alpha:0};
(async()=>{
 const intermediate=path.join(root,'artifacts/hq');fs.mkdirSync(intermediate,{recursive:true});
 const frames={},evidence=[];
 for(const [group,pages]of Object.entries(groups))for(let page=1;page<=pages;page++){
  const file=path.join(source,`${group}-${page}-magenta.png`);
  if(!fs.existsSync(file))throw Error(`Missing HQ original: ${file}`);
 }
 for(const [group,pages]of Object.entries(groups)){
  frames[group]=[];
  for(let page=1;page<=pages;page++){
   const file=path.join(source,`${group}-${page}-magenta.png`),alpha=path.join(intermediate,`${group}-${page}.png`);
   execFileSync(process.execPath,[path.join(__dirname,'key-motion.cjs'),file,alpha],{windowsHide:true,stdio:'pipe'});
   const meta=await sharp(alpha).metadata();
   if(meta.width<1200||meta.height<1200)throw Error(`HQ original too small: ${file}`);
   const {data,info}=await sharp(alpha).raw().toBuffer({resolveWithObject:true});
   const {width,height}=info;
    // 全页连通分组，不沿假定格线切割，避免下一排呆毛跨过中线时被截入上一帧。
    const total=width*height,labels=new Int32Array(total),queue=new Int32Array(total),parts=[];
    for(let p=0;p<total;p++)if(!labels[p]&&data[p*4+3]>=80){
     let head=0,tail=0;const id=parts.length+1,part={id,minX:width,minY:height,maxX:0,maxY:0};queue[tail++]=p;labels[p]=id;
     while(head<tail){const q=queue[head++],x=q%width,y=Math.floor(q/width);
      part.minX=Math.min(part.minX,x);part.maxX=Math.max(part.maxX,x);part.minY=Math.min(part.minY,y);part.maxY=Math.max(part.maxY,y);
      for(const k of [x?q-1:-1,x<width-1?q+1:-1,y?q-width:-1,y<height-1?q+width:-1])if(k>=0&&!labels[k]&&data[k*4+3]>=80){labels[k]=id;queue[tail++]=k;}
     }parts.push({...part,count:tail});
    }
    const actors=parts.filter(p=>p.count>10000).sort((a,b)=>b.count-a.count).slice(0,4).sort((a,b)=>a.minY-b.minY);
    if(actors.length!==4)throw Error(`Expected four separate bodies: ${group}-${page}`);
    const ordered=[...actors.slice(0,2).sort((a,b)=>a.minX-b.minX),...actors.slice(2).sort((a,b)=>a.minX-b.minX)];
   for(const [n,actor]of ordered.entries()){
    const keep=new Set([actor.id]);
    for(const part of parts)if(part.count>=30&&!actors.includes(part)){
     const cx=(part.minX+part.maxX)/2,cy=(part.minY+part.maxY)/2;
     if(Math.hypot(Math.max(actor.minX-cx,0,cx-actor.maxX),Math.max(actor.minY-cy,0,cy-actor.maxY))<24)keep.add(part.id);
    }
    const frame=Buffer.alloc(data.length);
    let minX=width,minY=height,maxX=0,maxY=0;
    for(let p=0;p<total;p++){
     const x=p%width,y=Math.floor(p/width);let valid=keep.has(labels[p]);
     if(!valid&&data[p*4+3]>0)for(let dy=-2;dy<=2&&!valid;dy++)for(let dx=-2;dx<=2;dx++){
      const nx=x+dx,ny=y+dy;if(nx>=0&&nx<width&&ny>=0&&ny<height&&keep.has(labels[ny*width+nx])){valid=true;break;}
     }
     if(!valid)continue;
     data.copy(frame,p*4,p*4,p*4+4);
     minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    const sw=maxX-minX+1,sh=maxY-minY+1;
    if(sw<180||sh<180)throw Error(`Empty or damaged sprite: ${group}-${page}:${n}`);
    if(minX<2||minY<2||maxX>=width-2||maxY>=height-2)throw Error(`Sprite clipped by page boundary: ${group}-${page}:${n}`);
    frames[group].push({data:await sharp(frame,{raw:info}).extract({left:minX,top:minY,width:sw,height:sh}).png().toBuffer(),sw,sh});
    evidence.push({group,page,frame:n,width:sw,height:sh});
   }
  }
 }
 const normalized={};
 for(const [group,list]of Object.entries(frames)){
  const scale=420/Math.max(...list.map(f=>Math.max(f.sw,f.sh)));
  normalized[group]=await Promise.all(list.map(async f=>{
   const width=Math.round(f.sw*scale),height=Math.round(f.sh*scale);
   const image=await sharp(f.data).resize(width,height,{kernel:'lanczos3'}).png().toBuffer();
   return sharp({create:{width:cell,height:cell,channels:4,background:clear}}).composite([{input:image,left:Math.round((cell-width)/2),top:476-height}]).png().toBuffer();
  }));
 }
 const atlases={'motion-idle':normalized.idle,'motion-walk':normalized.walk,
  'motion-basic':[...normalized.idle.slice(0,8),...normalized.walk.slice(0,8),...normalized.eat,...normalized.wave],
  'motion-extra':[...normalized.jump,...normalized.dance,...normalized.sneak,...normalized.sleep],
  actions:normalized.actions,expressions:normalized.expressions};
 for(const [name,list]of Object.entries(atlases)){
  const columns=list.length===32?8:4;
  await sharp({create:{width:columns*cell,height:4*cell,channels:4,background:clear}}).composite(list.map((input,i)=>({input,left:i%columns*cell,top:Math.floor(i/columns)*cell}))).png().toFile(path.join(out,`${name}.png`));
 }
 fs.writeFileSync(path.join(intermediate,'compiled.json'),JSON.stringify({cell,frames:evidence},null,2)+'\n');
 console.log(`Compiled all ${evidence.length} HQ original frames, ${cell}px runtime cells.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
