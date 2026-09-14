'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path');
const r=spawnSync(require('electron'),[path.join(__dirname,'bake-rig-entry.cjs')],{windowsHide:true,stdio:'inherit',timeout:90000});
if(r.error)console.error(r.error);process.exitCode=r.status===0?0:1;
