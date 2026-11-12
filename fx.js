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
  d.firstChild.className='fxa'+(p.an&&p.an!=='none'?' an-'+p.an:'');
  d.classList.toggle('sel',p.id===C.sel);
  const lay=(p.l==='b'&&p.id!==C.sel)?C.back:C.front;
  if(d.parentNode!==lay&&!d._drag)lay.appendChild(d);
}
function loop(){
  requestAnimationFrame(loop);
  const mv=C.mv;
  if(!C.list.length||mv.style.display==='none'||!mv.getCameraOrbit)return;
  const W=mv.clientWidth,H=mv.clientHeight;if(!W||!H)return;
  const o=mv.getCameraOrbit(),t=mv.getCameraTarget(),fov=mv.getFieldOfView();
  const c=C.cam=FX.cam(o,t,fov,W,H),sc=C.o.getScale?C.o.getScale():1,r0=C.r0||o.radius;
  C.list.forEach(p=>{
    const d=C.els[p.id];if(!d)return;
    const q=FX.project(c,{x:p.x*sc,y:p.y*sc,z:p.z*sc});
    if(!(q.zc>0.001)){d.style.display='none';return}
    d.style.display='';d._zc=q.zc;
    d.style.transform='translate('+q.x.toFixed(1)+'px,'+q.y.toFixed(1)+'px)';
    d.querySelector('img').style.width=(p.w*r0/q.zc).toFixed(1)+'px';
  });
}
})();
