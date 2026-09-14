'use strict';
const sharp=require('sharp'),path=require('node:path');
const root=path.join(__dirname,'..');
(async()=>{
 const refs=[['idle-front',0,2],['motion-turn',4,4],['motion-turn',6,4],['actions',2,4],['actions',4,4],['actions',8,4],['actions',14,4],['motion-basic',24,8]];
 const tiles=[];for(const [i,[name,frame,columns]]of refs.entries()){
  tiles.push({input:await sharp(path.join(root,'assets/whale',name+'.png')).extract({left:frame%columns*512,top:Math.floor(frame/columns)*512,width:512,height:512}).resize(300,300).png().toBuffer(),left:i%4*300,top:Math.floor(i/4)*300});
 }
 await sharp({create:{width:1200,height:600,channels:4,background:'#edf1f8'}}).composite(tiles).png().toFile(path.join(root,'design/character-sheet.png'));
})().catch(e=>{console.error(e);process.exitCode=1;});
