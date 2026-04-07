const diagram=document.getElementById('diagram'),svgEl=document.getElementById('edgeSvg'),tokenEl=document.getElementById('token'),stepLabelEl=document.getElementById('stepLabel');

function nr(id){const el=document.getElementById(id);if(!el)return null;const dr=diagram.getBoundingClientRect(),r=el.getBoundingClientRect();return{x:r.left-dr.left,y:r.top-dr.top,w:r.width,h:r.height,cx:r.left-dr.left+r.width/2,cy:r.top-dr.top+r.height/2}}
function ep(fid,tid){const a=nr(fid),b=nr(tid);if(!a||!b)return null;const cl=(r,cx,cy,tx,ty)=>{const dx=tx-cx,dy=ty-cy,sx=r.w/2/Math.abs(dx||.001),sy=r.h/2/Math.abs(dy||.001),s=Math.min(sx,sy);return{x:cx+dx*s,y:cy+dy*s}};return{from:cl(a,a.cx,a.cy,b.cx,b.cy),to:cl(b,b.cx,b.cy,a.cx,a.cy)}}
function dist(fid,tid){const p=ep(fid,tid);if(!p)return 100;const dx=p.to.x-p.from.x,dy=p.to.y-p.from.y;return Math.sqrt(dx*dx+dy*dy)}

