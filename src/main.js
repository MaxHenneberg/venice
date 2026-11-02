import Phaser from 'phaser';
import './style.css';
import countries from './geography.json' with { type: 'json' };
import { project, ports } from './geography.js';
import { createSimulation, addRoute, removeRoute, advance, CAPACITY } from './simulation.js';
import { seaPath, pointAlong } from './sea-routes.js';

const mapViewport = document.querySelector('.map-viewport');
mapViewport.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Home') mapViewport.scrollLeft = 0;
  else if (event.key === 'End') mapViewport.scrollLeft = mapViewport.scrollWidth;
  else mapViewport.scrollLeft += event.key === 'ArrowRight' ? 100 : -100;
});
// Start the narrow map near Venice while retaining access to the entire sea.
if (window.matchMedia('(max-width: 700px)').matches) {
  requestAnimationFrame(() => { mapViewport.scrollLeft = Math.max(0, project(12.3388, 45.4408).x / 1200 * mapViewport.scrollWidth - mapViewport.clientWidth / 2); });
}

const simulation = createSimulation();
const fromSelect = document.querySelector('#route-from'), toSelect = document.querySelector('#route-to');
for (const [index,port] of ports.entries()) for (const select of [fromSelect,toSelect]) select.add(new Option(port.name, index));
toSelect.value = '1';
const paths = new Map();
let drawing = false, drawStart = null;
let selected = 0;
let scene;
function selectPort(index) {
  selected = (index + ports.length) % ports.length;
  const port = ports[selected];
  document.querySelector('#port-number').textContent = `${String(selected + 1).padStart(2,'0')} / ${String(ports.length).padStart(2,'0')}`;
  document.querySelector('.eyebrow.small').textContent = port.tag;
  document.querySelector('#port-name').replaceChildren(document.createTextNode(port.name + ' '), Object.assign(document.createElement('em'), {textContent:port.english}));
  document.querySelector('#port-description').textContent = port.description;
  if (scene) scene.updateSelection();
  renderEconomy();
}
document.querySelector('#previous').addEventListener('click', () => selectPort(selected - 1));
document.querySelector('#next').addEventListener('click', () => selectPort(selected + 1));

