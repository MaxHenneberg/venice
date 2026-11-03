import Phaser from 'phaser';
import './style.css';
import countries from './geography.json' with { type: 'json' };
import { project, ports } from './geography.js';
import { createSimulation, addRoute, removeRoute, advance, quoteRoute, DELIVERY_REWARD, DISTANCE_RATE, CAPACITY, GOOD_INFO } from './simulation.js';
import { seaPath, pointAlong } from './sea-routes.js';

const mapViewport = document.querySelector('.map-viewport');
mapViewport.addEventListener('keydown', event => {
  if (event.target !== mapViewport || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Home') mapViewport.scrollLeft = 0;
  else if (event.key === 'End') mapViewport.scrollLeft = mapViewport.scrollWidth;
  else mapViewport.scrollLeft += event.key === 'ArrowRight' ? 100 : -100;
});
if (window.matchMedia('(max-width: 700px)').matches) requestAnimationFrame(() => { mapViewport.scrollLeft = Math.max(0, project(12.3388,45.4408).x / 1200 * mapViewport.scrollWidth - mapViewport.clientWidth / 2); });
const simulation=createSimulation(), paths=new Map(), portLayer=document.querySelector('#port-layer'), shipLayer=document.querySelector('#ship-layer');
const instruction=document.querySelector('#map-instruction'), announcement=document.querySelector('#map-announcement'), help=document.querySelector('#map-help-text'), popover=document.querySelector('#route-popover'), confirm=document.querySelector('#confirm-route'), treasury=document.querySelector('#treasury');
const labelsToggle=document.querySelector('#harbor-labels-toggle');
labelsToggle.addEventListener('click',()=>{const visible=labelsToggle.getAttribute('aria-pressed')==='true';labelsToggle.setAttribute('aria-pressed',String(!visible));labelsToggle.textContent=`Harbor labels: ${visible?'off':'on'}`;portLayer.classList.toggle('labels-hidden',visible);});
const voyagesToggle=document.querySelector('#voyages-toggle'), voyagesPanel=document.querySelector('#routes');
voyagesToggle.addEventListener('click',()=>{const expanded=voyagesToggle.getAttribute('aria-expanded')==='true';voyagesToggle.setAttribute('aria-expanded',String(!expanded));voyagesPanel.hidden=expanded;});
let origin=null,pending=null,scene;
const portButtons=ports.map((port,index)=>{
  const button=document.createElement('button');button.type='button';button.className='harbor';button.style.left=`${port.x/12}%`;button.style.top=`${port.y/5.2}%`;
  button.innerHTML=`<span class="harbor-name">${port.name}</span><span class="harbor-goods" aria-hidden="true"><span class="good-made"><small>MAKES</small>${GOOD_INFO[simulation.ports[index].good].icon}</span><span class="good-needed"><small>NEEDS</small>${GOOD_INFO[simulation.ports[index].needs].icon}</span></span><span class="harbor-dot" aria-hidden="true"></span>`;
  button.addEventListener('click',()=>selectHarbor(index));portLayer.append(button);return button;
});
const key=document.querySelector('#goods-key'), goodsToggle=document.querySelector('#goods-toggle');
goodsToggle.addEventListener('click',()=>{const expanded=goodsToggle.getAttribute('aria-expanded')==='true';goodsToggle.setAttribute('aria-expanded',String(!expanded));key.hidden=expanded;});
for(const [name,info] of Object.entries(GOOD_INFO)){const row=document.createElement('div');row.className='key-row';row.textContent=`${info.icon} ${name} · ${info.seconds.toFixed(1)}s per unit`;key.append(row);}
const keyNote=document.createElement('p');keyNote.textContent=`The same interval applies to loading and unloading each unit. Ports produce one unit every 5 seconds; ships carry up to 8. Each unit delivered earns ${DELIVERY_REWARD} ducats.`;key.append(keyNote);
function updatePorts(){portLayer.classList.toggle('route-selecting',origin!==null);portButtons.forEach((button,i)=>{const p=simulation.ports[i],selected=origin===i||pending?.to===i;button.setAttribute('aria-label',`${ports[i].name}: produces ${p.good}, ${p.stock} in stock; needs ${p.needs}, ${p.received} received. ${origin===i?'Starting harbor selected.':pending?.to===i?'Destination harbor selected.':'Select harbor.'}`);button.setAttribute('aria-pressed',String(selected));});}
function clearOrigin(message='Select a starting harbor, then a destination.'){origin=null;pending=null;popover.hidden=true;confirm.hidden=true;confirm.disabled=false;instruction.textContent='';help.textContent='Select two harbors to trade';announcement.textContent=message;updatePorts();}
// Phaser may suppress the synthetic click after a touch on its canvas. Track
// taps before Phaser handles them; panning or touching a control is not cancel.
const mapShell=document.querySelector('.map-shell');let mapTouch=null;
const isMapBackground=target=>target instanceof Element&&!target.closest('button, .map-tools');
const cancelMapSelection=()=>clearOrigin('Route selection cancelled. Select a starting harbor.');
mapShell.addEventListener('click',event=>{if(origin!==null&&isMapBackground(event.target))cancelMapSelection();},true);
mapShell.addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch'&&origin!==null&&isMapBackground(event.target))mapTouch={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
},true);
mapShell.addEventListener('pointermove',event=>{
  if(mapTouch?.id===event.pointerId&&Math.hypot(event.clientX-mapTouch.x,event.clientY-mapTouch.y)>10)mapTouch.moved=true;
},true);
mapShell.addEventListener('pointerup',event=>{
  if(mapTouch?.id!==event.pointerId)return;
  const tap=!mapTouch.moved&&Math.hypot(event.clientX-mapTouch.x,event.clientY-mapTouch.y)<=10;mapTouch=null;
  if(tap&&origin!==null&&isMapBackground(event.target))cancelMapSelection();
},true);
mapShell.addEventListener('pointercancel',event=>{if(mapTouch?.id===event.pointerId)mapTouch=null;},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&origin!==null){clearOrigin('Route selection cancelled. Select a starting harbor.');}});
function selectHarbor(index){
  if(origin===null){origin=index;popover.hidden=true;help.textContent=`From ${ports[index].name}: select a destination, or select open water to cancel.`;announcement.textContent=help.textContent;updatePorts();return;}
  if(index===origin){clearOrigin('Route selection cancelled. Select a starting harbor.');return;}
  try {
    const path=seaPath(ports[origin],ports[index]);if(!path)throw new Error('No navigable route between those harbors.');
    const quote=quoteRoute(origin,index,path);pending={from:origin,to:index,path,quote};
    const good=simulation.ports[origin].good,mismatch=simulation.ports[index].needs!==good;
    pending.message=`${ports[origin].name} to ${ports[index].name}: ${quote.distance} nautical miles × ${DISTANCE_RATE} ducats = ${quote.distanceCost}, plus ship ${quote.shipCost}; total ${quote.total} ducats.${mismatch?` ${ports[index].name} needs ${simulation.ports[index].needs}; ${good} will be held.`:''}`;
    popover.hidden=false;refreshQuote();updatePorts();announcement.textContent=instruction.textContent;
    confirm.hidden=false;confirm.disabled=simulation.balance<quote.total;
  }catch(error){instruction.textContent=error.message;announcement.textContent=error.message;}
}
function refreshQuote(){
  if(!pending)return;
  const insufficient=simulation.balance<pending.quote.total;
  const message=pending.message+(insufficient?' Insufficient funds.':'');
  if(instruction.textContent!==message){instruction.textContent=message;announcement.textContent=message;}
  confirm.disabled=insufficient;
}
confirm.addEventListener('click',()=>{
  if(!pending)return;
  try{const {from,to,path}=pending,route=addRoute(simulation,from,to,path);paths.set(route.id,path);scene?.drawRoutes();renderRoutes();
    const mismatch=simulation.ports[to].needs!==route.good;
    clearOrigin(`Route ${ports[from].name} to ${ports[to].name} created. Loading ${route.good}.${mismatch?` ${ports[to].name} needs ${simulation.ports[to].needs}; cargo will be held on arrival.`:''}`);updateState();
  }catch(error){instruction.textContent=error.message;announcement.textContent=error.message;confirm.disabled=true;}
});
function routeText(route){const dest=simulation.ports[route.to];if(route.status==='Awaiting demand')return `Holding ${route.cargo}/${CAPACITY} ${route.good}; ${ports[route.to].name} needs ${dest.needs}`;return `${route.status} · ${route.cargo}/${CAPACITY} ${route.good} · ${GOOD_INFO[route.good].seconds.toFixed(1)}s per unit`;}
function renderRoutes(){
  const root=document.querySelector('#routes');root.replaceChildren();shipLayer.replaceChildren();document.querySelector('#route-count').textContent=simulation.routes.length;
  if(!simulation.routes.length){const p=document.createElement('p');p.textContent='No voyages yet. Select two harbors on the map.';root.append(p);return;}
  for(const route of simulation.routes){
    const row=document.createElement('section');row.className='route-row';row.dataset.id=route.id;row.setAttribute('aria-labelledby',`voyage-title-${route.id}`);const text=document.createElement('div');const title=document.createElement('strong');title.id=`voyage-title-${route.id}`;title.textContent=`${ports[route.from].name} → ${ports[route.to].name}`;const status=document.createElement('span');status.className='route-state';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent=routeText(route);text.append(title,status);
    const button=document.createElement('button');button.type='button';button.textContent='Remove';button.setAttribute('aria-label',`Remove route from ${ports[route.from].name} to ${ports[route.to].name}`);button.addEventListener('click',()=>{removeRoute(simulation,route.id);paths.delete(route.id);shipLayer.querySelector(`[data-id="${route.id}"]`)?.remove();scene?.drawRoutes();renderRoutes();updatePorts();announcement.textContent='Route removed; any cargo was returned to its origin.';voyagesToggle.focus();});row.append(text,button);root.append(row);
    const ship=document.createElement('div');ship.className='ship-label';ship.dataset.id=route.id;shipLayer.append(ship);
  }
}
function updateState(){
  treasury.textContent=`Treasury · ${simulation.balance} ducats`;
  refreshQuote();
  updatePorts();
  const placed=[];
  for(const route of simulation.routes){const status=document.querySelector(`.route-row[data-id="${route.id}"] .route-state`);if(status && status.textContent!==routeText(route))status.textContent=routeText(route);const ship=shipLayer.querySelector(`[data-id="${route.id}"]`);if(ship){const p=pointAlong(paths.get(route.id),route.progress);ship.style.left=`${p.x/12}%`;ship.style.top=`${p.y/5.2}%`;const offset=placed.filter(other=>Math.hypot(other.x-p.x,other.y-p.y)<25).length;placed.push(p);ship.style.transform=`translate(-50%, ${10+offset*22}px)`;ship.textContent=`⛵ ${GOOD_INFO[route.good].icon} ${route.cargo}/${CAPACITY} · ${route.status}`;}}
}
updatePorts();renderRoutes();