const STEPS=[
  // [ADAPTER] — Request comes in
  {from:'client',to:'controller',label:'[ADAPTER] 1. Client sends GraphQL Query / Mutation to Controller',phase:'adapter'},
  {from:'controller',to:'mappingBox',label:'[ADAPTER] 2. Controller delegates to Adapter Mapping Pipeline (3+ params)',phase:'adapter'},
  {from:'reqDto',to:'webMapper',label:'[ADAPTER] 3. Request DTO passed to Web Mapper for transformation',phase:'adapter'},
  {from:'webMapper',to:'cmdObj',label:'[ADAPTER] 4. Web Mapper produces Command object (lives in Application layer)',phase:'adapter'},
  {from:'mappingBox',to:'controller',label:'[ADAPTER] 5. Controller receives Command back from pipeline',ret:true,phase:'adapter'},
  {from:'controller',to:'ucIface',label:'[ADAPTER] 6. Controller invokes UseCase Interface: execute(command)',phase:'adapter'},
  {from:'ucIface',to:'ucImpl',label:'[ADAPTER] 7. Interface → Impl resolved at runtime (Spring DI)',phase:'adapter'},

  // [LOAD] — Fetch existing aggregate
  {from:'ucImpl',to:'domRepoIface',label:'[LOAD] 8. UseCase extracts ID from Command → calls Repository: findById(id)',phase:'load'},
  {from:'domRepoIface',to:'repoImpl',label:'[LOAD] 9. Dependency Inversion: Domain Interface → Infra Impl',phase:'load'},
  {from:'repoImpl',to:'entRepo',label:'[LOAD] 10. Repo Impl calls Entity Repository: findById via R2DBC',phase:'load'},
  {from:'entRepo',to:'db',label:'[LOAD] 11. Entity Repository → PostgreSQL (non-blocking I/O)',phase:'load'},
  {from:'db',to:'entRepo',label:'[LOAD] 12. ← DB returns existing record',ret:true,phase:'load'},
  {from:'entRepo',to:'repoImpl',label:'[LOAD] 13. ← Entity Repository returns DB Entity',ret:true,phase:'load'},
  {from:'repoImpl',to:'infraMappingBox',label:'[LOAD] 14. Repo Impl delegates to Entity Mapping Pipeline',phase:'load'},
  {from:'entMapper',to:'dbEntity',label:'[LOAD] 15. Entity Mapper converts DB Entity → domain object',phase:'load'},
  {from:'infraMappingBox',to:'repoImpl',label:'[LOAD] 16. ← Repo Impl receives domain object',ret:true,phase:'load'},
  {from:'repoImpl',to:'domRepoIface',label:'[LOAD] 17. ← Returns Mono<Domain> through Repository Interface',ret:true,phase:'load'},
  {from:'domRepoIface',to:'ucImpl',label:'[LOAD] 18. ← Existing Aggregate returned to UseCase Impl',ret:true,phase:'load'},

  // [EXECUTE] — Business method + invariants
  {from:'ucImpl',to:'aggregate',label:'[EXECUTE] 19. UseCase calls business method on loaded Aggregate',phase:'execute'},
  {from:'aggregate',to:'domEx',label:'[EXECUTE] 20. ⚡ Aggregate self-validates — throws DomainException if rules violated',opt:true,phase:'execute'},

  // [SAVE] — Persist changes + domain events
  {from:'ucImpl',to:'domRepoIface',label:'[SAVE] 21. UseCase calls Repository Interface: save(aggregate)',phase:'save'},
  {from:'domRepoIface',to:'repoImpl',label:'[SAVE] 22. Dependency Inversion: Domain Interface → Infra Impl',phase:'save'},
  {from:'repoImpl',to:'infraMappingBox',label:'[SAVE] 23. Repo Impl delegates to Entity Mapping Pipeline',phase:'save'},
  {from:'entMapper',to:'dbEntity',label:'[SAVE] 24. Entity Mapper produces DB Entity (@Table, Persistable)',phase:'save'},
  {from:'infraMappingBox',to:'repoImpl',label:'[SAVE] 25. Repo Impl receives DB Entity back',ret:true,phase:'save'},
  {from:'repoImpl',to:'entRepo',label:'[SAVE] 26. Repo Impl calls Entity Repository: save(entity) via R2DBC',phase:'save'},
  {from:'entRepo',to:'db',label:'[SAVE] 27. Entity Repository → PostgreSQL (non-blocking I/O)',phase:'save'},
  {from:'db',to:'entRepo',label:'[SAVE] 28. ← DB confirms write',ret:true,phase:'save'},
  {from:'entRepo',to:'repoImpl',label:'[SAVE] 29. ← Entity Repository returns saved DB Entity',ret:true,phase:'save'},
  {from:'aggregate',to:'domEvent',label:'[SAVE] 30. Aggregate produced Domain Event during business method',opt:true,phase:'save'},
  {from:'domEvent',to:'kafkaProd',label:'[SAVE] 31. After commit — Infrastructure dispatches event to Kafka',opt:true,phase:'save'},
  {from:'repoImpl',to:'domRepoIface',label:'[SAVE] 32. ← Returns Mono<Domain> through Repository Interface',ret:true,phase:'save'},
  {from:'domRepoIface',to:'ucImpl',label:'[SAVE] 33. ← Saved domain object returned to UseCase Impl',ret:true,phase:'save'},

  // [RETURN] — Map to DTO, respond to client
  {from:'ucImpl',to:'domMappingBox',label:'[RETURN] 34. UseCase passes domain to Domain Mapping Pipeline → DTO',phase:'return'},
  {from:'aggregate',to:'appMapper',label:'[RETURN] 35. Aggregate / Domain Entity passed to App Mapper',phase:'return'},
  {from:'appMapper',to:'appDto',label:'[RETURN] 36. App Mapper produces Application DTO',phase:'return'},
  {from:'domMappingBox',to:'ucImpl',label:'[RETURN] 37. UseCase receives DTO back from pipeline',ret:true,phase:'return'},
  {from:'ucImpl',to:'ucIface',label:'[RETURN] 38. ← Impl returns Mono<DTO> through UseCase Interface',ret:true,phase:'return'},
  {from:'ucIface',to:'controller',label:'[RETURN] 39. ← Controller receives Mono<DTO> / Flux<DTO>',ret:true,phase:'return'},
  {from:'controller',to:'client',label:'[RETURN] 40. ← GraphQL Response sent to Client',ret:true,phase:'return'},
  {from:'domEx',to:'errHandler',label:'[ERROR] 41. Exception caught by Error Handler',opt:true,phase:'error'},
  {from:'errHandler',to:'client',label:'[ERROR] 42. GraphQL error with extensions → Client',opt:true,ret:true,phase:'error'},
];