function renderEconomy() {
  const economy = simulation.ports[selected];
  document.querySelector('#port-economy').innerHTML = `<div><small>PRODUCES</small><strong>${economy.good}</strong><span>${economy.stock} units in stock</span></div><div><small>NEEDS</small><strong>${economy.needs}</strong><span>${economy.received} units received</span></div>`;
}
function routeText(route) {
  const destination = simulation.ports[route.to];
  if (route.status === 'Awaiting demand') return `At ${ports[route.to].name} · holding ${route.cargo} / ${CAPACITY} ${route.good}; port needs ${destination.needs}`;
  if (route.status === 'Waiting for stock') return `At ${ports[route.from].name} · waiting for ${route.good}`;
  return `${route.status} · ${route.cargo} / ${CAPACITY} ${route.good} aboard · ${Math.round(route.progress * 100)}% along route`;
}
function renderRoutes() {
  const root=document.querySelector('#routes'); root.replaceChildren();
  if (!simulation.routes.length) {root.innerHTML='<p class="empty-routes">No routes yet. Choose two ports to send your first ship.</p>';return;}
  for (const route of simulation.routes) {
    const row=document.createElement('div'); row.className='route-row'; row.dataset.id=route.id;
    const text=document.createElement('div'); const title=document.createElement('strong'); title.textContent=`${ports[route.from].name} → ${ports[route.to].name}`;
    const status=document.createElement('span'); status.className='route-state'; status.textContent=routeText(route); text.append(title,status);
    const button=document.createElement('button'); button.type='button'; button.textContent='Remove'; button.setAttribute('aria-label',`Remove route from ${ports[route.from].name} to ${ports[route.to].name}`);
    button.addEventListener('click',()=>{removeRoute(simulation,route.id);paths.delete(route.id);scene?.drawRoutes();renderRoutes();renderEconomy();});row.append(text,button);root.append(row);
  }
}
function updateRouteStates() {for(const route of simulation.routes){const el=document.querySelector(`.route-row[data-id="${route.id}"] .route-state`);if(el)el.textContent=routeText(route);}renderEconomy();}
function createRoute(from,to) {
  try {
    if(from===to) throw new Error('Choose two different ports.');
    const path=seaPath(ports[from],ports[to]); if(!path) throw new Error('No navigable route between those ports.');
    const route=addRoute(simulation,from,to); paths.set(route.id,path); scene?.drawRoutes();renderRoutes();renderEconomy();
    const need=simulation.ports[to].needs;
    document.querySelector('#route-message').textContent=need===route.good ? `Ship launched with ${route.cargo} ${route.good}.` : `Ship launched with ${route.cargo} ${route.good}. ${ports[to].name} needs ${need}; the ship will retain its cargo there.`;
  } catch(error){document.querySelector('#route-message').textContent=error.message;}
}
document.querySelector('#route-form').addEventListener('submit',event=>{event.preventDefault();createRoute(Number(fromSelect.value),Number(toSelect.value));});
const drawButton=document.querySelector('#draw-route'), drawHint=document.querySelector('#draw-hint');
function setDrawing(value){drawing=value;drawStart=null;drawButton.setAttribute('aria-pressed',String(value));drawButton.textContent=value?'Cancel drawing':'✎  Draw on map';drawHint.textContent=value?'Select an origin port on the map.':'Choose two ports below, or draw a route by selecting ports on the map.';}
drawButton.addEventListener('click',()=>setDrawing(!drawing));
function mapPort(index){
  selectPort(index);
  if(!drawing)return;
  if(drawStart===null){drawStart=index;fromSelect.value=String(index);drawHint.textContent=`From ${ports[index].name}: select a destination port.`;}
  else if(index===drawStart){drawHint.textContent='Choose a different destination port.';}
  else {toSelect.value=String(index);createRoute(drawStart,index);setDrawing(false);}
}
renderEconomy();renderRoutes();

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
    this.markers=ports.map((p,i)=>{const group=this.add.container(p.x,p.y);const ring=this.add.circle(0,0,11,0xf0e8d3,.25).setStrokeStyle(1,0xa85e45,.65);const dot=this.add.circle(0,0,5,0xa85e45).setStrokeStyle(2,0xf6edda);const text=this.add.text(0,-20,p.name.toUpperCase(),{fontFamily:'Arial',fontSize:i===4?'10px':'11px',fontStyle:'bold',color:'#455b50',letterSpacing:1,backgroundColor:'#e8e3cf'}).setOrigin(.5,1).setPadding(4,2);group.add([ring,dot,text]);group.setSize(40,40).setInteractive({useHandCursor:true}).on('pointerdown',()=>mapPort(i));return {ring,dot,text};});
    // Compass rose and map furniture.
    this.add.text(76,62,'N',{fontFamily:'Georgia',fontSize:'13px',color:'#547b72'}).setOrigin(.5);
    g.lineStyle(1,0x648e83,.8).strokeCircle(76,105,25).lineBetween(76,70,76,140).lineBetween(41,105,111,105);
    g.fillStyle(0x658c80,.7).fillTriangle(76,78,71,105,76,100).fillTriangle(76,132,81,105,76,110);
    this.add.text(48,432,'MARE NOSTRUM',{fontFamily:'Georgia',fontStyle:'italic',fontSize:'13px',color:'#638b83'});
    this.add.text(48,450,'A CARTOGRAPHIC STUDY',{fontFamily:'Arial',fontSize:'9px',color:'#789991',letterSpacing:2});
    this.updateSelection();
  }
  drawRoutes(){
    this.routeGraphics.clear().lineStyle(2,0xb36b50,.8);
    for(const path of paths.values()) {this.routeGraphics.beginPath();this.routeGraphics.moveTo(path[0].x,path[0].y);path.slice(1).forEach(p=>this.routeGraphics.lineTo(p.x,p.y));this.routeGraphics.strokePath();}
  }
  update(time,delta){
    const now=Date.now(); if(this.lastTick) advance(simulation,Math.max(0,(now-this.lastTick)/1000)); this.lastTick=now;
    this.shipGraphics.clear();
    for(const route of simulation.routes){const path=paths.get(route.id);if(!path)continue;const p=pointAlong(path,route.progress);this.shipGraphics.fillStyle(0x355b50).fillCircle(p.x,p.y,7).fillStyle(0xf7ead0).fillTriangle(p.x-3,p.y+3,p.x+4,p.y+3,p.x,p.y-5);}
    if(!this.lastUi || time-this.lastUi>500){updateRouteStates();this.lastUi=time;}
  }
  updateSelection(){this.markers?.forEach((m,i)=>{m.ring.setRadius(i===selected?14:10).setFillStyle(i===selected?0xe8cfad:0xf0e8d3,i===selected?.7:.25);m.dot.setRadius(i===selected?6:5);});}
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1200,height:520,backgroundColor:'#a9c9c4',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:MapScene,render:{antialias:true}});

