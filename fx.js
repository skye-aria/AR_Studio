// 特效圖片:用 3D 位置投影到畫面,可放在模型前面或後面。管理頁與客戶頁共用
(function(){
const css=document.createElement('style');
css.textContent=`
.lay{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.fxi{position:absolute;left:0;top:0;width:0;height:0;will-change:transform}
.fxa{position:absolute;left:0;top:0;width:0;height:0}
.fxa img{position:absolute;left:0;top:0;max-width:none;height:auto;pointer-events:none;user-select:none;-webkit-user-drag:none;transform:translate(-50%,-50%) rotate(var(--rot,0deg));opacity:var(--op,1)}
.lay.edit .fxa img{pointer-events:auto;cursor:grab;touch-action:none}
.fxh{position:absolute;left:0;top:0;width:30px;height:30px;border-radius:50%;background:#818cf8;border:3px solid #fff;box-shadow:0 0 0 2px #0006;pointer-events:none;z-index:1000}
.lay.edit .fxh{pointer-events:auto;touch-action:none;cursor:grab}
.fxi.sel .fxa img{outline:2px dashed #818cf8;outline-offset:2px}
.an-flash{animation:fxflash 1.2s infinite}
.an-float{animation:fxfloat 2.4s ease-in-out infinite}
.an-pulse{animation:fxpulse 1.4s ease-in-out infinite}
.an-spin{animation:fxspin 4s linear infinite}.an-sway{animation:fxsway 2s ease-in-out infinite}
.an-bounce{animation:fxbounce 1.1s ease-in-out infinite}
.an-heartbeat{animation:fxbeat 1.3s infinite}
.an-fade{animation:fxfade 2.4s ease-in-out infinite}
.an-shake{animation:fxshake .4s linear infinite}
.an-orbit{animation:fxorbit 3.5s linear infinite}
.an-twinkle{animation:fxtwinkle 1.6s ease-in-out infinite}
.an-twkop{animation:fxtwkop 1.6s ease-in-out infinite}
@keyframes fxflash{0%,100%{opacity:1}10%{opacity:.15}20%{opacity:1}30%{opacity:.4}40%,90%{opacity:1}}
@keyframes fxfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes fxpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes fxspin{to{transform:rotate(360deg)}}
@keyframes fxsway{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
@keyframes fxbounce{0%,100%{transform:translateY(0)}45%{transform:translateY(-28px)}}
@keyframes fxbeat{0%,40%,100%{transform:scale(1)}10%{transform:scale(1.22)}20%{transform:scale(1.02)}30%{transform:scale(1.16)}}
@keyframes fxfade{0%,100%{opacity:.15}50%{opacity:1}}
@keyframes fxshake{0%,100%{transform:translate(0,0)}20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,-2px)}80%{transform:translate(3px,2px)}}
@keyframes fxorbit{from{transform:rotate(0deg) translateX(20px) rotate(0deg)}to{transform:rotate(360deg) translateX(20px) rotate(-360deg)}}
@keyframes fxtwinkle{0%,100%{transform:scale(.85) rotate(0deg);opacity:.5}50%{transform:scale(1.15) rotate(12deg);opacity:1}}
@keyframes fxtwkop{0%,100%{opacity:.5}50%{opacity:1}}`;
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
    if(C.o.edit){
      const h=document.createElement('div');h.className='fxh';h.style.display='none';C.handle=h;front.appendChild(h);
      h.addEventListener('pointerdown',e=>{e.preventDefault();h.setPointerCapture(e.pointerId);h._drag=true});
      h.addEventListener('pointermove',e=>{
        if(!h._drag)return;const p=C.list.find(q=>q.id===C.sel),d=p&&C.els[p.id];
        if(p&&d)dragTo(p,d,e);
      });
      const hend=()=>{h._drag=false};h.addEventListener('pointerup',hend);h.addEventListener('pointercancel',hend);
    }
    mv.addEventListener('load',()=>{
      let last=-1,ok=0,tries=0;
      const iv=setInterval(()=>{
        const r=mv.getCameraOrbit().radius;tries++;
        ok=Math.abs(r-last)<1e-4?ok+1:0;last=r;
        if(ok>=2||tries>25){C.r0=r;if(!C.tf0)C.tf0=Math.tan(mv.getFieldOfView()*Math.PI/360);clearInterval(iv)}
      },120);
    });
    requestAnimationFrame(loop);
  },
  r0(){return C&&C.r0},
  set(list,url){
    C.list=list||[];C.url=url;C.back.innerHTML='';C.front.innerHTML='';C.els={};
    if(C.handle)C.front.appendChild(C.handle);
    C.list.forEach(build);
  },
  pause(b){if(C)C.paused=!!b},
  select(id){C.sel=id;C.list.forEach(touch)},
  touch(p){touch(p)}
};

