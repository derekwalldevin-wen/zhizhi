// Both strip families are level sets of one invertible coordinate map.
export const defaults = {mode:'curve',width:38,gap:5,angle:-24,bend:24,relief:55,protect:65,px:.5,py:.40,pr:.21,ratio:'4:5'};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const mod=(x,n)=>(x%n+n)%n;
export function coordinates(x,y,p){
 const a=p.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 let u=(x-.5)*c+(y-.5)*s, v=-(x-.5)*s+(y-.5)*c;
 // Triangular shear: determinant 1, so neither family can fold or self-intersect.
 if(p.mode==='curve') u+=p.bend/250*Math.sin(v*4.2);
 // Fan has its virtual vanishing point outside the artwork. Denominator >= .66.
 if(p.mode==='radial') u/=1+(v+.72)*p.bend/130;
 return [u,v];
}
export function ownership(x,y,p){
 const [u,v]=coordinates(x,y,p), pitch=p.width/1000;
 const i=Math.floor(u/pitch),j=Math.floor(v/pitch),fu=mod(u/pitch,1),fv=mod(v/pitch,1);
 const gap=p.gap/200, gapB=.20+gap*.45,hasA=fu>gap&&fu<1-gap,hasB=fv>gapB&&fv<1-gapB;
 let cu=(i+.5)*pitch,cv=(j+.5)*pitch;
 if(p.mode==='curve')cu-=p.bend/250*Math.sin(cv*4.2);
 if(p.mode==='radial')cu*=1+(cv+.72)*p.bend/130;
 const theta=p.angle*Math.PI/180,cx=cu*Math.cos(theta)-cv*Math.sin(theta)+.5,cy=cu*Math.sin(theta)+cv*Math.cos(theta)+.5;
 const dist=Math.hypot((cx-p.px)/(p.pr*.8),(cy-p.py)/p.pr);
 // A satin-like float through the protected ellipse, still interrupted by B every fifth crossing.
 const protectedCell=dist < p.protect/100 && p.protect>0;
 const aTop=protectedCell ? mod(i+j,5)!==0 : mod(i+j,2)===0;
 return {i,j,fu,fv,gap,gapB,hasA,hasB,aTop,source:hasA&&(!hasB||aTop)?0:hasB?1:-1};
}
export function render(a,b,w,h,p){
 const out=new Uint8ClampedArray(w*h*4), min=Math.min(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4,o=ownership(x/w,y/h,p),src=o.source===0?a:b;
  let shade=1;
  if(o.source>=0){
   const f=o.source===0?o.fu:o.fv;
   const ownGap=o.source===0?o.gap:o.gapB, otherGap=o.source===0?o.gapB:o.gap;
   const edge=Math.min(f-ownGap,1-ownGap-f)*p.width*min/1000;
   const top=o.hasA&&o.hasB&&(o.source===0?o.aTop:!o.aTop);
   const cross=o.source===0?o.fv:o.fu;
   const contact=Math.min(Math.abs(cross-otherGap),Math.abs(1-otherGap-cross))*p.width*min/1000;
   shade-=p.relief/100*(.19*Math.exp(-edge/1.1)+(!top?.34*Math.exp(-contact/2.5):0));
   shade+=p.relief/100*.08*Math.exp(-Math.max(0,(f-ownGap)*p.width*min/1000)/.65);
  }
  const grain=((Math.imul(x+1,374761393)^Math.imul(y+1,668265263))>>>16)%13-6;
  for(let c=0;c<3;c++)out[k+c]=o.source<0?[232,225,211][c]+grain*.4:clamp(src[k+c]*shade+grain*.26,0,255);
  out[k+3]=255;
 }
 return out;
}
export function analyze(data,w,h){
 let xx=0,xy=0,yy=0,total=0,cx=0,cy=0,sum=0,sum2=0;
 const gray=(x,y)=>{let k=(y*w+x)*4;return data[k]*.2126+data[k+1]*.7152+data[k+2]*.0722;};
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const gx=gray(x+1,y)-gray(x-1,y),gy=gray(x,y+1)-gray(x,y-1),e=Math.hypot(gx,gy),g=gray(x,y);
  xx+=gx*gx;xy+=gx*gy;yy+=gy*gy;total+=e;cx+=x*e;cy+=y*e;sum+=g;sum2+=g*g;
 }
 const n=(w-2)*(h-2),contrast=Math.sqrt(Math.max(0,sum2/n-(sum/n)**2));
 return {angle:clamp(Math.round(Math.atan2(2*xy,xx-yy)*90/Math.PI),-60,60),px:total?clamp(cx/total/w,.2,.8):.5,py:total?clamp(cy/total/h,.2,.8):.5,width:contrast<30?52:38,contrast:Math.round(contrast),confidence:Math.hypot(xx-yy,2*xy)/(xx+yy||1)};
}
