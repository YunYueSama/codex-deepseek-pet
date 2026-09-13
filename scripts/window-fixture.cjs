'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',process.argv[2]);
app.whenReady().then(()=>{const bounds=JSON.parse(process.argv[3]);const win=new BrowserWindow({...bounds,show:false,webPreferences:{sandbox:true}});
win.loadURL('data:text/html,<body style="background:%23eef1f8;font-family:serif"><h2>Window edge test</h2></body>');win.once('ready-to-show',()=>{win.showInactive();console.log(JSON.stringify({ready:true,pid:process.pid}));});
let last='';setInterval(()=>{try{const text=fs.readFileSync(path.join(app.getPath('userData'),'move.json'),'utf8');if(text!==last){win.setBounds(JSON.parse(text));last=text;console.log(JSON.stringify({moved:win.getBounds()}));}}catch{}},100);
setTimeout(()=>app.exit(),45000);
});
