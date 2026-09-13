'use strict';
const api=window.petApi,canvas=document.querySelector('#pet'),ctx=canvas.getContext('2d');
const bubble=document.querySelector('#bubble'),motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let state={action:'idle',started:Date.now(),until:0,message:''},settings={},pointer=null,down=null,clickTimer=null;
let lastHit=false,lastClick=0,lastFrameAt=0,lastDraw='',nextFrameAt=0;
let kinetics={vx:0,vy:0},kineticsAt=0,sway=0,stretch=0;
const images={},masks={};let assetsReady=false,lastPose=null;
// 直接按显示尺寸与屏幕 DPI 绘制，避免固定 600px 画布再次被浏览器缩放。
function resizeCanvas(){
 const width=300*(settings.scale??1),pixels=Math.max(1,Math.round(width*devicePixelRatio));
 canvas.style.width=`${width}px`;canvas.style.height=`${width}px`;canvas.style.bottom=`${width*8/300}px`;
 if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels;}
 ctx.setTransform(pixels/600,0,0,pixels/600,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';lastDraw='';
}
window.addEventListener('resize',resizeCanvas);
Promise.all(['actions','expressions','motion-basic','motion-extra','motion-idle','motion-walk'].map(name=>new Promise((resolve,reject)=>{
 const img=new Image();images[name]=img;img.onload=()=>{
  const surface=document.createElement('canvas');surface.width=img.width;surface.height=img.height;
  const pixels=surface.getContext('2d',{willReadFrequently:true});pixels.drawImage(img,0,0);
  const rgba=pixels.getImageData(0,0,img.width,img.height).data,alpha=new Uint8Array(img.width*img.height);
  for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];masks[name]=alpha;resolve();
 };img.onerror=reject;img.src=`../../assets/whale/${name}.png`;
}))).then(()=>{assetsReady=true;}).catch(()=>{bubble.textContent='角色素材暂时无法加载，可从托盘打开设置。';bubble.classList.add('visible');});
function paint(p,alpha=1){
 const img=images[p.atlas],cell=img.width/p.columns;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(300+p.x,560+p.y);ctx.rotate(p.rotation);ctx.scale((p.flip?-1:1)*p.scaleX,p.scaleY);
 const sprite=frame=>ctx.drawImage(img,frame%p.columns*cell,Math.floor(frame/p.columns)*cell,cell,cell,-300,-560,600,600);
 if(p.walking){
  // 稳定头脸与躯干，仅替换裙摆下的步态，避免原画差异造成整个人左右跳形。
  ctx.save();ctx.beginPath();ctx.rect(-300,-560,600,600);ctx.rect(-30,-110,260,150);ctx.clip('evenodd');sprite(0);ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(-30,-110,260,150);ctx.clip();sprite(p.frame);ctx.restore();
 }else sprite(p.frame);
 if(p.blink>0){
  // 只在眼周揭露闭眼原画，身体和头发保持同一张基准图，不做整人叠影。
  ctx.save();ctx.beginPath();ctx.ellipse(77,-305,31,29,0,0,Math.PI*2);ctx.ellipse(142,-307,17,27,0,0,Math.PI*2);ctx.clip();
  ctx.beginPath();ctx.rect(42,-338,121,65*p.blink);ctx.clip();sprite(7);ctx.restore();
 }
 ctx.restore();
}
function draw(now){
 requestAnimationFrame(draw);
 const reduced=settings.reducedMotion||motionPreference.matches;
 if(document.hidden||!assetsReady){nextFrameAt=now;return;}
 if(now<nextFrameAt-1)return;
 const interval=reduced?250:1000/60;
 nextFrameAt+=interval;if(nextFrameAt<now-interval)nextFrameAt=now+interval;
 const dt=Math.min(.1,(now-lastFrameAt)/1000);lastFrameAt=now;
 const pose=PetMotion.sample(state.action,Date.now()-state.started,reduced);
 // 鼠标抓取点带动身体，惯性用阻尼追随；释放后缓慢回正，不直接跳回零角度。
 const dragging=state.action==='drag',follow=1-Math.exp(-12*dt);
 if(now-kineticsAt>140)kinetics={vx:0,vy:0};
 sway+=((dragging?-kinetics.vx/4000:0)-sway)*follow;
 stretch+=((dragging?.045+Math.abs(kinetics.vy)/16000:0)-stretch)*follow;
 if(!reduced){pose.rotation+=sway;pose.scaleY+=stretch;pose.scaleX-=stretch*.5;}
 const key=JSON.stringify(pose);
 if(key!==lastDraw){lastDraw=key;ctx.clearRect(0,0,600,600);
  // 每帧只绘制一个实像；动作过渡不再叠加前后两张角色，以免留下双轮廓残影。
  paint(pose);lastPose=pose;updateHit();
 }
 bubble.classList.toggle('visible',Boolean(state.message)&&Date.now()<state.until);
}
function updateHit(){
 if(!pointer||!assetsReady)return;
 const rect=canvas.getBoundingClientRect(),x=Math.floor((pointer.x-rect.left)/rect.width*600),y=Math.floor((pointer.y-rect.top)/rect.height*600);
 // 从预载 alpha 掩码做逆变换命中，不每帧回读正在绘制的 GPU Canvas。
 let opaque=false;
 if(lastPose){const p=lastPose,dx=x-300-p.x,dy=y-560-p.y,c=Math.cos(p.rotation),s=Math.sin(p.rotation);
  const sx=(c*dx+s*dy)/((p.flip?-1:1)*p.scaleX)+300,sy=(-s*dx+c*dy)/p.scaleY+560;
  if(sx>=0&&sx<600&&sy>=0&&sy<600){const img=images[p.atlas],cell=img.width/p.columns;
   const hitFrame=p.walking&&!(sx>=270&&sx<530&&sy>=450)?0:p.frame;
   const px=hitFrame%p.columns*cell+Math.floor(sx/600*cell),py=Math.floor(hitFrame/p.columns)*cell+Math.floor(sy/600*cell);
   opaque=masks[p.atlas][py*img.width+px]>40;}
 }
 const hit=Boolean(down||opaque);
 if(hit!==lastHit){lastHit=hit;api?.hit(hit);}
}
api?.onHitPoint(p=>{pointer={x:p.localX,y:p.localY};updateHit();});
api?.onKinetics(value=>{kinetics=value;kineticsAt=performance.now();});
api?.onState(value=>{
 state=value;bubble.textContent=value.message;lastDraw='';
});
api?.onSettings(value=>{
 settings=value;lastDraw='';
 resizeCanvas();
 updateHit();
});
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);pointer={x:e.clientX,y:e.clientY};
 down={id:e.pointerId,x:e.screenX,y:e.screenY,moved:false};updateHit();
});
canvas.addEventListener('pointermove',e=>{
 pointer={x:e.clientX,y:e.clientY};updateHit();
 if(!down||down.id!==e.pointerId)return;
 if(!down.moved&&Math.hypot(e.screenX-down.x,e.screenY-down.y)>5){down.moved=true;clearTimeout(clickTimer);api?.drag('start',{x:down.x,y:down.y});}
 if(down.moved)api?.drag('move',{x:e.screenX,y:e.screenY});
});
function release(cancel=false){
 if(!down)return;const moved=down.moved;down=null;
 if(moved)api?.drag('end');
 else if(!cancel){if(Date.now()-lastClick<300){clearTimeout(clickTimer);api?.open();lastClick=0;}
 else{lastClick=Date.now();clickTimer=setTimeout(()=>api?.interact('pet'),310);}}
 updateHit();
}
canvas.addEventListener('pointerup',()=>release());
canvas.addEventListener('pointercancel',()=>release(true));
canvas.addEventListener('lostpointercapture',()=>release(true));
canvas.addEventListener('contextmenu',e=>{e.preventDefault();api?.menu();});
canvas.addEventListener('keydown',e=>{if(['Enter',' ','f','F'].includes(e.key)){e.preventDefault();if(e.key==='Enter')api?.open();else api?.interact(e.key===' '?'pet':'feed');}});
requestAnimationFrame(draw);api?.ready();
