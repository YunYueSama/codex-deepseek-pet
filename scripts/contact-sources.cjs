'use strict';
const sharp=require('sharp'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const dir=path.join(__dirname,'../design/sources/hq-v4'),out=path.join(__dirname,'../artifacts');
 const groups=process.argv.slice(2);for(const group of groups){
  const files=fs.readdirSync(dir).filter(f=>f.startsWith(group+'-')&&f.endsWith('-magenta.png')).sort();
  const tiles=[];for(const [i,file]of files.entries())tiles.push({input:await sharp(path.join(dir,file)).resize(512,512,{fit:'contain',background:'#ff00ff'}).png().toBuffer(),left:i%2*512,top:Math.floor(i/2)*512});
  await sharp({create:{width:1024,height:Math.ceil(files.length/2)*512,channels:4,background:'#ff00ff'}}).composite(tiles).png().toFile(path.join(out,`${group}-source-contact.png`));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
