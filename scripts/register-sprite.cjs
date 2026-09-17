'use strict';
const sharp=require('sharp');
// 编译时只重采样一次完整角色；脚底不漂移，运行时不增加图层或纹理。
module.exports=async function registerSprite(input,scale,shiftX=0){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=512,top=512,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]){
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
 }
 const width=Math.round((right-left+1)*scale),height=Math.round((bottom-top+1)*scale);
 const x=Math.round(244+(left-244)*scale+shiftX),y=bottom+1-height;
 if(x<10||y<10||x+width>502||y+height>502)throw Error('整图校准超出安全边距');
 const sprite=await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(width,height,{kernel:'lanczos3'}).png().toBuffer();
 return sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:sprite,left:x,top:y}]).png().toBuffer();
};
