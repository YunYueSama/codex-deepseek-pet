'use strict';
// 用脸部肤色连通区域作为整体缩放参照，避免蹲姿/侧躺按外接框高度缩小头部。
module.exports=function faceWidth(data,w,h){
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=null;
 const skin=p=>{const i=p*4;return data[i+3]>180&&data[i]>180&&data[i+1]>130&&data[i]>data[i+1]+8&&data[i+1]>data[i+2]+8;};
 for(let p=0;p<w*Math.floor(h*.72);p++)if(!seen[p]&&skin(p)){
  let head=0,tail=0,minX=w,maxX=0,minY=h,maxY=0;queue[tail++]=p;seen[p]=1;
  while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const n of [x?q-1:-1,x<w-1?q+1:-1,y?q-w:-1,y<h-1?q+w:-1])if(n>=0&&!seen[n]&&skin(n)){seen[n]=1;queue[tail++]=n;}
  }if(tail>50&&(!best||tail>best.count))best={count:tail,width:maxX-minX+1};
 }return best?.width||null;
};
