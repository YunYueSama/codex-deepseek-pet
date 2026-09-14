'use strict';
const api=window.petApi,canvas=document.querySelector('#pet'),ctx=canvas.getContext('2d');
const bubble=document.querySelector('#bubble'),motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let state={action:'idle',started:Date.now(),until:0,message:''},settings={},pointer=null,down=null,clickTimer=null;
let lastHit=false,lastClick=0,lastFrameAt=0,lastDraw='',nextFrameAt=0;
let kinetics={vx:0,vy:0},kineticsAt=0,sway=0,stretch=0;
const images={},masks={};let assetsReady=false,lastPose=null;
let poseKey='',transitionFrom=null,transitionAt=0;
const rig=PetRig.create(ctx,images,masks);
// 直接按显示尺寸与屏幕 DPI 绘制，避免固定 600px 画布再次被浏览器缩放。
function resizeCanvas(){
 const width=300*(settings.scale??1),pixels=Math.max(1,Math.round(width*devicePixelRatio));
 canvas.style.width=`${width}px`;canvas.style.height=`${width}px`;canvas.style.bottom=`${width*8/300}px`;
 if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels;}
 ctx.setTransform(pixels/600,0,0,pixels/600,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';lastDraw='';
}
window.addEventListener('resize',resizeCanvas);
async function loadAssets(){for(const name of PetRig.names)await new Promise((resolve,reject)=>{
 const img=new Image();images[name]=img;img.onload=()=>{
  try{
  const surface=document.createElement('canvas');surface.width=img.width;surface.height=img.height;
  const pixels=surface.getContext('2d',{willReadFrequently:true});pixels.drawImage(img,0,0);
  // 命中只需要是否超过阈值，以位图保存；逐条带读取，避免整张 RGBA 拷贝的内存峰值。
  const alpha=new Uint8Array(Math.ceil(img.width*img.height/8));
  for(let y=0;y<img.height;y+=64){
   const rgba=pixels.getImageData(0,y,img.width,Math.min(64,img.height-y)).data;
   for(let i=0;i<rgba.length/4;i++){const bit=y*img.width+i;if(rgba[i*4+3]>40)alpha[bit>>3]|=1<<(bit&7);}
  }
  masks[name]=alpha;surface.width=surface.height=1;resolve();
  }catch(error){reject(error);}
 };img.onerror=reject;img.src=`../../assets/whale/rig/${name}.png`;
});}
loadAssets().then(()=>{assetsReady=true;}).catch(()=>{bubble.textContent='角色素材暂时无法加载，可从托盘打开设置。';bubble.classList.add('visible');});
function paint(p){rig.render(p);}
function draw(now){
 requestAnimationFrame(draw);
 const reduced=settings.reducedMotion||motionPreference.matches;
 if(document.hidden||!assetsReady){nextFrameAt=now;return;}
 if(now<nextFrameAt-1)return;
 const interval=reduced?250:1000/60;
 nextFrameAt+=interval;if(nextFrameAt<now-interval)nextFrameAt=now+interval;
 const dt=Math.min(.1,(now-lastFrameAt)/1000);lastFrameAt=now;
 let pose=PetMotion.sample(state.action,Date.now()-state.started,reduced);
 const identity=`${state.action}:${pose.action}`;
 if(identity!==poseKey){poseKey=identity;transitionFrom=lastPose;transitionAt=now;}
 // 鼠标抓取点带动身体，惯性用阻尼追随；释放后缓慢回正，不直接跳回零角度。
 const dragging=state.action==='drag',follow=1-Math.exp(-12*dt);
 if(now-kineticsAt>140)kinetics={vx:0,vy:0};
 sway+=((dragging?-kinetics.vx/4000:0)-sway)*follow;
 stretch+=((dragging?.045+Math.abs(kinetics.vy)/16000:0)-stretch)*follow;
 if(!reduced){pose.rotation+=sway;pose.scaleY+=stretch;pose.scaleX-=stretch*.5;}
 if(!reduced)pose=PetMotion.transition(transitionFrom,pose,now-transitionAt);
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
 // 分层骨架命中与可见部位采用同一组矩阵，不再假定整张角色矩形。
 const opaque=rig.hit(x,y);
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
