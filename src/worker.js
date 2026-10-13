import {render} from './core.js';
self.onmessage=({data:d})=>{try{const pixels=render(d.a,d.b,d.w,d.h,d.p);self.postMessage({id:d.id,w:d.w,h:d.h,pixels},[pixels.buffer]);}catch(e){self.postMessage({id:d.id,error:e.message});}};
