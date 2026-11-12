// 特效圖片(貼在模型上的 PNG / GIF / WebP)— 管理頁與客戶頁共用
(function(){
const s=document.createElement('style');
s.textContent=`
.fxs{width:0;height:0;pointer-events:none}
.fxa{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}
.fxa img{position:absolute;left:0;top:0;max-width:none;height:auto;pointer-events:none;width:calc(var(--w,120) * var(--k,1) * 1px);transform:translate(-50%,-50%) rotate(var(--rot,0deg));opacity:var(--op,1)}
.an-flash{animation:fxflash 1.2s infinite}
.an-float{animation:fxfloat 2.4s ease-in-out infinite}
.an-pulse{animation:fxpulse 1.4s ease-in-out infinite}
.an-spin{animation:fxspin 4s linear infinite}
@keyframes fxflash{0%,100%{opacity:1}10%{opacity:.15}20%{opacity:1}30%{opacity:.4}40%,90%{opacity:1}}
@keyframes fxfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes fxpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes fxspin{to{transform:rotate(360deg)}}`;
document.head.appendChild(s);
window.FX={
  init(mv){
    mv.style.setProperty('--min-hotspot-opacity','1');
    mv.addEventListener('load',()=>setTimeout(()=>{mv._r0=mv.getCameraOrbit().radius;FX.k(mv)},200));
    mv.addEventListener('camera-change',()=>FX.k(mv));
  },
  k(mv){
    if(!mv._r0)return;const r=mv.getCameraOrbit().radius;
    if(r>0)mv.style.setProperty('--k',(mv._r0/r).toFixed(4));
  },
  render(mv,list,url){
    mv.querySelectorAll('.fxs').forEach(e=>e.remove());
    (list||[]).forEach(p=>{
      const d=document.createElement('div');d.className='fxs';d.slot='hotspot-fx'+p.id;
      d.dataset.position=p.x+' '+p.y+' '+p.z;d.dataset.normal='0 1 0';d.dataset.rot=p.r||0;
      d.style.setProperty('--w',p.w);d.style.setProperty('--op',(p.o||100)/100);d.style.setProperty('--rot',(p.r||0)+'deg');
      const a=document.createElement('span');a.className='fxa'+(p.an&&p.an!=='none'?' an-'+p.an:'');
      const im=document.createElement('img');im.crossOrigin='anonymous';im.src=url(p);
      a.appendChild(im);d.appendChild(a);mv.appendChild(d);
    });
    FX.k(mv);
  }
};
})();
