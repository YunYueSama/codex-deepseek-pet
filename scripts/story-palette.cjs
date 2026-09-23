'use strict';
const sharp=require('sharp');

function rgbToHsv(r,g,b){
 r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let h=0;
 if(delta){if(max===r)h=60*(((g-b)/delta)%6);else if(max===g)h=60*((b-r)/delta+2);else h=60*((r-g)/delta+4);}
 return {h:(h+360)%360,s:max?delta/max:0,v:max};
}
function hsvToRgb(h,s,v){
 const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;
 if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
 return [r+m,g+m,b+m].map(value=>Math.max(0,Math.min(255,Math.round(value*255))));
}
const quantile=(values,p)=>values[Math.min(values.length-1,Math.floor((values.length-1)*p))];
function paletteSamples(data,info){
 const hues=[],saturations=[];
 for(let y=0;y<info.height;y+=4)for(let x=0;x<info.width;x+=4){
  const i=(y*info.width+x)*4;if(data[i+3]<200)continue;
  const {h,s,v}=rgbToHsv(data[i],data[i+1],data[i+2]);
  if(h>=215&&h<=270&&s>.2&&v>.16&&v<.92){hues.push(h);saturations.push(s);}
 }
 if(!hues.length)throw Error('No blue character colors found for palette normalization');
 hues.sort((a,b)=>a-b);saturations.sort((a,b)=>a-b);
 return {hues,saturations,medianHue:quantile(hues,.5),medianSaturation:quantile(saturations,.5)};
}
function makeLut(source,target,length){
 const points=[0,.1,.25,.5,.75,.9,1].map(p=>[quantile(source,p),quantile(target,p)]);
 const lut=new Float32Array(length);let segment=0;
 for(let i=0;i<length;i++){
  while(segment<points.length-2&&i>points[segment+1][0])segment++;
  const [x0,y0]=points[segment],[x1,y1]=points[segment+1],ratio=(i-x0)/Math.max(.0001,x1-x0);
  lut[i]=Math.max(points[0][1],Math.min(points.at(-1)[1],y0+(y1-y0)*ratio));
 }
 return lut;
}
async function normalizeFrames(frames,reference){
 const ref=await sharp(reference).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const target=paletteSamples(ref.data,ref.info),images=[];
 for(const frame of frames)images.push(await sharp(frame).ensureAlpha().raw().toBuffer({resolveWithObject:true}));
 const channels=images.map(({data,info})=>paletteSamples(data,info)),hues=channels.flatMap(x=>x.hues).sort((a,b)=>a-b),saturations=channels.flatMap(x=>x.saturations).sort((a,b)=>a-b);
 const source={medianHue:quantile(hues,.5),medianSaturation:quantile(saturations,.5)};
 const hueLut=makeLut(hues,target.hues,360),satLut=makeLut(saturations.map(x=>x*255),target.saturations.map(x=>x*255),256);
 const output=[];
 for(const {data,info}of images){
  for(let i=0;i<data.length;i+=4){
   if(data[i+3]<16)continue;
   const color=rgbToHsv(data[i],data[i+1],data[i+2]);
   if(color.h<215||color.h>270||color.s<.2||color.v<.16||color.v>.92)continue;
   const [r,g,b]=hsvToRgb(hueLut[Math.min(359,Math.floor(color.h))],satLut[Math.min(255,Math.round(color.s*255))]/255,color.v);
   data[i]=r;data[i+1]=g;data[i+2]=b;
  }
  output.push(await sharp(data,{raw:info}).png().toBuffer());
 }
 return {frames:output,report:{reference:{medianHue:target.medianHue,medianSaturation:target.medianSaturation},source,frames:frames.length}};
}
module.exports={normalizeFrames};