class MapScene extends Phaser.Scene {
  constructor(){ super('map'); }
  create(){
    scene=this;
    const g=this.add.graphics();
    g.fillStyle(0xa9c9c4).fillRect(0,0,1200,520);
    // A softly layered sea and a restrained cartographic grid.
    g.lineStyle(1,0x729e99,.16);
    for(let x=60;x<1200;x+=90) g.lineBetween(x,0,x,520);
    for(let y=40;y<520;y+=80) g.lineBetween(0,y,1200,y);
    // Modern Natural Earth country boundaries, clipped to the map frame.
    // Boundaries are a geographic reference, not historical political borders.
    for (const country of countries) {
      const points = country.ring.map(([lon, lat]) => project(lon, lat));
      g.fillStyle(0xe5dec5).lineStyle(1, 0xc1b998, .8);
      g.beginPath(); g.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(point => g.lineTo(point.x, point.y));
      g.closePath(); g.fillPath(); g.strokePath();
    }
    this.routeGraphics=this.add.graphics();
    this.shipGraphics=this.add.graphics();
    const label=(text,x,y,size=14,color='#6e938c',spacing=4)=>this.add.text(x,y,text,{fontFamily:'Georgia',fontStyle:'italic',fontSize:`${size}px`,color,letterSpacing:spacing}).setOrigin(.5);
    const seaLabel=(text,lon,lat,size=13)=>{const p=project(lon,lat);label(text,p.x,p.y,size)};
    seaLabel('A D R I A T I C   S E A', 15.2, 43, 11);
    seaLabel('I O N I A N   S E A', 18.5, 37, 11);
    seaLabel('A E G E A N   S E A', 24.6, 37.8, 10);
    seaLabel('E A S T E R N   M E D I T E R R A N E A N', 30, 33.4, 12);
    // Compass rose and map furniture.
    this.add.text(76,62,'N',{fontFamily:'Georgia',fontSize:'13px',color:'#547b72'}).setOrigin(.5);
    g.lineStyle(1,0x648e83,.8).strokeCircle(76,105,25).lineBetween(76,70,76,140).lineBetween(41,105,111,105);
    g.fillStyle(0x658c80,.7).fillTriangle(76,78,71,105,76,100).fillTriangle(76,132,81,105,76,110);
    this.add.text(48,432,'MARE NOSTRUM',{fontFamily:'Georgia',fontStyle:'italic',fontSize:'13px',color:'#638b83'});
    this.add.text(48,450,'A CARTOGRAPHIC STUDY',{fontFamily:'Arial',fontSize:'9px',color:'#789991',letterSpacing:2});

  }
  drawRoutes(){
    this.routeGraphics.clear().lineStyle(2,0xb36b50,.8);
    for(const path of paths.values()) {this.routeGraphics.beginPath();this.routeGraphics.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>this.routeGraphics.lineTo(p.x,p.y));this.routeGraphics.strokePath();}
  }
  update(time,delta){
    const now=Date.now(); if(this.lastTick) advance(simulation,Math.max(0,(now-this.lastTick)/1000)); this.lastTick=now;
    this.shipGraphics.clear();
    for(const route of simulation.routes){const path=paths.get(route.id);if(!path)continue;const p=pointAlong(path,route.progress);this.shipGraphics.fillStyle(0x355b50).fillCircle(p.x,p.y,7).fillStyle(0xf7ead0).fillTriangle(p.x-3,p.y+3,p.x+4,p.y+3,p.x,p.y-5);}
    updateState();
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1200,height:520,backgroundColor:'#a9c9c4',input:{touch:{capture:false}},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:MapScene,render:{antialias:true}});

