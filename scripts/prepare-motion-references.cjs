'use strict';
const sharp=require('sharp'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),out=path.join(root,'artifacts/motion-references');
const groups={walk:['motion-walk',4,0,32],idle:['motion-idle',4,0,16],eat:['motion-basic',8,16,16],wave:['motion-basic',8,32,16],jump:['motion-extra',8,0,16],dance:['motion-extra',8,16,16],sneak:['motion-extra',8,32,16],sleep:['motion-extra',8,48,16],turn:['motion-turn',4,0,8]};
(async()=>{fs.mkdirSync(out,{recursive:true});for(const [name,[atlas,cols,start,count]]of Object.entries(groups)){
 for(let page=0;page<Math.ceil(count/16);page++){const tiles=[];for(let i=0;i<Math.min(16,count-page*16);i++){
  const frame=start+page*16+i,input=await sharp(path.join(root,'assets/whale',atlas+'.png')).extract({left:frame%cols*512,top:Math.floor(frame/cols)*512,width:512,height:512}).png().toBuffer();tiles.push({input,left:i%4*512,top:Math.floor(i/4)*512});
 }await sharp({create:{width:2048,height:Math.ceil(Math.min(16,count-page*16)/4)*512,channels:4,background:'#ff00ff'}}).composite(tiles).png().toFile(path.join(out,`${name}-${page+1}.png`));
 }
}})();
