'use strict';
// 用户已明确允许对新动画图做本地抠图；仅处理指定的纯品红底图，不改绘角色。
const sharp=require('sharp'),fs=require('node:fs');
(async()=>{
const input=process.argv[2],output=process.argv[3];if(!input||!output)throw new Error('Expected input/output');
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const original=Buffer.from(data);
for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];
 if(r>g+40&&b>g+40&&r>b*.65){const a=Math.max(0,Math.min(1,1-(Math.min(r,b)-g)/180));
 data[i+3]=Math.round(a*255);if(a>0){data[i]=Math.max(0,Math.min(255,(r-255*(1-a))/a));data[i+1]=Math.min(255,g/a);data[i+2]=Math.max(0,Math.min(255,(b-255*(1-a))/a));}}
}
// 仅在透明外沿消除品红底混色，使用附近未污染的角色颜色估算覆盖率。
// 不全局削弱紫色，否则会误伤头发、阴影和服装内部的真实颜色。
const keyed=Buffer.from(data),w=info.width,h=info.height;let cleaned=0;
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const i=(y*w+x)*4,r=original[i],g=original[i+1],b=original[i+2];
 if(!keyed[i+3]||!(r>g+20&&b>g+30&&r>b*.6))continue;
 let edge=false,nearest=null,best=Infinity;
 for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;
  const j=(ny*w+nx)*4,d=dx*dx+dy*dy;
  if(d<=4&&keyed[j+3]===0)edge=true;
  if(d<best&&keyed[j+3]>=250&&!(original[j]>original[j+1]+20&&original[j+2]>original[j+1]+30&&original[j]>original[j+2]*.6)){nearest=j;best=d;}
 }
 if(!edge||nearest===null)continue;
 const background=[255,0,255],color=[r,g,b],foreground=[original[nearest],original[nearest+1],original[nearest+2]];
 let numerator=0,denominator=0;
 for(let c=0;c<3;c++){const delta=foreground[c]-background[c];numerator+=(color[c]-background[c])*delta;denominator+=delta*delta;}
 const alpha=Math.max(0,Math.min(1,numerator/Math.max(1,denominator)));
 data[i+3]=Math.round(alpha*255);for(let c=0;c<3;c++)data[i+c]=foreground[c];cleaned++;
}
await sharp(data,{raw:info}).png().toFile(output);
console.log(`Removed background spill from ${cleaned} boundary pixels: ${output}`);
})();
