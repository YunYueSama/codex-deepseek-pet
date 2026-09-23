'use strict';
// README 展示图以唯一设定图为主，右侧只选取运行时真实使用的动作帧。
const sharp=require('sharp'),path=require('node:path');
const root=path.join(__dirname,'..');
const entries=[
 ['idle-front',0,'正面待机'],
 ['dense-walk',0,'走路'],
 ['dense-eat',16,'吃点东西'],
 ['story-hum',8,'偷偷哼歌'],
];
(async()=>{
 const canvasW=1920,canvasH=1160,tiles=[];
 const standard=await sharp(path.join(root,'design/character-standard.png')).resize(1280,854,{fit:'contain',background:'#f5f7fb'}).png().toBuffer();
 tiles.push({input:standard,left:40,top:110});
 for(let i=0;i<entries.length;i++){
  const [atlas,frame,title]=entries[i],source=path.join(root,'assets/whale',`${atlas}.png`),meta=await sharp(source).metadata();
  const columns=atlas==='idle-front'?2:['motion-basic','motion-extra'].includes(atlas)?8:4;
  const cellW=meta.width/columns,cellH=cellW;
  const col=frame%columns,row=Math.floor(frame/columns);
  const frameImage=await sharp(source).extract({left:Math.round(col*cellW),top:Math.round(row*cellH),width:Math.round(cellW),height:Math.round(cellH)}).resize(280,300,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
  const x=1340+(i%2)*280,y=110+Math.floor(i/2)*490;
  const card=Buffer.from(`<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="298" height="448" rx="22" fill="#fff" stroke="#dce4f0" stroke-width="2"/><text x="150" y="420" text-anchor="middle" font-size="21" fill="#344764" font-family="Microsoft YaHei, Noto Sans SC, sans-serif">${title}</text></svg>`);
  tiles.push({input:card,left:x,top:y},{input:frameImage,left:x+10,top:y+24});
 }
 const title=Buffer.from('<svg width="1920" height="90" xmlns="http://www.w3.org/2000/svg"><text x="48" y="58" font-size="34" font-weight="600" fill="#293e65" font-family="Microsoft YaHei, Noto Sans SC, sans-serif">大肥鱼 · 角色标准与动作</text><text x="1872" y="56" text-anchor="end" font-size="18" fill="#74839b" font-family="Microsoft YaHei, Noto Sans SC, sans-serif">造型以左侧六视图为准</text></svg>');
  await sharp({create:{width:canvasW,height:canvasH,channels:4,background:'#f5f7fb'}}).composite([{input:title,left:0,top:0},...tiles]).png().toFile(path.join(root,'design/character-sheet.png'));
})().catch(e=>{console.error(e);process.exitCode=1;});
