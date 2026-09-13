'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
for(const folder of ['src','scripts']){
 for(const file of fs.readdirSync(path.join(__dirname,'..',folder),{recursive:true})){
  if(!/\.(?:cjs|js|mjs)$/.test(file))continue;
  const result=spawnSync(process.execPath,['--check',path.join(__dirname,'..',folder,file)],{encoding:'utf8'});
  if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}
 }
}
console.log('All JavaScript syntax checks passed.');
