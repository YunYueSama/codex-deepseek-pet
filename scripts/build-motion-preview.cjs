'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path');
const result=spawnSync(require('electron'),[path.join(__dirname,'preview-entry.cjs')],{windowsHide:true,stdio:'inherit',timeout:60000});
if(result.error)console.error(result.error.message);
process.exitCode=result.status===0?0:1;
