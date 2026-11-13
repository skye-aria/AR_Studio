// 特效圖片:用 3D 位置投影到畫面,可放在模型前面或後面。管理頁與客戶頁共用
(function(){
const css=document.createElement('style');
css.textContent=`
.lay{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.fxi{position:absolute;left:0;top:0;width:0;height:0;will-change:transform}
.fxa{position:absolute;left:0;top:0;width:0;height:0}
.fxa img{position:absolute;left:0;top:0;max-width:none;height:auto;pointer-events:none;user-select:none;-webkit-user-drag:none;transform:translate(-50%,-50%) rotate(var(--rot,0deg));opacity:var(--op,1)}
.lay.edit .fxa img{pointer-events:auto;cursor:grab;touch-action:none}
.fxi.sel .fxa img{outline:2px dashed #818cf8;outline-offset:2px}
.an-flash{animation:fxflash 1.2s infinite}
.an-float{animation:fxfloat 2.4s ease-in-out infinite}
.an-pulse{animation:fxpulse 1.4s ease-in-out infinite}
.an-spin{animation:fxspin 4s linear infinite}
@keyframes fxflash{0%,100%{opacity:1}10%{opacity:.15}20%{opacity:1}30%{opacity:.4}40%,90%{opacity:1}}
@keyframes fxfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes fxpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes fxspin{to{transform:rotate(360deg)}}`;
document.head.appendChild(css);

const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const nrm=a=>{const l=Math.hypot(a.x,a.y,a.z)||1;return{x:a.x/l,y:a.y/l,z:a.z/l}};
let C=null;

const FX=window.FX={
  // 相機:o={theta,phi,radius}(弧度), t=目標點, fov=垂直視角(度)
  cam(o,t,fov,W,H){
    const s=Math.sin(o.phi);
    const pos={x:t.x+o.radius*s*Math.sin(o.theta),y:t.y+o.radius*Math.cos(o.phi),z:t.z+o.radius*s*Math.cos(o.theta)};
    const f=nrm(sub(t,pos)),r=nrm({x:-f.z,y:0,z:f.x});
    const u={x:r.y*f.z-r.z*f.y,y:r.z*f.x-r.x*f.z,z:r.x*f.y-r.y*f.x};
    return{pos,f,r,u,tf:Math.tan(fov*Math.PI/360),W,H};
  },
  project(c,P){
    const v=sub(P,c.pos),zc=dot(v,c.f);
    return{zc,x:(dot(v,c.r)/(zc*c.tf*(c.W/c.H))+1)/2*c.W,y:(1-dot(v,c.u)/(zc*c.tf))/2*c.H};
  },
  unproject(c,sx,sy,zc){
    const nx=sx/c.W*2-1,ny=1-sy/c.H*2,xc=nx*zc*c.tf*(c.W/c.H),yc=ny*zc*c.tf;
    return{x:c.pos.x+c.f.x*zc+c.r.x*xc+c.u.x*yc,y:c.pos.y+c.f.y*zc+c.r.y*xc+c.u.y*yc,z:c.pos.z+c.f.z*zc+c.r.z*xc+c.u.z*yc};
  },
  init(mv,back,front,o){
    C={mv,back,front,o:o||{},list:[],els:{},sel:null,r0:0,cam:null};
    if(C.o.edit){back.classList.add('edit');front.classList.add('edit')}
    mv.addEventListener('load',()=>setTimeout(()=>{C.r0=mv.getCameraOrbit().radius},250));
    requestAnimationFrame(loop);
  },
  r0(){return C&&C.r0},
  set(list,url){
    C.list=list||[];C.url=url;C.back.innerHTML='';C.front.innerHTML='';C.els={};
    C.list.forEach(build);
  },
  select(id){C.sel=id;C.list.forEach(touch)},
  touch(p){touch(p)}
};

function build(p){
  const d=document.createElement('div');d.className='fxi';
  const a=document.createElement('span');a.className='fxa';
  const im=document.createElement('img');im.crossOrigin='anonymous';im.src=C.url(p);im.draggable=false;
  a.appendChild(im);d.appendChild(a);C.els[p.id]=d;
  im.addEventListener('pointerdown',e=>{
    if(!C.o.edit)return;e.preventDefault();im.setPointerCapture(e.pointerId);d._drag=true;
    C.o.onSelect&&C.o.onSelect(p.id);
  });
  im.addEventListener('pointermove',e=>{
    if(!d._drag||!C.cam||!d._zc)return;
    const rc=C.mv.getBoundingClientRect(),sc=C.o.getScale?C.o.getScale():1;
    const P=FX.unproject(C.cam,e.clientX-rc.left,e.clientY-rc.top,d._zc);
    p.x=+(P.x/sc).toFixed(4);p.y=+(P.y/sc).toFixed(4);p.z=+(P.z/sc).toFixed(4);
  });
  const end=()=>{d._drag=false};
  im.addEventListener('pointerup',end);im.addEventListener('pointercancel',end);
  touch(p);
}
function touch(p){
  const d=C.els[p.id];if(!d)return;
  d.dataset.rot=p.r||0;
  d.style.setProperty('--rot',(p.r||0)+'deg');d.style.setProperty('--op',(p.o||100)/100);
  const plane=p.m==='p';
  d.firstChild.className='fxa'+(p.an==='flash'||(!plane&&p.an&&p.an!=='none')?' an-'+p.an:'');
  d.classList.toggle('sel',p.id===C.sel);
  const lay=(p.l==='b'&&p.id!==C.sel)?C.back:C.front;
  if(d.parentNode!==lay&&!d._drag)lay.appendChild(d);
}
// 4 點對應 → 透視變換係數
function homog(src,dst){
  const A=[],b=[];
  for(let i=0;i<4;i++){
    const x=src[i][0],y=src[i][1],X=dst[i][0],Y=dst[i][1];
    A.push([x,y,1,0,0,0,-x*X,-y*X]);b.push(X);
    A.push([0,0,0,x,y,1,-x*Y,-y*Y]);b.push(Y);
  }
  const n=8;
  for(let i=0;i<n;i++){
    let m=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;
    [A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];
    const pv=A[i][i];if(Math.abs(pv)<1e-12)return null;
    for(let r=i+1;r<n;r++){const k=A[r][i]/pv;for(let j=i;j<n;j++)A[r][j]-=k*A[i][j];b[r]-=k*b[i]}
  }
  const h=new Array(n);
  for(let i=n-1;i>=0;i--){let s=b[i];for(let j=i+1;j<n;j++)s-=A[i][j]*h[j];h[i]=s/A[i][i]}
  return h;
}
FX.homog=homog;
// 拍照用:把圖片以透視變形畫到 canvas(分格三角形近似)
FX.drawPlane=function(g,im,H,wi,hi,dpr,n){
  n=n||8;
  const map=(x,y)=>{const w=H[6]*x+H[7]*y+1;return[(H[0]*x+H[1]*y+H[2])/w*dpr,(H[3]*x+H[4]*y+H[5])/w*dpr]};
  const sw=im.naturalWidth,sh=im.naturalHeight;
  const tri=(a,b,c)=>{
    const s=[a,b,c].map(q=>[q[0]*sw,q[1]*sh]),d=[a,b,c].map(q=>map(q[0]*wi,q[1]*hi));
    const x0=s[0][0],y0=s[0][1],x1=s[1][0],y1=s[1][1],x2=s[2][0],y2=s[2][1];
    const u0=d[0][0],v0=d[0][1],u1=d[1][0],v1=d[1][1],u2=d[2][0],v2=d[2][1];
    const det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(!det)return;
    const A=(u0*(y1-y2)+u1*(y2-y0)+u2*(y0-y1))/det,Cc=(x0*(u1-u2)+x1*(u2-u0)+x2*(u0-u1))/det,E=(x0*(y1*u2-y2*u1)+x1*(y2*u0-y0*u2)+x2*(y0*u1-y1*u0))/det;
    const B=(v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/det,D=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/det,F=(x0*(y1*v2-y2*v1)+x1*(y2*v0-y0*v2)+x2*(y0*v1-y1*v0))/det;
    const cx=(u0+u1+u2)/3,cy=(v0+v1+v2)/3,ex=p=>{const dx=p[0]-cx,dy=p[1]-cy,l=Math.hypot(dx,dy)||1;return[p[0]+dx/l*0.7,p[1]+dy/l*0.7]};
    const e=d.map(ex);
    g.save();g.beginPath();g.moveTo(e[0][0],e[0][1]);g.lineTo(e[1][0],e[1][1]);g.lineTo(e[2][0],e[2][1]);g.closePath();g.clip();
    g.setTransform(A,B,Cc,D,E,F);g.drawImage(im,0,0);g.restore();
  };
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    const a=i/n,b=(i+1)/n,c=j/n,e=(j+1)/n;
    tri([a,c],[b,c],[b,e]);tri([a,c],[b,e],[a,e]);
  }
};

function loop(){
  requestAnimationFrame(loop);
  const mv=C.mv;
  if(!C.list.length||mv.style.display==='none'||!mv.getCameraOrbit)return;
  const W=mv.clientWidth,H=mv.clientHeight;if(!W||!H)return;
  const o=mv.getCameraOrbit(),t=mv.getCameraTarget(),fov=mv.getFieldOfView();
  const c=C.cam=FX.cam(o,t,fov,W,H),sc=C.o.getScale?C.o.getScale():1,r0=C.r0||o.radius,T=performance.now()/1000;
  C.list.forEach(p=>{
    const d=C.els[p.id];if(!d)return;
    const im=d.querySelector('img'),ctr=FX.project(c,{x:p.x*sc,y:p.y*sc,z:p.z*sc});
    if(!(ctr.zc>0.001)){d.style.display='none';return}
    d._zc=ctr.zc;
    if(p.m==='p'){
      const asp=(im.naturalWidth&&im.naturalHeight)?im.naturalHeight/im.naturalWidth:1;
      const ww=p.w*(2*c.tf*r0/800);let hw=ww/2,hh=hw*asp,cy=p.y*sc,ry=p.ry||0;
      if(p.an==='float')cy+=Math.sin(T*2*Math.PI/2.4)*ww*0.08;
      if(p.an==='pulse'){const k=1+0.09*(1-Math.cos(T*2*Math.PI/1.4));hw*=k;hh*=k}
      if(p.an==='spin')ry+=(T*90)%360;
      const R=ry*Math.PI/180,ax0={x:Math.cos(R),z:-Math.sin(R)},rr=(p.r||0)*Math.PI/180,ca=Math.cos(rr),sa=Math.sin(rr);
      const ax={x:ax0.x*ca,y:sa,z:ax0.z*ca},ay={x:-ax0.x*sa,y:ca,z:-ax0.z*sa};
      const cx=p.x*sc,cz=p.z*sc;
      const cs=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([sx,sy])=>FX.project(c,{x:cx+ax.x*hw*sx+ay.x*hh*sy,y:cy+ax.y*hw*sx+ay.y*hh*sy,z:cz+ax.z*hw*sx+ay.z*hh*sy}));
      if(cs.some(q=>!(q.zc>0.001))){d.style.display='none';return}
      const quad=cs.map(q=>[q.x,q.y]);
      let area=0;for(let i=0;i<4;i++){const a=quad[i],b=quad[(i+1)%4];area+=a[0]*b[1]-b[0]*a[1]}
      const wi=100,hi=100*asp,Hm=Math.abs(area)>4?homog([[0,0],[wi,0],[wi,hi],[0,hi]],quad):null;
      if(!Hm){d.style.display='none';return}
      d.style.display='';d.style.transform='none';
      im.style.width=wi+'px';im.style.height=hi+'px';im.style.transformOrigin='0 0';
      im.style.transform='matrix3d('+[Hm[0],Hm[3],0,Hm[6],Hm[1],Hm[4],0,Hm[7],0,0,1,0,Hm[2],Hm[5],0,1].join(',')+')';
      d._plane=true;d._H=Hm;d._wi=wi;d._hi=hi;
    }else{
      if(d._plane){d._plane=false;im.style.height='';im.style.transform='';im.style.transformOrigin=''}
      d.style.display='';
      d.style.transform='translate('+ctr.x.toFixed(1)+'px,'+ctr.y.toFixed(1)+'px)';
      im.style.width=(p.w*(H/800)*r0/ctr.zc).toFixed(1)+'px';
    }
  });
}
})();
