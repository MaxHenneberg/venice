import Phaser from 'phaser';
import './style.css';
import countries from './geography.json' with { type: 'json' };
import { project, ports } from './geography.js';
import { createSimulation, addRoute, removeRoute, advance, quoteRoute, placeProductionBuilding, selectTradeGood, DELIVERY_REWARD, DISTANCE_RATE, CAPACITY, GOOD_INFO, PRODUCTION_SECONDS } from './simulation.js';
import { seaPath, pointAlong } from './sea-routes.js';
import { BUILDING_TYPES, getTownGoods, stockForGood } from './town-economy.js';
import { drawVeniceBoard } from './town-map.js';

const mapViewport = document.querySelector('.map-viewport');
const mapWorld = document.querySelector('#map-zoom-spacer');
const mapGame = document.querySelector('#game');
const mapPortLayer = document.querySelector('#port-layer');
const mapShipLayer = document.querySelector('#ship-layer');
const mapZoomValue = document.querySelector('#map-zoom-value');
const mapZoomOut = document.querySelector('#map-zoom-out');
const mapZoomIn = document.querySelector('#map-zoom-in');
const mapZoomReset = document.querySelector('#map-zoom-reset');
const mapAspect = 1200 / 520;
let mapZoom = 1;
let mapBaseWidth = 0;
function layoutMapStage({ preserveCenter = true, previousZoom = mapZoom } = {}) {
  const oldWidth = mapBaseWidth;
  const oldWorldWidth = oldWidth * previousZoom;
  const oldWorldHeight = oldWidth / mapAspect * previousZoom;
  const centerX = oldWorldWidth ? (mapViewport.scrollLeft + mapViewport.clientWidth / 2) / oldWorldWidth : 0.5;
  const centerY = oldWorldHeight ? (mapViewport.scrollTop + mapViewport.clientHeight / 2) / oldWorldHeight : 0.5;
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const landscapePhone = window.matchMedia('(orientation: landscape) and (max-height: 500px) and (max-width: 1000px)').matches;
  const responsiveMinimum = landscapePhone ? Math.max(0, (window.innerHeight - 10) * mapAspect) : (mobile ? 1400 : 0);
  mapBaseWidth = Math.max(mapViewport.clientWidth, responsiveMinimum);
  const stageWidth = mapBaseWidth * mapZoom;
  const stageHeight = mapBaseWidth / mapAspect * mapZoom;
  mapWorld.style.width = `${stageWidth}px`;
  mapWorld.style.height = `${stageHeight}px`;
  mapGame.style.width = `${stageWidth}px`;
  mapGame.style.height = `${stageHeight}px`;
  for (const layer of [mapPortLayer, mapShipLayer]) {
    layer.style.width = `${stageWidth}px`;
    layer.style.height = `${stageHeight}px`;
    layer.style.setProperty('--map-zoom', mapZoom);
  }
  mapZoomValue.textContent = `${Math.round(mapZoom * 100)}%`;
  mapZoomOut.disabled = mapZoom <= 0.75;
  mapZoomIn.disabled = mapZoom >= 2;
  mapZoomReset.disabled = mapZoom === 1;
  if (preserveCenter && oldWidth) {
    // Commit the new scroll dimensions before setting the retained center.
    void mapWorld.offsetWidth;
    const restoreCenter = () => {
      mapViewport.scrollLeft = centerX * mapBaseWidth * mapZoom - mapViewport.clientWidth / 2;
      mapViewport.scrollTop = centerY * mapBaseWidth / mapAspect * mapZoom - mapViewport.clientHeight / 2;
    };
    restoreCenter();
    requestAnimationFrame(restoreCenter);
  }
}
function setMapZoom(value) {
  const previousZoom = mapZoom;
  mapZoom = Math.max(0.75, Math.min(2, Math.round(value * 100) / 100));
  layoutMapStage({ previousZoom });
  announcement.textContent = `Map zoom ${Math.round(mapZoom * 100)} percent.`;
}
mapZoomOut.addEventListener('click', () => setMapZoom(mapZoom - 0.25));
mapZoomIn.addEventListener('click', () => setMapZoom(mapZoom + 0.25));
mapZoomReset.addEventListener('click', () => setMapZoom(1));
layoutMapStage({ preserveCenter: false });
window.addEventListener('resize', () => layoutMapStage());
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
const mapShell=document.querySelector('.map-shell'), townInfo=document.querySelector('#town-info-popover'), townView=document.querySelector('#town-view');
const townBoard=document.querySelector('#town-board'), townViewClose=document.querySelector('#town-view-close'), townViewFeedback=document.querySelector('#town-view-feedback');
const labelsToggle=document.querySelector('#harbor-labels-toggle');
const landscapeMenu=document.querySelector('#landscape-menu-toggle'),landscapeControls=document.querySelector('#landscape-controls');
landscapeMenu.addEventListener('click',()=>{const expanded=landscapeMenu.getAttribute('aria-expanded')==='true';landscapeMenu.setAttribute('aria-expanded',String(!expanded));landscapeControls.classList.toggle('is-open',!expanded);});
labelsToggle.addEventListener('click',()=>{const visible=labelsToggle.getAttribute('aria-pressed')==='true';labelsToggle.setAttribute('aria-pressed',String(!visible));labelsToggle.textContent=`Harbor labels: ${visible?'off':'on'}`;portLayer.classList.toggle('labels-hidden',visible);});
const voyagesToggle=document.querySelector('#voyages-toggle'), voyagesPanel=document.querySelector('#routes');
voyagesToggle.addEventListener('click',()=>{const expanded=voyagesToggle.getAttribute('aria-expanded')==='true';voyagesToggle.setAttribute('aria-expanded',String(!expanded));voyagesPanel.hidden=expanded;});
let origin=null,pending=null,scene,activeTown=null,townViewPort=null,selectedBuilding='glassworks';
const radialMenu=document.createElement('div');radialMenu.className='harbor-radial';radialMenu.hidden=true;radialMenu.setAttribute('role','group');radialMenu.setAttribute('aria-label','Town actions');
const townInfoButton=document.createElement('button');townInfoButton.type='button';townInfoButton.id='town-info-action';townInfoButton.className='radial-action';townInfoButton.innerHTML='<span class="radial-glyph" aria-hidden="true">◉</span><span>Town Info</span>';
const tradeButton=document.createElement('button');tradeButton.type='button';tradeButton.id='create-route-action';tradeButton.className='radial-action';tradeButton.innerHTML='<span class="radial-glyph" aria-hidden="true">↗</span><span>Create Trade Route</span>';
const townViewButton=document.createElement('button');townViewButton.type='button';townViewButton.className='radial-action';townViewButton.innerHTML='<span class="radial-glyph" aria-hidden="true">⌂</span><span>Open Town View</span>';
radialMenu.append(townInfoButton,tradeButton);mapShell.append(radialMenu);
const portButtons=ports.map((port,index)=>{
  const button=document.createElement('button');button.type='button';button.className='harbor';button.style.left=`${port.x/12}%`;button.style.top=`${port.y/5.2}%`;
  button.innerHTML=`<span class="harbor-name">${port.name}</span><span class="harbor-goods" aria-hidden="true"><span class="good-made"><small>MAKES</small>${GOOD_INFO[simulation.ports[index].good].icon}</span><span class="good-needed"><small>NEEDS</small>${GOOD_INFO[simulation.ports[index].needs].icon}</span></span><span class="harbor-dot" aria-hidden="true"></span>`;
  button.setAttribute('aria-controls','harbor-radial');button.setAttribute('aria-expanded','false');
  if (simulation.ports[index].town) button.setAttribute('aria-haspopup','true');
  button.addEventListener('click',()=>{if(origin!==null){selectHarbor(index);return;}openTownActions(index);});portLayer.append(button);return button;
});
radialMenu.id='harbor-radial';
townInfoButton.addEventListener('click',()=>{if(activeTown!==null)openTownInfo(activeTown);});
tradeButton.addEventListener('click',()=>{if(activeTown!==null)beginRouteSelection(activeTown);});
townViewButton.addEventListener('click',()=>{if(activeTown!==null)openTownView(activeTown);});
townViewClose.addEventListener('click',()=>closeTownView({restoreFocus:true}));
townInfo.querySelector('.town-info-close').addEventListener('click',()=>dismissTownOverlays({restoreFocus:true}));
const key=document.querySelector('#goods-key'), goodsToggle=document.querySelector('#goods-toggle');
goodsToggle.addEventListener('click',()=>{const expanded=goodsToggle.getAttribute('aria-expanded')==='true';goodsToggle.setAttribute('aria-expanded',String(!expanded));key.hidden=expanded;});
for(const [name,info] of Object.entries(GOOD_INFO)){const row=document.createElement('div');row.className='key-row';row.textContent=`${info.icon} ${name} · ${info.seconds.toFixed(1)}s per unit`;key.append(row);}
const keyNote=document.createElement('p');keyNote.textContent=`The same interval applies to loading and unloading each unit. Ports produce one unit every 5 seconds; ships carry up to 8. Each unit delivered earns ${DELIVERY_REWARD} ducats.`;key.append(keyNote);
function updatePorts(){portLayer.classList.toggle('route-selecting',origin!==null);portButtons.forEach((button,i)=>{const p=simulation.ports[i],selected=origin===i||pending?.to===i||activeTown===i;button.setAttribute('aria-label',`${ports[i].name}: produces ${p.good}, ${p.stock} in stock; needs ${p.needs}, ${p.received} received and ${p.consumed} consumed. ${origin===i?'Starting harbor selected.':pending?.to===i?'Destination harbor selected.':activeTown===i?'Town actions open.':'Open town actions.'}`);button.setAttribute('aria-pressed',String(selected));});}
function dismissTownOverlays({restoreFocus=false}={}){const previous=activeTown;activeTown=null;radialMenu.hidden=true;townInfo.hidden=true;townInfo.removeAttribute('style');townViewButton.remove();if(previous!==null)portButtons[previous].setAttribute('aria-expanded','false');if(restoreFocus&&previous!==null)portButtons[previous].focus();updatePorts();}
function placeRadial(index){
  // Keep this overlay outside Phaser's #port-layer stacking context even if a
  // future map-layer refactor temporarily reparents it.
  if(radialMenu.parentElement!==mapShell)mapShell.append(radialMenu);
  const button=portButtons[index],shell=mapShell.getBoundingClientRect(),anchor=button.getBoundingClientRect(),toolbar=document.querySelector('.map-tools').getBoundingClientRect();
  radialMenu.hidden=false;radialMenu.style.left='0px';radialMenu.style.top='0px';const menu=radialMenu.getBoundingClientRect(),halfW=menu.width/2,halfH=menu.height/2,margin=4;
  const clamp=(value,half,size)=>Math.max(half+margin,Math.min(value,size-half-margin));
  const toolbarRect={left:toolbar.left-shell.left,right:toolbar.right-shell.left,top:toolbar.top-shell.top,bottom:toolbar.bottom-shell.top};
  const intersectsToolbar=(x,y)=>x+halfW>toolbarRect.left&&x-halfW<toolbarRect.right&&y+halfH>toolbarRect.top&&y-halfH<toolbarRect.bottom;
  const anchorX=anchor.left-shell.left+anchor.width/2,anchorY=anchor.top-shell.top+anchor.height/2;
  const candidates=[
    [anchorX,anchorY],
    [toolbarRect.left-halfW-8,anchorY],
    [anchorX,toolbarRect.bottom+halfH+8],
    [toolbarRect.left-halfW-8,toolbarRect.bottom+halfH+8],
    [anchorX,anchorY+halfH+12]
  ].map(([x,y])=>[clamp(x,halfW,shell.width),clamp(y,halfH,shell.height)]);
  const position=candidates.find(([x,y])=>!intersectsToolbar(x,y))??candidates[0];
  radialMenu.style.left=`${position[0]}px`;radialMenu.style.top=`${position[1]}px`;radialMenu.dataset.town=String(index);
}
function closeLandscapeControls(){if(window.matchMedia('(orientation: landscape) and (max-height: 500px) and (max-width: 1000px)').matches){landscapeMenu.setAttribute('aria-expanded','false');landscapeControls.classList.remove('is-open');}}
function openTownActions(index){closeLandscapeControls();dismissTownOverlays();activeTown=index;if(simulation.ports[index].town)radialMenu.append(townViewButton);placeRadial(index);portButtons[index].setAttribute('aria-expanded','true');updatePorts();townInfoButton.focus({preventScroll:true});}
function openTownInfo(index){radialMenu.hidden=true;const port=simulation.ports[index],good=GOOD_INFO[port.good],need=GOOD_INFO[port.needs],townGoods=port.town?getTownGoods(port.town):null;townInfo.querySelector('[data-town-name]').textContent=ports[index].name;townInfo.querySelector('[data-produced]').textContent=`${good.icon} ${port.good}`;
  const producers=port.town?.buildings.filter(b=>BUILDING_TYPES[b.type]?.output===port.good)??[];
  const productionRate=townGoods?(townGoods.produced.get(port.good)??0)*60:60/PRODUCTION_SECONDS;
  const productionInterval=producers.length?BUILDING_TYPES[producers[0].type].intervalSeconds:PRODUCTION_SECONDS;
  townInfo.querySelector('[data-production-rate]').textContent=`1 unit / ${productionInterval}s · ${productionRate.toFixed(1)} units per minute${port.town?` from ${producers.length} producer${producers.length===1?'':'s'}`:` (current cadence)`}`;
  townInfo.querySelector('[data-stock]').textContent=`${port.stock} units available`;
  townInfo.querySelector('[data-consumed]').textContent=`${need.icon} ${port.needs}`;const consumeSeconds=port.consumptionSeconds?.get(port.needs)??need.seconds;townInfo.querySelector('[data-consumption-rate]').textContent=`1 unit / ${consumeSeconds.toFixed(1)}s while compatible cargo unloads · ${formatRate(consumeSeconds)} per ship per minute`;
  townInfo.querySelector('[data-consumed-count]').textContent=`${port.consumed} units consumed from deliveries`;
  townInfo.hidden=false;positionTownInfo(index);townInfo.querySelector('.town-info-close').focus();announcement.textContent=`${ports[index].name} town information opened.`;}
