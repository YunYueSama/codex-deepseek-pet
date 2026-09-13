'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const footOffset=({width,height,bodyWidth=width})=>height-bodyWidth*(8/300+1-238/256);
/** 按系统 Z 序扣除被前方窗口遮住的顶边；不读取窗口内容。 */
function platforms(windows,area,size){
 const result=[],occluders=[];
 for(const w of windows){
  if(![w.x,w.y,w.width,w.height].every(Number.isFinite)||w.width<80||w.height<50)continue;
  let spans=[[Math.max(area.x,w.x),Math.min(area.x+area.width,w.x+w.width)]];
  for(const cover of occluders)if(cover.y<=w.y&&cover.y+cover.height>w.y){
   spans=spans.flatMap(([l,r])=>cover.x>=r||cover.x+cover.width<=l?[[l,r]]:[[l,Math.min(r,cover.x)],[Math.max(l,cover.x+cover.width),r]].filter(([a,b])=>b>a));
  }
  if(w.y>=area.y+size.height*.55&&w.y<area.y+area.height-20)for(const [left,right]of spans)if(right-left>size.width*.25)result.push({handle:w.handle,left,right,y:w.y,windowX:w.x});
  occluders.push(w);
 }
 result.push({handle:'floor',left:area.x,right:area.x+area.width,y:area.y+area.height,windowX:area.x});return result;
}
/** 半隐式积分加跨帧扫掠落点，避免高速下落穿过窗口顶边。 */
function advance(body,dt,surfaces,area,size){
 dt=clamp(dt,0,.05);const foot=footOffset(size),oldY=body.y+foot;
 const vy=Math.min(1200,body.vy+1800*dt);let vx=body.vx*Math.exp(-.8*dt),x=body.x+vx*dt,y=body.y+vy*dt;
 const minX=area.x-size.width*.28,maxX=area.x+area.width-size.width*.72;
 if(x<minX||x>maxX){x=clamp(x,minX,maxX);vx*=-.35;}
 const center=x+size.width/2;
 const hit=vy>=0?surfaces.filter(s=>center>=s.left&&center<=s.right&&oldY<=s.y+3&&y+foot>=s.y).sort((a,b)=>a.y-b.y)[0]:null;
 if(hit)return {x,y:hit.y-foot,vx:0,vy:0,landed:hit,impact:vy};
 if(y+foot>area.y+area.height)return {x,y:area.y+area.height-foot,vx:0,vy:0,landed:surfaces.find(s=>s.handle==='floor'),impact:vy};
 return {x,y,vx,vy,landed:null,impact:0};
}
module.exports={footOffset,platforms,advance};
