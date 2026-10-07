/* Interactive Shimlar map. Data comes from maps-data.js (MAPZ, MAPCATS). */
(function(){
var Z=MAPZ,N=Z.length,$=function(i){return document.getElementById(i)};
var NS='http://www.w3.org/2000/svg';
var TYPE={exp:['Exp','#d9a441'],gold:['Gold','#f0dc4a'],gem:['Gem','#3fc1d9'],shadow:['Shadow','#8b6fd6'],mastery:['Mastery','#e06a6a'],none:['None','#9a9a9a']};
var CAT={bank:['B','#e8c24a'],heal:['H','#e86b6b'],anvil:['A','#9fb0c0'],arc:['M','#a58aea'],quest:['Q','#5fc98a'],conq:['C','#ef8a3a'],fusion:['F','#4fb8d6'],acad:['R','#d98ac6'],trade:['T','#c98f5a'],emb:['E','#6fa8e8'],res:['r','#7fbf4a'],temple:['t','#e6e0b4'],guide:['G','#f4f4f4'],other:['o','#bdbdbd'],portal:['◈','#e0ae4e']};
var CATNAME={};MAPCATS.forEach(function(c){CATNAME[c[0]]=c[1]});CATNAME.portal='Portal';
var SLUG={};Z.forEach(function(z,i){SLUG[z.s]=i});
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function norm(s){return String(s).toLowerCase().replace(/[^a-z0-9]/g,'')}
function f(n){return n.toLocaleString('en-US')}
var ROOT=SLUG['the-wilderness'];

/* graph */
var inb=Z.map(function(){return[]}),adjU=Z.map(function(){return[]}),adjD=Z.map(function(){return[]}),pairs={};
Z.forEach(function(z,i){z.p.forEach(function(p){
  inb[p[0]].push([i,p[1],p[2]]);adjD[i].push(p[0]);
  if(i!==p[0]){adjU[i].push(p[0]);adjU[p[0]].push(i);var k=Math.min(i,p[0])+'-'+Math.max(i,p[0]);pairs[k]=[Math.min(i,p[0]),Math.max(i,p[0])]}
})});
var edgeList=Object.keys(pairs).map(function(k){return pairs[k]});
var nbr=Z.map(function(_,i){var s={};adjU[i].forEach(function(j){s[j]=1});return s});

/* state */
var S={sel:-1,type:'',lvl:0,has:'',route:null,catOff:{},cell:null,k:.3,tx:0,ty:0};

/* ---------- world view ---------- */
var svg=$('mw'),vp=$('mw-vp'),gE=$('mw-e'),gN=$('mw-n'),gL=$('mw-l'),tip=$('mw-tip');
var minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
Z.forEach(function(z){minX=Math.min(minX,z.x);maxX=Math.max(maxX,z.x);minY=Math.min(minY,z.y);maxY=Math.max(maxY,z.y)});
var edgeEl=[],nodeEl=[],lblEl=[];
function mk(tag,at,par){var e=document.createElementNS(NS,tag);for(var k in at)e.setAttribute(k,at[k]);par.appendChild(e);return e}
edgeList.forEach(function(e){edgeEl.push(mk('line',{x1:Z[e[0]].x,y1:Z[e[0]].y,x2:Z[e[1]].x,y2:Z[e[1]].y,'class':'mw-edge'},gE))});
Z.forEach(function(z,i){
  var c=mk('circle',{cx:z.x,cy:z.y,'class':'mw-node',fill:TYPE[z.t][1],'data-i':i},gN);nodeEl.push(c);
  var t=mk('text',{x:z.x,y:z.y,'class':'mw-lbl'},gL);t.textContent=z.n;lblEl.push(t)});

function apply(){
  vp.setAttribute('transform','translate('+S.tx+' '+S.ty+') scale('+S.k+')');
  var r=5.2/S.k;
  Z.forEach(function(z,i){nodeEl[i].setAttribute('r',(i===ROOT?8:(i===S.sel?7:5.2))/S.k)});
  var fs=11/S.k;
  Z.forEach(function(z,i){lblEl[i].style.fontSize=fs+'px';lblEl[i].setAttribute('y',z.y-(8/S.k)-2/S.k);lblEl[i].setAttribute('dy',0)});
  paintLabels();
}
function fit(){
  var w=svg.clientWidth||800,h=svg.clientHeight||500,pad=40;
  var k=Math.min((w-pad*2)/(maxX-minX||1),(h-pad*2)/(maxY-minY||1));
  S.k=k;S.tx=w/2-k*(minX+maxX)/2;S.ty=h/2-k*(minY+maxY)/2;apply();
}
function zoomAt(px,py,fac){
  var nk=Math.max(.08,Math.min(6,S.k*fac));fac=nk/S.k;
  S.tx=px-(px-S.tx)*fac;S.ty=py-(py-S.ty)*fac;S.k=nk;apply();
}
function centerOn(i,minK){
  var w=svg.clientWidth,h=svg.clientHeight,z=Z[i];
  if(minK&&S.k<minK)S.k=minK;
  S.tx=w/2-S.k*z.x;S.ty=h/2-S.k*z.y;apply();
}
function visibleNode(i){var z=Z[i],sx=z.x*S.k+S.tx,sy=z.y*S.k+S.ty;return sx>20&&sy>20&&sx<svg.clientWidth-20&&sy<svg.clientHeight-20}

/* pointer interaction */
var ptrs={},drag=null,pinch=0,downAt=null;
svg.addEventListener('pointerdown',function(e){
  svg.setPointerCapture(e.pointerId);ptrs[e.pointerId]={x:e.clientX,y:e.clientY};
  downAt={x:e.clientX,y:e.clientY,t:e.target};
  var n=Object.keys(ptrs).length;
  if(n===1)drag={x:e.clientX,y:e.clientY,tx:S.tx,ty:S.ty};
  if(n===2){var a=Object.keys(ptrs).map(function(k){return ptrs[k]});pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);drag=null}
});
svg.addEventListener('pointermove',function(e){
  if(ptrs[e.pointerId]){ptrs[e.pointerId]={x:e.clientX,y:e.clientY};
    var keys=Object.keys(ptrs);
    if(keys.length===2&&pinch){var a=ptrs[keys[0]],b=ptrs[keys[1]],d=Math.hypot(a.x-b.x,a.y-b.y),r=svg.getBoundingClientRect();
      zoomAt((a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,d/pinch);pinch=d}
    else if(drag){S.tx=drag.tx+(e.clientX-drag.x);S.ty=drag.ty+(e.clientY-drag.y);vp.setAttribute('transform','translate('+S.tx+' '+S.ty+') scale('+S.k+')')}
  }
  var t=e.target;
  if(t.classList&&t.classList.contains('mw-node')&&!drag){var i=+t.getAttribute('data-i'),z=Z[i];
    tip.style.display='block';tip.textContent=z.n+'  ·  Level '+f(z.l)+'  ·  '+TYPE[z.t][0];
    var r2=svg.getBoundingClientRect();tip.style.left=Math.min(e.clientX-r2.left+12,r2.width-tip.offsetWidth-6)+'px';tip.style.top=(e.clientY-r2.top+14)+'px';hoverI=i;paintLabels()}
  else{tip.style.display='none';if(hoverI!==-1){hoverI=-1;paintLabels()}}
});
function up(e){
  var moved=downAt&&Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)>4;
  delete ptrs[e.pointerId];if(Object.keys(ptrs).length<2)pinch=0;
  if(Object.keys(ptrs).length===1){var k=Object.keys(ptrs)[0];drag={x:ptrs[k].x,y:ptrs[k].y,tx:S.tx,ty:S.ty}}else drag=null;
  if(!moved&&downAt&&downAt.t&&downAt.t.classList&&downAt.t.classList.contains('mw-node'))select(+downAt.t.getAttribute('data-i'),false);
  if(!Object.keys(ptrs).length)downAt=null;
}
svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',function(e){delete ptrs[e.pointerId];drag=null;pinch=0});
svg.addEventListener('pointerleave',function(){tip.style.display='none';if(hoverI!==-1){hoverI=-1;paintLabels()}});
svg.addEventListener('wheel',function(e){e.preventDefault();var r=svg.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY<0?1.18:1/1.18)},{passive:false});
$('mw-in').addEventListener('click',function(){zoomAt(svg.clientWidth/2,svg.clientHeight/2,1.4)});
$('mw-out').addEventListener('click',function(){zoomAt(svg.clientWidth/2,svg.clientHeight/2,1/1.4)});
$('mw-fit').addEventListener('click',fit);
var hoverI=-1;