function ensureMarkers(){if(svgEl.querySelector('defs'))return;const d=document.createElementNS('http://www.w3.org/2000/svg','defs');[['aa','#e94560'],['ad','#5555aa'],['ar','#4488aa']].forEach(([id,c])=>{const m=document.createElementNS('http://www.w3.org/2000/svg','marker');m.setAttribute('id',id);m.setAttribute('viewBox','0 0 10 10');m.setAttribute('refX','9');m.setAttribute('refY','5');m.setAttribute('markerWidth','6');m.setAttribute('markerHeight','6');m.setAttribute('orient','auto-start-reverse');const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d','M 0 0 L 10 5 L 0 10 z');p.setAttribute('fill',c);m.appendChild(p);d.appendChild(m)});svgEl.appendChild(d)}

function drawEdge(fid,tid,active,ret,opt){const p=ep(fid,tid);if(!p)return;const c=active?'#e94560':ret?'rgba(68,136,170,.3)':'rgba(85,85,170,.25)';const mk=active?'url(#aa)':ret?'url(#ar)':'url(#ad)';const l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',p.from.x);l.setAttribute('y1',p.from.y);l.setAttribute('x2',p.to.x);l.setAttribute('y2',p.to.y);l.setAttribute('stroke',c);l.setAttribute('stroke-width',active?2.5:1.2);if(opt)l.setAttribute('stroke-dasharray','6,4');l.setAttribute('marker-end',mk);svgEl.appendChild(l)}

let cur=-1,playing=false,spd=1,af=0;const TK_SPD=2;
function fpf(i){if(i<0||i>=STEPS.length)return 60;const base=Math.round(dist(STEPS[i].from,STEPS[i].to)/TK_SPD);return Math.max(30,Math.round(base/spd))}

function render(){ensureMarkers();svgEl.querySelectorAll('line').forEach(l=>l.remove());document.querySelectorAll('#diagram [id]').forEach(el=>{el.classList.remove('node-active','node-visited')});
for(let i=0;i<cur&&i<STEPS.length;i++){const s=STEPS[i];drawEdge(s.from,s.to,false,s.ret,s.opt);document.getElementById(s.from)?.classList.add('node-visited');document.getElementById(s.to)?.classList.add('node-visited')}
if(cur>=0&&cur<STEPS.length){const s=STEPS[cur];drawEdge(s.from,s.to,true,s.ret,s.opt);document.getElementById(s.from)?.classList.remove('node-visited');document.getElementById(s.to)?.classList.remove('node-visited');document.getElementById(s.from)?.classList.add('node-active');document.getElementById(s.to)?.classList.add('node-active')}}

function mvTk(pr){if(cur<0||cur>=STEPS.length){tokenEl.classList.add('hidden');return}const p=ep(STEPS[cur].from,STEPS[cur].to);if(!p)return;tokenEl.style.left=(p.from.x+(p.to.x-p.from.x)*pr-8)+'px';tokenEl.style.top=(p.from.y+(p.to.y-p.from.y)*pr-8)+'px';tokenEl.classList.remove('hidden')}

function tick(){if(!playing)return;af++;const n=fpf(cur),pr=Math.min(af/n,1);mvTk(pr);if(af>=n){cur++;af=0;if(cur>=STEPS.length){playing=false;cur=STEPS.length-1;tokenEl.classList.add('hidden');stepLabelEl.textContent='✅ Flow Complete';stepLabelEl.style.color='#e94560';render();return}render()}const s=STEPS[cur];if(s){const colors={adapter:'#a78bfa',load:'#38bdf8',execute:'#fb923c',save:'#4ade80',return:'#e879f9',error:'#f87171'};stepLabelEl.style.color=colors[s.phase]||'#e94560';stepLabelEl.textContent=s.label}requestAnimationFrame(tick)}

document.getElementById('btnPlay').onclick=()=>{if(cur>=STEPS.length-1){cur=-1;af=0}playing=true;if(cur<0){cur=0;render()}tick()};
document.getElementById('btnPause').onclick=()=>{playing=false};
document.getElementById('btnReset').onclick=()=>{playing=false;cur=-1;af=0;tokenEl.classList.add('hidden');stepLabelEl.textContent='Press Play to start';document.querySelectorAll('#diagram [id]').forEach(el=>{el.classList.remove('node-active','node-visited')});svgEl.querySelectorAll('line').forEach(l=>l.remove())};
const spds=[1,2,3,.5];let si=0;document.getElementById('btnSpeed').onclick=()=>{si=(si+1)%spds.length;spd=spds[si];document.getElementById('btnSpeed').textContent='Speed: '+spd+'x'};
const phaseColors={adapter:'#a78bfa',load:'#38bdf8',execute:'#fb923c',save:'#4ade80',return:'#e879f9',error:'#f87171'};
document.getElementById('btnNext').onclick=()=>{playing=false;if(cur<STEPS.length-1){cur++;af=0;render();mvTk(1);stepLabelEl.textContent=STEPS[cur].label;stepLabelEl.style.color=phaseColors[STEPS[cur].phase]||'#e94560'}};
document.getElementById('btnPrev').onclick=()=>{playing=false;if(cur>0){cur--;af=0;render();mvTk(1);stepLabelEl.textContent=STEPS[cur].label;stepLabelEl.style.color=phaseColors[STEPS[cur].phase]||'#e94560'}};
ensureMarkers();