function dragTo(p,d,e){
  if(!C.cam||!d._zc)return;
  const rc=C.mv.getBoundingClientRect(),sc=C.o.getScale?C.o.getScale():1;
  const P=FX.unproject(C.cam,e.clientX-rc.left,e.clientY-rc.top,d._zc);
  p.x=+(P.x/sc).toFixed(4);p.y=+(P.y/sc).toFixed(4);p.z=+(P.z/sc).toFixed(4);
}
function build(p){
  const d=document.createElement('div');d.className='fxi';
  const a=document.createElement('span');a.className='fxa';
  const im=document.createElement('img');im.crossOrigin='anonymous';im.src=C.url(p);im.draggable=false;
  a.appendChild(im);d.appendChild(a);C.els[p.id]=d;
  im.addEventListener('pointerdown',e=>{
    if(!C.o.edit)return;e.preventDefault();im.setPointerCapture(e.pointerId);d._drag=true;
    C.o.onSelect&&C.o.onSelect(p.id);
  });
  im.addEventListener('pointermove',e=>{if(d._drag)dragTo(p,d,e)});
  const end=()=>{d._drag=false};
  im.addEventListener('pointerup',end);im.addEventListener('pointercancel',end);
  touch(p);
}
function zOf(p){return typeof p.lz==='number'?p.lz:(p.l==='b'?-1:1)}
FX.zOf=zOf;
function touch(p){
  const d=C.els[p.id];if(!d)return;
  d.dataset.rot=p.r||0;
  d.style.setProperty('--rot',(p.r||0)+'deg');d.style.setProperty('--op',(p.o||100)/100);
  const plane=p.m==='p';
  let cls='';
  if(p.an&&p.an!=='none')cls=plane?({flash:'an-flash',fade:'an-fade',twinkle:'an-twkop'})[p.an]||'':'an-'+p.an;
  d.firstChild.className='fxa'+(cls?' '+cls:'');
  d.classList.toggle('sel',p.id===C.sel);
  const z=zOf(p),lay=z<0?C.back:C.front;
  d.style.zIndex=z+10;
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
  if(C.paused)return;
  const mv=C.mv;
  if(!C.list.length||mv.style.display==='none'||!mv.getCameraOrbit)return;
  const W=mv.clientWidth,H=mv.clientHeight;if(!W||!H)return;
  const o=mv.getCameraOrbit(),t=mv.getCameraTarget(),fov=mv.getFieldOfView();
  const c=C.cam=FX.cam(o,t,fov,W,H),sc=C.o.getScale?C.o.getScale():1,T=performance.now()/1000;
  const dm=mv.getDimensions?mv.getDimensions():null,U=(dm&&Math.max(dm.x,dm.y,dm.z)>0)?Math.max(dm.x,dm.y,dm.z)*1.3:(C.r0||o.radius);
  const T0=Math.tan(22.5*Math.PI/180);
  let hs=null;
  C.list.forEach(p=>{
    const d=C.els[p.id];if(!d)return;
    const im=d.querySelector('img'),ctr=FX.project(c,{x:p.x*sc,y:p.y*sc,z:p.z*sc});
    if(!(ctr.zc>0.001)){d.style.display='none';return}
    d._zc=ctr.zc;
    if(p.id===C.sel&&zOf(p)<0)hs=[ctr.x,ctr.y];
    if(p.m==='p'){
      const asp=(im.naturalWidth&&im.naturalHeight)?im.naturalHeight/im.naturalWidth:1;
      const ww=p.w*(2*T0*U/800);let hw=ww/2,hh=hw*asp,ry=p.ry||0,rollDeg=p.r||0,k=1,dx=0,dy=0;
      const A=p.an,tau=2*Math.PI;
      if(A==='float')dy=Math.sin(T*tau/2.4)*ww*0.08;
      else if(A==='pulse')k=1+0.09*(1-Math.cos(T*tau/1.4));
      else if(A==='spin')ry+=(T*90)%360;
      else if(A==='sway')rollDeg+=Math.sin(T*tau/2)*12;
      else if(A==='bounce')dy=Math.abs(Math.sin(Math.PI*T/1.1))*ww*0.2;
      else if(A==='heartbeat'){const u=(T%1.3)/1.3,g=cc=>Math.exp(-((u-cc)*(u-cc))/(2*0.03*0.03));k=1+0.22*Math.max(g(0.1),0.75*g(0.3))}
      else if(A==='shake'){dx=(Math.sin(T*60)+Math.sin(T*47))*0.5*ww*0.03;dy=(Math.sin(T*53)+Math.sin(T*41))*0.5*ww*0.03}
      else if(A==='orbit'){const ph=T*tau/3.5;dx=Math.cos(ph)*ww*0.15;dy=Math.sin(ph)*ww*0.15}
      else if(A==='twinkle'){k=1+0.15*Math.sin(T*tau/1.6);rollDeg+=Math.sin(T*tau/1.6)*12}
      hw*=k;hh*=k;
      const R=ry*Math.PI/180,ax0={x:Math.cos(R),z:-Math.sin(R)},rr=rollDeg*Math.PI/180,ca=Math.cos(rr),sa=Math.sin(rr);
      const ax={x:ax0.x*ca,y:sa,z:ax0.z*ca},ay={x:-ax0.x*sa,y:ca,z:-ax0.z*sa};
      const cx=p.x*sc+ax.x*dx+ay.x*dy,cy=p.y*sc+ax.y*dx+ay.y*dy,cz=p.z*sc+ax.z*dx+ay.z*dy;
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
      im.style.width=(p.w*(H/800)*U*(T0/c.tf)/ctr.zc).toFixed(1)+'px';
    }
  });
  if(C.handle){
    if(hs){C.handle.style.display='block';C.handle.style.transform='translate('+hs[0].toFixed(1)+'px,'+hs[1].toFixed(1)+'px) translate(-50%,-50%)'}
    else C.handle.style.display='none';
  }
}
})();