'use strict';
// 整数窗口位移与画布余量共同表示真实路程，防止慢速行走丢失不足一像素的移动。
function advanceWalk(delta,distance,remainder=0){
 const total=Math.min(Math.abs(delta),Math.max(0,distance)+remainder);
 const step=Math.sign(delta)*Math.floor(total),rest=total-Math.abs(step);
 return {step,remainder:rest,offset:Math.sign(delta)*rest};
}
module.exports={advanceWalk};