/* ---------- filters and painting ---------- */
function dimmed(i){var z=Z[i];
  if(S.type&&z.t!==S.type)return true;
  if(S.lvl&&z.l>S.lvl)return true;
  if(S.has&&!z.c.some(function(c){return c[0]===S.has}))return true;
  return false}
function filtersOn(){return!!(S.type||S.lvl||S.has)}
var routeSet={},routeEdge={};
function paint(){
  var on=filtersOn(),cnt=0;
  Z.forEach(function(z,i){
    var d=on&&dimmed(i);if(!d)cnt++;
    var cl='mw-node'+(d?' dim':'')+(i===S.sel?' sel':'')+(S.sel>=0&&nbr[S.sel][i]?' nb':'')+(routeSet[i]?' rt':'');
    nodeEl[i].setAttribute('class',cl)});
  edgeList.forEach(function(e,j){
    var a=e[0],b=e[1],cl='mw-edge';
    if(routeEdge[a+'-'+b])cl+=' rt';
    else if(S.sel>=0&&(a===S.sel||b===S.sel))cl+=' hi';
    else if(on&&(dimmed(a)||dimmed(b)))cl+=' dim';
    edgeEl[j].setAttribute('class',cl)});
  $('mp-count').textContent=on?(cnt+' of '+N+' zones match your filters.'):(N+' zones, '+edgeList.length+' portal links. Drag to pan, scroll or pinch to zoom, click a zone to open it.');
  apply();
}
function paintLabels(){
  var show=S.k>=1.25,few=filtersOn();
  Z.forEach(function(z,i){
    var v=false;
    if(i===ROOT||i===S.sel||i===hoverI||routeSet[i])v=true;
    else if(S.sel>=0&&nbr[S.sel][i]&&S.k>=.35)v=true;
    else if(show&&(!filtersOn()||!dimmed(i))&&visibleNode(i))v=true;
    else if(few&&!dimmed(i)&&S.k>=.5&&visibleNode(i))v=true;
    lblEl[i].style.display=v?'block':'none';
    lblEl[i].setAttribute('class','mw-lbl'+(dimmed(i)&&filtersOn()?' dim':'')+(i===S.sel?' sel':''))});
}

