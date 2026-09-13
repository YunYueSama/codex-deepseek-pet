'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.join(__dirname,'..'),source=path.join(root,'node_modules/@fontsource/noto-serif-sc');
const dest=path.join(root,'assets/fonts');fs.mkdirSync(dest,{recursive:true});
// 使用上游已按 Unicode 分段的 WOFF2，保留 OFL；本地发布，不请求字体 CDN。
let css=fs.readFileSync(path.join(source,'400.css'),'utf8');
css=css.replace(/src: url\(\.\/files\/([^)]*\.woff2)\)[^;]*;/g,(_match,file)=>{
 const bytes=fs.readFileSync(path.join(source,'files',file));
 const name=`noto-serif-sc-${crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12)}.woff2`;
 fs.writeFileSync(path.join(dest,name),bytes);return `src: url('../../assets/fonts/${name}') format('woff2');`;
});
fs.writeFileSync(path.join(root,'src/renderer/fonts.css'),css);
fs.copyFileSync(path.join(source,'LICENSE'),path.join(dest,'OFL.txt'));
console.log('Local Noto Serif SC subsets prepared.');
