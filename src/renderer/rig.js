/* 连续骨架 + GPU 三角网格蒙皮；所有动作复用新画的分层素材。 */
(function(root){
 'use strict';
 const names=['torso','hair','tail','armL','armR','legL','legR','token','packet',...Array.from({length:6},(_,i)=>`head${i}`),'sideHead0','sideHead1','sideHead2','sideTorso','sideHair','sideArmL','sideArmR','sideLegL','sideLegR'];
 function create(ctx,images,masks){
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true});
  let matrix=[1,0,0,1,0,0],stack=[],hits=[];const textures={};let program,buffer,position,uv,mask;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();setTimeout(()=>location.reload(),500);});
  function shader(kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Rig shader compile failed');return s;}
  if(gl){
   program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'#version 300 es\nin vec2 aPosition;in vec2 aUV;out vec2 vUV;void main(){gl_Position=vec4(aPosition.x/300.0-1.0,1.0-aPosition.y/300.0,0.,1.);vUV=aUV;}'));
   gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision mediump float;uniform sampler2D uTexture;uniform vec4 uMask;in vec2 vUV;out vec4 outColor;void main(){if(uMask.z>0.0){vec2 d=(vUV-uMask.xy)/uMask.zw;if(dot(d,d)>1.0)discard;}outColor=texture(uTexture,vUV);}'));
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Rig shader link failed');
   gl.useProgram(program);buffer=gl.createBuffer();position=gl.getAttribLocation(program,'aPosition');uv=gl.getAttribLocation(program,'aUV');mask=gl.getUniformLocation(program,'uMask');
   gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  }
  function save(){stack.push(matrix.slice());}function restore(){matrix=stack.pop();}
  function translate(x,y){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;}
  function rotate(angle){const c=Math.cos(angle),s=Math.sin(angle),[a,b,d,e]=matrix;matrix[0]=a*c+d*s;matrix[1]=b*c+e*s;matrix[2]=d*c-a*s;matrix[3]=e*c-b*s;}
  function scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;}
  function vertex(x,y,u,v){return [matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5],u,v];}
  function mesh(name,rows,face=false){
   const vertices=[];for(let i=1;i<rows.length;i++){const [a,b]=rows[i-1],[c,d]=rows[i];for(const v of [a,b,c,b,d,c])vertices.push(...vertex(...v));}
   if(!face)hits.push({name,vertices});
   const img=images[name];
   if(gl){
    if(!textures[name]){const t=gl.createTexture();textures[name]=t;gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);}
    else gl.bindTexture(gl.TEXTURE_2D,textures[name]);
    gl.uniform4f(mask,face?.5:0,face?.74:0,face?.28:0,face?.21:0);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STREAM_DRAW);
    gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);gl.drawArrays(gl.TRIANGLES,0,vertices.length/4);
   }else{
    // 无 WebGL 时按同一网格降级绘制，功能可用；性能取决于软件渲染环境。
    for(let i=0;i<vertices.length;i+=12){const p=vertices.slice(i,i+12),x0=p[0],y0=p[1],x1=p[4],y1=p[5],x2=p[8],y2=p[9],u0=p[2]*img.width,v0=p[3]*img.height,u1=p[6]*img.width,v1=p[7]*img.height,u2=p[10]*img.width,v2=p[11]*img.height;
     const den=(u1-u0)*(v2-v0)-(u2-u0)*(v1-v0);if(Math.abs(den)<1e-6)continue;
     const a=((x1-x0)*(v2-v0)-(x2-x0)*(v1-v0))/den,b=((y1-y0)*(v2-v0)-(y2-y0)*(v1-v0))/den,c=((x2-x0)*(u1-u0)-(x1-x0)*(u2-u0))/den,d=((y2-y0)*(u1-u0)-(y1-y0)*(u2-u0))/den;
     ctx.save();ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,x0-a*u0-c*v0,y0-b*u0-d*v0);ctx.drawImage(img,0,0);ctx.restore();
    }
   }
  }
  function sprite(name,x,y,w,h,face=false){mesh(name,[[[x,y,0,0],[x+w,y,1,0]],[[x,y+h,0,1],[x+w,y+h,1,1]]],face);}
  function ribbon(name,x,y,w,h,bend,axis='y'){
   const rows=[],steps=24;
   for(let i=0;i<=steps;i++){const t=i/steps,offset=bend*t*t;
    if(axis==='y')rows.push([[x-w/2+offset,y+t*h,0,t],[x+w/2+offset,y+t*h,1,t]]);
    else rows.push([[x+t*w,y-h/2+offset,t,0],[x+t*w,y+h/2+offset,t,1]]);
   }mesh(name,rows);
  }
  function limb(name,x,y,width,a,b,upper,lower){
   save();translate(x,y);rotate(upper);const rows=[],steps=24,length=a+b;
   for(let i=0;i<=steps;i++){const t=i/steps,along=t*length,beyond=Math.max(0,along-a),blend=Math.max(0,Math.min(1,(along-a+9)/18));
    const angle=lower*blend,cx=-Math.sin(lower)*beyond,cy=Math.min(along,a)+Math.cos(lower)*beyond,wx=Math.cos(angle)*width/2,wy=Math.sin(angle)*width/2;
    rows.push([[cx-wx,cy-wy,0,t],[cx+wx,cy+wy,1,t]]);
   }mesh(name,rows);restore();
  }
  function render(p){
   if(gl){if(canvas.width!==ctx.canvas.width||canvas.height!==ctx.canvas.height){canvas.width=ctx.canvas.width;canvas.height=ctx.canvas.height;}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);}
   hits=[];stack=[];matrix=[1,0,0,1,0,0];translate(300+p.x,558+p.y);rotate(p.rotation);scale((p.flip?-1:1)*p.scaleX,p.scaleY);
   save();translate(64,-110);rotate(p.tail);ribbon('tail',0,0,156,98,p.tail*48,'x');restore();
   const turn=p.turn||0,side=turn>.48,headSide=(p.headTurn||0)>.48;
   const part=name=>side?'side'+name[0].toUpperCase()+name.slice(1):name;
   save();translate(-turn*9,-90);rotate(p.torso*.65);ribbon(part('hair'),0,-285,314,302,p.hair);restore();
   save();rotate(p.hips||0);
   limb(part('legL'),-32+turn*18,-104,43-turn*5,52,52,p.legL,p.kneeL);limb(part('legR'),32-turn*8,-104,43,52,52,p.legR,p.kneeR);restore();
   save();translate(turn*5,-90);rotate(p.torso);
   // 斜侧视远手在身体后面、近手在头前面，遮挡随转身一起变化。
   if(side)limb(part('armL'),-65+turn*22,-153,40,60,55,p.armL,p.elbowL);
   ribbon(part('torso'),0,-180,230,180,p.skirt);
   save();translate((p.headTurn||0)*8,-154+p.headY);rotate(p.head);
   let face=p.expression;if(p.blink>.4&&![1,2].includes(face))face=1;
   if(headSide){const expression=face===1?1:[2,3,5].includes(face)?2:0;sprite(`sideHead${expression}`,-148,-258,296,258);}
   else{sprite('head0',-148,-258,296,258);if(face)sprite(`head${face}`,-148,-258,296,258,true);}
   restore();
   if(!side)limb('armL',-65+turn*22,-153,45,60,55,p.armL,p.elbowL);limb(part('armR'),65-turn*4,-153,45,60,55,p.armR,p.elbowR);
   restore();
   if(p.snack){save();translate(p.snackX,p.snackY);rotate(-.2);sprite('token',-16*p.snackScale,-15*p.snackScale,32*p.snackScale,30*p.snackScale);restore();}
   if(gl)ctx.drawImage(canvas,0,0,600,600);
  }
  function hit(x,y){
   for(let n=hits.length-1;n>=0;n--){const {name,vertices:v}=hits[n],img=images[name];
    for(let i=0;i<v.length;i+=12){const ax=v[i],ay=v[i+1],bx=v[i+4],by=v[i+5],cx=v[i+8],cy=v[i+9],den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-7)continue;
     const a=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/den,b=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/den,c=1-a-b;if(a<0||b<0||c<0)continue;
     const u=a*v[i+2]+b*v[i+6]+c*v[i+10],w=a*v[i+3]+b*v[i+7]+c*v[i+11];
     const px=Math.max(0,Math.min(img.width-1,Math.floor(u*img.width))),py=Math.max(0,Math.min(img.height-1,Math.floor(w*img.height))),bit=py*img.width+px;if(masks[name][bit>>3]&(1<<(bit&7)))return true;
    }
   }return false;
  }
  return {render,hit,backend:gl?'webgl':'canvas'};
 }
 root.PetRig={names,create};
})(globalThis);