/* ---------- zone panel ---------- */
var zp=$('mz');
function portalChip(d,x,y,extra){return'<a href="#'+Z[d].s+'" class="mz-go" data-go="'+d+'"'+(extra||'')+'>'+esc(Z[d].n)+'</a> <small>Lv '+f(Z[d].l)+(x!=null?' · at '+x+','+y:'')+'</small>'}
function items(i){
  var z=Z[i],w=z.g[0],h=z.g[1],on=[],off=[];
  z.p.forEach(function(p){var o={k:'portal',n:'Portal to '+Z[p[0]].n,d:p[0],x:p[1],y:p[2]};(p[1]<w&&p[2]<h?on:off).push(o)});
  z.c.forEach(function(c){var o={k:c[0],n:c[1],x:c[2],y:c[3]};(c[2]<w&&c[3]<h?on:off).push(o)});
  return{on:on,off:off}}
function showZone(i){
  var z=Z[i],w=z.g[0],h=z.g[1],it=items(i),cnt={};
  it.on.concat(it.off).forEach(function(o){cnt[o.k]=(cnt[o.k]||0)+1});
  var H='<div class="mz-head"><h2>'+esc(z.n)+'</h2><div class="mz-chips"><span>Level '+f(z.l)+'</span><span><i class="mz-dot" style="background:'+TYPE[z.t][1]+'"></i>'+TYPE[z.t][0]+' zone</span><span>Grid '+w+' × '+h+'</span></div>';
  H+='<p class="mz-links">'+(z.m?'<a href="monster-stats.html#'+z.s+'">Monsters</a> · ':'')+'<a href="https://shimlar.org/maps/'+z.s+'" target="_blank" rel="noopener">Zone page on shimlar.org</a></p></div>';
  /* legend / toggles */
  var order=['portal'].concat(MAPCATS.map(function(c){return c[0]})),L='';
  order.forEach(function(k){if(!cnt[k])return;L+='<button type="button" class="mz-key'+(S.catOff[k]?' off':'')+'" data-k="'+k+'" aria-pressed="'+(!S.catOff[k])+'"><b style="background:'+CAT[k][1]+'">'+CAT[k][0]+'</b>'+esc(CATNAME[k])+' <small>'+cnt[k]+'</small></button>'});
  H+='<div class="mz-legend" aria-label="Map key. Click to show or hide a kind of place.">'+L+'</div>';
  H+='<div class="mz-gridwrap"><div id="mz-grid"></div></div><div id="mz-cell" class="mz-cell" aria-live="polite">Click a square to see what is there.</div>';
  if(it.off.length){H+='<p class="mz-off"><b>Listed without a square on the grid:</b> '+it.off.map(function(o){return esc(o.n)+' ('+o.x+','+o.y+')'}).join(', ')+'. The zone page gives coordinates outside the '+w+' × '+h+' grid for these.</p>'}
  /* lists */
  H+='<h3>Portals out</h3>';
  H+=z.p.length?'<ul class="mz-list">'+z.p.map(function(p,j){return'<li data-x="'+p[1]+'" data-y="'+p[2]+'">'+portalChip(p[0],p[1],p[2])+'</li>'}).join('')+'</ul>':'<p class="mz-none">No portals are listed on this zone’s page.</p>';
  var ib=inb[i].filter(function(a){return a[0]!==i});
  H+='<h3>Reached from</h3>';
  H+=ib.length?'<ul class="mz-list">'+ib.map(function(a){return'<li>'+portalChip(a[0],a[1],a[2],'')+'</li>'}).join('')+'</ul><p class="mz-note">Coordinates are where the portal sits inside the zone it leaves.</p>':'<p class="mz-none">No other zone lists a portal to here. Its own page lists the portals to use.</p>';
  H+='<h3>Interactions</h3>';
  if(z.c.length){var by={};z.c.forEach(function(c){(by[c[0]]=by[c[0]]||[]).push(c)});
    H+='<ul class="mz-list">';order.forEach(function(k){(by[k]||[]).forEach(function(c){H+='<li data-x="'+c[2]+'" data-y="'+c[3]+'"><b class="mz-b" style="background:'+CAT[k][1]+'">'+CAT[k][0]+'</b>'+esc(c[1])+' <small>at '+c[2]+','+c[3]+'</small></li>'})});H+='</ul>'}
  else H+='<p class="mz-none">None are listed.</p>';
  zp.innerHTML=H;
  drawGrid(i);bindPanel(i);
}
function drawGrid(i){
  var z=Z[i],w=z.g[0],h=z.g[1],it=items(i),g=$('mz-grid'),gw0=g.parentNode;
  var W=Math.max(200,(gw0.clientWidth||zp.clientWidth||420)-26-6);
  var cs=Math.max(15,Math.min(44,Math.floor((W-w-2)/w)));
  g.style.gridTemplateColumns='repeat('+w+','+cs+'px)';g.style.gridTemplateRows='repeat('+h+','+cs+'px)';g.style.setProperty('--cs',cs+'px');g.style.fontSize=Math.max(9,Math.min(16,cs*.55))+'px';
  var cells={};
  it.on.forEach(function(o){if(S.catOff[o.k])return;var key=o.x+','+o.y;(cells[key]=cells[key]||[]).push(o)});
  var every=w>14?5:(w>8?2:1),H='';
  for(var y=h-1;y>=0;y--){for(var x=0;x<w;x++){
    var c=cells[x+','+y],cls='gc',inner='',tt=x+','+y;
    if(c){cls+=' has';var top=c[0];var kinds={};c.forEach(function(o){kinds[o.k]=1});
      if(Object.keys(kinds).length===1||c.length===1){inner='<b style="background:'+CAT[top.k][1]+'">'+CAT[top.k][0]+'</b>'+(c.length>1?'<sup>'+c.length+'</sup>':'')}
      else inner='<b class="multi">'+c.length+'</b>';
      tt+=': '+c.map(function(o){return o.n}).join('; ')}
    H+='<div class="'+cls+'" data-x="'+x+'" data-y="'+y+'" title="'+esc(tt)+'" style="grid-column:'+(x+1)+';grid-row:'+(h-y)+'">'+inner+'</div>'}}
  g.innerHTML=H;
  /* axis labels */
  var gw=g.parentNode;[].slice.call(gw.querySelectorAll('.ax')).forEach(function(n){n.remove()});
  gw.style.setProperty('--w',w);
  var ax='';
  for(var x2=0;x2<w;x2++)if(x2%every===0||x2===w-1)ax+='<span class="ax axx" style="left:calc(var(--lm) + '+(x2*cs)+'px);width:'+cs+'px">'+x2+'</span>';
  for(var y2=0;y2<h;y2++)if(y2%every===0||y2===h-1)ax+='<span class="ax axy" style="top:'+((h-1-y2)*cs)+'px;height:'+cs+'px;line-height:'+cs+'px">'+y2+'</span>';
  gw.insertAdjacentHTML('beforeend',ax);
  S.cs=cs;
}
function cellInfo(i,x,y){
  var it=items(i).on.filter(function(o){return o.x===x&&o.y===y}),box=$('mz-cell'),H='<b>Square '+x+', '+y+'</b>';
  if(!it.length)H+=' — nothing listed here.';
  else H+='<ul>'+it.map(function(o){return'<li><b class="mz-b" style="background:'+CAT[o.k][1]+'">'+CAT[o.k][0]+'</b>'+(o.k==='portal'?'Portal to '+portalChip(o.d,null,null):esc(o.n))+'</li>'}).join('')+'</ul>';
  box.innerHTML=H;
  [].slice.call(zp.querySelectorAll('.gc.sel')).forEach(function(n){n.classList.remove('sel')});
  var el=zp.querySelector('.gc[data-x="'+x+'"][data-y="'+y+'"]');if(el)el.classList.add('sel');
}
function bindPanel(i){
  $('mz-grid').addEventListener('click',function(e){var c=e.target.closest('.gc');if(c)cellInfo(i,+c.getAttribute('data-x'),+c.getAttribute('data-y'))});
  [].slice.call(zp.querySelectorAll('.mz-key')).forEach(function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-k');S.catOff[k]=!S.catOff[k];showZone(i)})});
  [].slice.call(zp.querySelectorAll('.mz-list li[data-x]')).forEach(function(li){
    var x=+li.getAttribute('data-x'),y=+li.getAttribute('data-y');
    li.addEventListener('mouseenter',function(){var c=zp.querySelector('.gc[data-x="'+x+'"][data-y="'+y+'"]');if(c)c.classList.add('hl')});
    li.addEventListener('mouseleave',function(){[].slice.call(zp.querySelectorAll('.gc.hl')).forEach(function(n){n.classList.remove('hl')})});
    li.addEventListener('click',function(e){if(e.target.closest('a'))return;cellInfo(i,x,y)})});
}
zp.addEventListener('click',function(e){var a=e.target.closest('a.mz-go');if(a){e.preventDefault();select(+a.getAttribute('data-go'),true)}});

function select(i,center){
  S.sel=i;paint();showZone(i);
  if(center||!visibleNode(i))centerOn(i,.5);
  try{history.replaceState(null,'','#'+Z[i].s)}catch(_){}
  $('mp-find').value=Z[i].n;
}

/* ---------- search, filters, route ---------- */
var dl=$('mp-names');dl.innerHTML=Z.slice().sort(function(a,b){return a.n<b.n?-1:1}).map(function(z){return'<option value="'+esc(z.n)+'">'}).join('');
function lookup(v){
  v=norm(v);if(!v)return-1;
  for(var i=0;i<N;i++)if(norm(Z[i].n)===v||Z[i].s.replace(/-/g,'')===v)return i;
  for(var j=0;j<N;j++)if(norm(Z[j].n).indexOf(v)===0)return j;
  for(var k=0;k<N;k++)if(norm(Z[k].n).indexOf(v)>=0)return k;
  return-1}
function wire(id,fn){var e=$(id);e.addEventListener('change',fn);e.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();fn()}})}
wire('mp-find',function(){var i=lookup($('mp-find').value);if(i>=0)select(i,true)});
$('mp-type').addEventListener('change',function(){S.type=this.value;paint()});
$('mp-lvl').addEventListener('input',function(){var v=parseInt(this.value.replace(/[^0-9]/g,''),10);S.lvl=isNaN(v)?0:v;paint()});
var hs=$('mp-has');hs.innerHTML='<option value="">Any</option>'+MAPCATS.map(function(c){return'<option value="'+c[0]+'">'+esc(c[1])+'</option>'}).join('');
hs.addEventListener('change',function(){S.has=this.value;paint()});
$('mp-reset').addEventListener('click',function(){S.type='';S.lvl=0;S.has='';$('mp-type').value='';$('mp-lvl').value='';hs.value='';clearRoute();fit();paint()});

