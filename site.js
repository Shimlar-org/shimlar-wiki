
(function(){
 var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
 /* theme */
 var root=document.documentElement;
 try{var t=localStorage.getItem('theme');if(t)root.setAttribute('data-theme',t)}catch(e){}
 var tb=$('#theme');if(tb)tb.addEventListener('click',function(){
   var dark=getComputedStyle(root).getPropertyValue('--bg').trim()==='#171310';
   var n=dark?'light':'dark';root.setAttribute('data-theme',n);try{localStorage.setItem('theme',n)}catch(e){}});
 /* mobile nav */
 var mb=$('#menu');if(mb)mb.addEventListener('click',function(){document.body.classList.toggle('nav')});
 $$('nav#side a').forEach(function(a){a.addEventListener('click',function(){document.body.classList.remove('nav')})});
 var cur=$('nav#side a.cur');if(cur&&cur.scrollIntoView){var sn=$('#side');sn.scrollTop=cur.offsetTop-sn.clientHeight/3}
 /* images open full size */
 $$('.content img').forEach(function(im){if(im.parentNode.tagName!=='A'){var a=document.createElement('a');a.href=im.src;a.target='_blank';a.rel='noopener';a.className='ib';im.parentNode.insertBefore(a,im);a.appendChild(im)}});
 /* tables: wrap, sort, filter */
 var num=function(s){var n=parseFloat(s.replace(/[,%+x\s]/g,'').replace(/^(-?[\d.]+)[kmbt]?$/i,'$1'));return isNaN(n)?null:n};
 $$('.content table').forEach(function(t){
   var w=document.createElement('div');w.className='tw';t.parentNode.insertBefore(w,t);w.appendChild(t);
   var tb=t.tBodies[0];if(!tb)return;
   if(tb.rows.length>12){var f=document.createElement('input');f.type='search';f.className='tf';f.placeholder='Filter rows';f.setAttribute('aria-label','Filter table rows');
     w.parentNode.insertBefore(f,w);f.addEventListener('input',function(){var v=f.value.toLowerCase();
       Array.prototype.forEach.call(tb.rows,function(r){r.style.display=r.textContent.toLowerCase().indexOf(v)<0?'none':''})})}
   $$('thead th',t).forEach(function(h,i){h.tabIndex=0;
     var go=function(){var d=h.getAttribute('aria-sort')==='ascending'?-1:1;
       $$('thead th',t).forEach(function(x){x.removeAttribute('aria-sort')});h.setAttribute('aria-sort',d===1?'ascending':'descending');
       var rows=Array.prototype.slice.call(tb.rows);
       rows.sort(function(a,b){var x=(a.cells[i]||{textContent:''}).textContent.trim(),y=(b.cells[i]||{textContent:''}).textContent.trim(),nx=num(x),ny=num(y);
         if(nx!==null&&ny!==null)return (nx-ny)*d;return x.localeCompare(y,undefined,{numeric:true})*d});
       rows.forEach(function(r){tb.appendChild(r)})};
     h.addEventListener('click',go);h.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})})});
 /* on this page */
 var toc=$('#toc'),hs=$$('.content h2,.content h3');
 if(toc&&hs.length>2){var h='<b>On this page</b>';hs.forEach(function(x){h+='<a class="'+(x.tagName==='H3'?'l3':'')+'" href="#'+x.id+'">'+x.textContent+'</a>'});toc.innerHTML=h;
   var links=$$('a',toc);
   var spy=function(){var y=window.scrollY+90,k=0;hs.forEach(function(x,i){if(x.offsetTop<=y)k=i});links.forEach(function(a,i){a.classList.toggle('on',i===k)})};
   window.addEventListener('scroll',spy,{passive:true});spy()}
 else if(toc)toc.style.display='none';
 /* search */
 var q=$('#q'),res=$('#res'),sel=-1;
 if(q&&window.IDX){
   var esc=function(s){return s.replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})};
   var run=function(){var v=q.value.trim().toLowerCase();sel=-1;if(v.length<2){res.style.display='none';return}
     var words=v.split(/\s+/),out=[];
     IDX.forEach(function(p){var s=0,hit='',tl=p.t.toLowerCase();
       words.forEach(function(w){
         if(tl.indexOf(w)>=0)s+=tl===w?60:30;
         p.h.forEach(function(h){if(h.toLowerCase().indexOf(w)>=0){s+=12;if(!hit)hit=h}});
         var i=p.x.indexOf(w);if(i>=0){s+=3;if(!hit&&!p._s){p._s=p.x.substr(Math.max(0,i-40),110)}}});
       if(s>0)out.push({p:p,s:s,hit:hit})});
     out.sort(function(a,b){return b.s-a.s});out=out.slice(0,9);
     res.innerHTML=out.length?out.map(function(o){var sn=o.hit?'Section: '+o.hit:(o.p._s?'…'+o.p._s+'…':o.p.g);o.p._s=null;
       return '<a href="'+BASE+o.p.u+(o.hit?'#'+o.p.a[o.p.h.indexOf(o.hit)]:'')+'"><b>'+esc(o.p.t)+'</b><span>'+esc(sn)+'</span></a>'}).join(''):'<p>No pages match.</p>';
     res.style.display='block'};
   q.addEventListener('input',run);q.addEventListener('focus',run);
   q.addEventListener('keydown',function(e){var a=$$('a',res);
     if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,Math.min(a.length-1,sel+(e.key==='ArrowDown'?1:-1)));a.forEach(function(x,i){x.classList.toggle('on',i===sel)})}
     else if(e.key==='Enter'&&a.length){location.href=a[Math.max(0,sel)].href}
     else if(e.key==='Escape'){res.style.display='none';q.blur()}});
   document.addEventListener('click',function(e){if(!$('#sbox').contains(e.target))res.style.display='none'});
   document.addEventListener('keydown',function(e){if(e.key==='/'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();q.focus()}});
 }
})();