function formatRate(seconds){return `${(60/seconds).toFixed(1)} units`;}
function positionTownInfo(index){
  const shell=mapShell.getBoundingClientRect(),button=portButtons[index].getBoundingClientRect(),toolbar=document.querySelector('.map-tools').getBoundingClientRect();
  townInfo.style.left='0px';townInfo.style.top='0px';const box=townInfo.getBoundingClientRect(),margin=10;
  const clamp=(value,size)=>Math.max(margin,Math.min(value,size-margin));
  const toolbarRect={left:toolbar.left-shell.left,right:toolbar.right-shell.left,top:toolbar.top-shell.top,bottom:toolbar.bottom-shell.top};
  const overlapsToolbar=(left,top)=>left+box.width>toolbarRect.left&&left<toolbarRect.right&&top+box.height>toolbarRect.top&&top<toolbarRect.bottom;
  const anchoredLeft=button.left-shell.left+button.width/2-box.width/2,anchoredTop=button.top-shell.top+button.height+12;
  let left=clamp(anchoredLeft,shell.width-box.width),top=clamp(anchoredTop,shell.height-box.height);
  if(overlapsToolbar(left,top)){
    const candidates=[
      [left,toolbarRect.bottom+margin],
      [left,toolbarRect.top-box.height-margin],
      [toolbarRect.left-box.width-margin,anchoredTop],
      [toolbarRect.right+margin,anchoredTop]
    ].map(([x,y])=>[clamp(x,shell.width-box.width),clamp(y,shell.height-box.height)]);
    const clear=candidates.find(([x,y])=>!overlapsToolbar(x,y));
    if(clear)[left,top]=clear;
  }
  townInfo.style.left=`${left}px`;townInfo.style.top=`${top}px`;
}
function renderTownChoices(town){const picker=document.querySelector('#production-choice');picker.replaceChildren();for(const type of town.buildableTypes){const def=BUILDING_TYPES[type];if(!def?.placeable||!def.output)continue;const option=document.createElement('option');option.value=type;option.textContent=def.icon+' '+def.output+' · '+def.label;picker.append(option);}picker.value=selectedBuilding;updateProductionChoice();picker.onchange=()=>{selectedBuilding=picker.value;updateProductionChoice();townViewFeedback.textContent=BUILDING_TYPES[selectedBuilding].label+' selected. Choose an empty city plot.';};}
function updateProductionChoice(){const def=BUILDING_TYPES[selectedBuilding];if(!def)return;document.querySelector('#production-description').textContent=def.description+' Goods enter Venice’s trade stores as they are made.';}
function openTownView(index){const port=simulation.ports[index];if(!port.town)return;dismissTownOverlays();townViewPort=index;selectedBuilding=port.town.buildableTypes.values().next().value??'glassworks';renderTownChoices(port.town);townView.hidden=false;renderTownBoard();updateTownView({renderBuildings:true});townViewClose.focus();announcement.textContent=ports[index].name+' town opened. Choose what to produce, then select an empty city plot.';}
function closeTownView({restoreFocus=false}={}){const previous=townViewPort;townView.hidden=true;townViewPort=null;if(restoreFocus&&previous!==null)portButtons[previous].focus();announcement.textContent='Returned to the Mediterranean map.';}
function renderTownBoard(){if(townViewPort===null)return;const town=simulation.ports[townViewPort].town;drawVeniceBoard(townBoard,town,cell=>{
  try{const building=placeProductionBuilding(simulation,townViewPort,selectedBuilding,cell);renderTownBoard();updateTownView({renderBuildings:true});townViewFeedback.textContent=`${BUILDING_TYPES[building.type].label} placed on plot ${cell}.`;
    announcement.textContent=townViewFeedback.textContent;
  }catch(error){townViewFeedback.textContent=error.message;}
});}
function updateTownView({renderBuildings=false}={}){if(townViewPort===null)return;const port=simulation.ports[townViewPort],town=port.town,goods=getTownGoods(town),consumer=town.buildings.find(b=>BUILDING_TYPES[b.type]?.input===port.needs),consumeSeconds=consumer?BUILDING_TYPES[consumer.type].consumptionSecondsPerUnit:GOOD_INFO[port.needs]?.seconds;
  document.querySelector('#town-view-output').textContent=[...goods.produced].map(([good,rate])=>(GOOD_INFO[good]?.icon??'')+' '+good+' · '+(rate*60).toFixed(0)+'/min').join('  ·  ')||'No production';
  document.querySelector('#town-view-demand').textContent=`${GOOD_INFO[port.needs]?.icon??''} ${port.needs} demand`;
  document.querySelector('#town-view-stock').textContent='Stores '+[...goods.produced.keys()].map(good=>(GOOD_INFO[good]?.icon??'')+stockForGood(port,good)).join(' · ')+' · '+port.consumed+' received';
  const list=document.querySelector('#town-building-list');
  if(renderBuildings)list.replaceChildren();
  for(const building of town.buildings){const def=BUILDING_TYPES[building.type];let li=list.querySelector(`[data-building-id="${building.id}"]`);
    if(!li&&renderBuildings){li=document.createElement('li');li.dataset.buildingId=building.id;list.append(li);}
    if(li)li.textContent=def.kind==='producer'?def.icon+' '+def.label+' · '+building.produced+' '+(building.output??def.output)+' · '+(60/def.intervalSeconds).toFixed(0)+'/min':def.icon+' '+def.label+' · '+building.consumed+' received · 1/'+consumeSeconds.toFixed(1)+'s while unloading';}
}
function repositionTownOverlays(){if(activeTown===null)return;if(!radialMenu.hidden)placeRadial(activeTown);if(!townInfo.hidden)positionTownInfo(activeTown);}
window.addEventListener('resize',repositionTownOverlays);mapViewport.addEventListener('scroll',()=>{if(activeTown!==null&&!townInfo.hidden)positionTownInfo(activeTown);},{passive:true});
function beginRouteSelection(index){closeLandscapeControls();dismissTownOverlays();origin=index;pending=null;popover.hidden=true;confirm.hidden=true;help.textContent=`From ${ports[index].name}: select a destination, or select open water to cancel.`;announcement.textContent=help.textContent;updatePorts();portButtons[index].focus();}
function clearOrigin(message='Select a starting harbor, then a destination.'){origin=null;pending=null;popover.hidden=true;confirm.hidden=true;confirm.disabled=false;instruction.textContent='';help.textContent='Select two harbors to trade';announcement.textContent=message;dismissTownOverlays();updatePorts();}
// Phaser may suppress the synthetic click after a touch on its canvas. Track
// taps before Phaser handles them; panning or touching a control is not cancel.
let mapTouch=null;
const isMapBackground=target=>target instanceof Element&&!target.closest('button, .map-tools');
const cancelMapSelection=()=>clearOrigin('Route selection cancelled. Select a starting harbor.');
mapShell.addEventListener('click',event=>{
  if(activeTown!==null&&!event.target.closest('.harbor-radial, .town-info-popover, .harbor'))dismissTownOverlays();
  if(origin!==null&&isMapBackground(event.target))cancelMapSelection();
},true);
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
document.addEventListener('keydown',event=>{
  if(!townView.hidden){
    if(event.key==='Escape'){closeTownView({restoreFocus:true});return;}
    if(event.key==='Tab'){
      const focusable=[...townView.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter(el=>!el.closest('[hidden]'));
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&(document.activeElement===first||!townView.contains(document.activeElement))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!townView.contains(document.activeElement))){event.preventDefault();first?.focus();}
    }
    return;
  }
  if(event.key!=='Escape')return;
  if(origin!==null){clearOrigin('Route selection cancelled. Select a starting harbor.');return;}
  if(activeTown!==null)dismissTownOverlays({restoreFocus:true});
});
function selectHarbor(index){
  closeLandscapeControls();
  if(origin===null){origin=index;popover.hidden=true;help.textContent=`From ${ports[index].name}: select a destination, or select open water to cancel.`;announcement.textContent=help.textContent;updatePorts();return;}
  if(index===origin){clearOrigin('Route selection cancelled. Select a starting harbor.');return;}
  try {
    const path=seaPath(ports[origin],ports[index]);if(!path)throw new Error('No navigable route between those harbors.');
    const quote=quoteRoute(origin,index,path);pending={from:origin,to:index,path,quote};
    const good=selectTradeGood(simulation,origin,index),mismatch=!(simulation.ports[index].needsGoods??[simulation.ports[index].needs]).includes(good);
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
    const mismatch=!(simulation.ports[to].needsGoods??[simulation.ports[to].needs]).includes(route.good);
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
  updateTownView();
  const placed=[];
  if(activeTown!==null&&!townInfo.hidden){const town=simulation.ports[activeTown];townInfo.querySelector('[data-stock]').textContent=`${town.stock} units available`;townInfo.querySelector('[data-consumed-count]').textContent=`${town.consumed} units consumed from deliveries`;}
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