function bfs(a,b,adj){
  var prev={},q=[a];prev[a]=-1;
  for(var h=0;h<q.length;h++){var u=q[h];if(u===b)break;adj[u].forEach(function(v){if(!(v in prev)){prev[v]=u;q.push(v)}})}
  if(!(b in prev))return null;var p=[];for(var x=b;x!==-1;x=prev[x])p.unshift(x);return p}
function portalAt(a,b){var z=Z[a];for(var k=0;k<z.p.length;k++)if(z.p[k][0]===b)return z.p[k];return null}
function clearRoute(){S.route=null;routeSet={};routeEdge={};$('mp-route').innerHTML='';paint()}
function findRoute(){
  var a=lookup($('mp-from').value),b=lookup($('mp-to').value),out=$('mp-route');
  if(a<0||b<0){out.innerHTML='<p class="mz-none">Choose a start and a destination zone from the lists.</p>';return}
  if(a===b){out.innerHTML='<p class="mz-none">That is the same zone.</p>';return}
  var p=bfs(a,b,adjD),oneWay=false;
  if(!p){p=bfs(a,b,adjU);oneWay=!!p}
  if(!p){out.innerHTML='<p class="mz-none">No portal route was found between those zones.</p>';routeSet={};routeEdge={};paint();return}
  routeSet={};routeEdge={};p.forEach(function(i){routeSet[i]=1});
  for(var j=0;j<p.length-1;j++){var u=p[j],v=p[j+1];routeEdge[Math.min(u,v)+'-'+Math.max(u,v)]=1}
  var H='<p><b>'+(p.length-1)+' portal'+(p.length===2?'':'s')+'</b> from '+esc(Z[a].n)+' to '+esc(Z[b].n)+'.</p><ol class="mz-steps">';
  for(var s=0;s<p.length-1;s++){var A=p[s],B=p[s+1],pt=portalAt(A,B);
    H+='<li>In <a href="#'+Z[A].s+'" class="mz-go" data-go="'+A+'">'+esc(Z[A].n)+'</a>, '+(pt?'go to <b>'+pt[1]+','+pt[2]+'</b> and take the portal to ':'use the portal listed on the other side to reach ')+'<a href="#'+Z[B].s+'" class="mz-go" data-go="'+B+'">'+esc(Z[B].n)+'</a> <small>Lv '+f(Z[B].l)+'</small>'+(pt?'':' <small>(only listed from '+esc(Z[B].n)+'’s own page)</small>')+'</li>'}
  H+='</ol><p class="mz-note">Each zone has a minimum level to enter. Shrine teleport services can skip some of these steps for zones you can already enter.'+(oneWay?' One link on this route is listed only from the far side.':'')+'</p>';
  out.innerHTML=H;paint();
  var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;p.forEach(function(i){minx=Math.min(minx,Z[i].x);maxx=Math.max(maxx,Z[i].x);miny=Math.min(miny,Z[i].y);maxy=Math.max(maxy,Z[i].y)});
  var w=svg.clientWidth,h=svg.clientHeight,k=Math.min(1.6,Math.min((w-120)/((maxx-minx)||1),(h-120)/((maxy-miny)||1)));
  S.k=Math.max(.15,k);S.tx=w/2-S.k*(minx+maxx)/2;S.ty=h/2-S.k*(miny+maxy)/2;apply();
}
wire('mp-from',function(){});wire('mp-to',findRoute);
$('mp-go').addEventListener('click',findRoute);
$('mp-clear').addEventListener('click',clearRoute);
$('mp-route').addEventListener('click',function(e){var a=e.target.closest('a.mz-go');if(a){e.preventDefault();select(+a.getAttribute('data-go'),true)}});
$('mp-from').setAttribute('list','mp-names');$('mp-to').setAttribute('list','mp-names');
$('mp-to-here').addEventListener('click',function(){if(S.sel>=0){$('mp-to').value=Z[S.sel].n;if(!$('mp-from').value)$('mp-from').value=Z[ROOT].n;findRoute()}});

/* legend for zone types */
$('mw-key').innerHTML=Object.keys(TYPE).map(function(k){return'<span><i style="background:'+TYPE[k][1]+'"></i>'+TYPE[k][0]+'</span>'}).join('');

/* start */
function start(){
  var h=(location.hash||'').replace('#',''),i=SLUG[h];
  fit();paint();
  select(i!==undefined?i:ROOT,i!==undefined);
}
window.addEventListener('hashchange',function(){var i=SLUG[(location.hash||'').replace('#','')];if(i!==undefined&&i!==S.sel)select(i,true)});
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){apply();if(S.sel>=0)drawGrid(S.sel)},150)});
start();
})();
