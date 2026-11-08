import { seaPath, routeDistanceNm } from './sea-routes.js';
import { ports as mapPorts } from './geography.js';
import { TOWN_BLUEPRINTS, createTownState, getTownGoods, addTownBuilding, advanceTownProduction, stockForGood, addStockForGood } from './town-economy.js';
import { createPopulation, runConsumptionCycle, resolvePopulationChanges, GOODS, RECIPES } from './population.js';
export const goods = Object.keys(GOODS);
const harborGoods = ['Glassware', 'Salt', 'Olive Oil', 'Wine', 'Raw Silk', 'Grain', 'Spices'];
const harborNeeds = ['Spices', 'Glassware', 'Salt', 'Olive Oil', 'Wine', 'Silk Garments', 'Grain'];
export const GOOD_INFO = {
  Glassware: { icon:'🏺', seconds:1.0 }, Salt: { icon:'🧂', seconds:.5 },
  'Olive Oil': { icon:'🫒', seconds:1.2 }, Wine: { icon:'🍷', seconds:1.1 },
  'Raw Silk': { icon:'🧵', seconds:1.5 }, Grain: { icon:'🌾', seconds:.6 },
  'Spices': { icon:'🌶️', seconds:1.3 }
};
const catalogIcons = { Grain:'🌾', Fish:'🐟', Olives:'🫒', Grapes:'🍇', Wool:'🐑', Timber:'🪵', 'Silica Sand':'⛏️', 'Raw Silk':'🧵', Bread:'🍞', 'Olive Oil':'🫒', 'Wool Cloth':'🧶', Furniture:'🪑', Glassware:'🏺', 'Silk Garments':'👘', 'Spiced Wine':'🍷' };
for (const good of Object.keys(GOODS)) GOOD_INFO[good] ??= { icon: catalogIcons[good] ?? '📦', seconds: 1 };
export const CAPACITY = 8;
export const STARTING_BALANCE = 1000;
export const SHIP_COST = 150;
export const DISTANCE_RATE = 0.2;
export const DELIVERY_REWARD = 20;
export const POPULATION_CYCLE_SECONDS = 30;
const initialResources = Object.keys(GOODS);
const asNeeds = port => {
  const populationNeeds = initialResources.filter(good => Object.entries(GOODS[good].needs).some(([, tiers]) => tiers.some(tier => port.population.residents[tier] > 0)));
  const workshopInputs = port.town ? Object.values(port.town.buildings).flatMap(building => Object.keys(RECIPES[building.output ?? ''] ?? {})) : [];
  return [...new Set([port.legacyNeed, ...populationNeeds, ...workshopInputs, ...(port.town ? getTownGoods(port.town).demanded : [])].filter(Boolean))];
};
export function quoteRoute(from,to,path) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || !mapPorts[from] || !mapPorts[to] || from===to) throw new Error('Choose two different ports.');
  const routePath=path ?? seaPath(mapPorts[from],mapPorts[to]);
  if(!routePath) throw new Error('No navigable route between those harbors.');
  const distance=routeDistanceNm(routePath),distanceCost=Math.ceil(distance*DISTANCE_RATE);
  return {distance,distanceCost,shipCost:SHIP_COST,total:SHIP_COST+distanceCost};
}
export const PRODUCTION_SECONDS = 5;
export const TRAVEL_SECONDS = 12;
function starterStock(population) {
  const { Low, Common } = population.residents;
  return {
    Grain: Low * 4,
    Wool: Low * 2,
    Fish: Common * 6,
    'Wool Cloth': Common * 2,
    Wine: Low + Common
  };
}
export function createSimulation() {
  const catalog = goods;
  const ports = harborGoods.map((good, i) => {
    const population = createPopulation({ seed: i + 1 });
    const goodsStock = Object.fromEntries(catalog.map(item => [item, item === good ? 12 : 0]));
    for (const [item, amount] of Object.entries(starterStock(population))) goodsStock[item] = Math.min(40, goodsStock[item] + amount);
    const legacyNeed = harborNeeds[i];
    return { good, needs: legacyNeed, legacyNeed, needsGoods: [legacyNeed], stock: goodsStock[good], goodsStock, received: 0, consumed: 0, clock: 0, consumptionClock: 0, town: null, population };
  });
  const towns = Object.fromEntries(Object.entries(TOWN_BLUEPRINTS).map(([id, blueprint]) => [id, createTownState(blueprint)]));
  for (const town of Object.values(towns)) {
    const port = ports[town.portIndex];
    port.town = town;
    const economy = getTownGoods(town);
    port.good = economy.produced.keys().next().value ?? port.good;
    port.needsGoods = economy.demanded.length ? economy.demanded : port.needsGoods;
    port.needs = port.needsGoods[0];
    port.consumptionSeconds = economy.consumptionSeconds;
  }
  for (const port of ports) { port.needsGoods = asNeeds(port); port.needs = port.legacyNeed; }
  return { balance: STARTING_BALANCE, ports, towns, routes: [], nextId: 1 };
}

export function placeProductionBuilding(state, portIndex, type, cell) {
  const port = state.ports[portIndex], town = port?.town;
  if (!town) throw new Error('This town does not have a building view yet.');
  const building = addTownBuilding(town, type, cell);
  const economy = getTownGoods(town);
  for (const good of economy.produced.keys()) port.goodsStock[good] ??= 0;
  port.stock = port.goodsStock[port.good] ?? port.stock;
  port.needsGoods = asNeeds(port);
  port.needs = port.legacyNeed;
  port.consumptionSeconds = economy.consumptionSeconds;
  return building;
}

export function selectTradeGood(state, from, to) {
  const source = state.ports[from], destination = state.ports[to];
  if (!source || !destination) return source?.good;
  const produced = source.town ? [...getTownGoods(source.town).produced.keys()] : [source.good];
  return destination.needsGoods?.find(good => produced.includes(good)) ?? source.good;
}

export function addRoute(state, from, to, path) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || !state.ports[from] || !state.ports[to] || from === to) throw new Error('Choose two different ports.');
  if (state.routes.some(route => route.from === from && route.to === to)) throw new Error('This route already exists.');
  const quote=quoteRoute(from,to,path);
  if(state.balance<quote.total) throw new Error(`Insufficient funds: need ${quote.total} ducats; treasury has ${state.balance}.`);
  state.balance-=quote.total;
  const route = { id:state.nextId++, from, to, good:selectTradeGood(state, from, to), cargo:0, progress:0, direction:1, status:'Loading', handling:0 };
  state.routes.push(route); return route;
}
export function removeRoute(state,id) {
  const route=state.routes.find(item=>item.id===id); if(route) addStockForGood(state.ports[route.from], route.good, route.cargo);
  state.routes=state.routes.filter(item=>item.id!==id);
}
export function advance(state,seconds) {
  if(!Number.isFinite(seconds)||seconds<=0)return;
  while(seconds>1e-9) {
    const dt=Math.min(seconds,.05);seconds-=dt;
    for(const port of state.ports){
      if (port.town) advanceTownProduction(port.town,port,dt);
      else {port.clock+=dt;while(port.clock+1e-9>=PRODUCTION_SECONDS){port.clock-=PRODUCTION_SECONDS;port.stock=Math.min(40,port.stock+1);port.goodsStock[port.good]=port.stock;}}
      port.consumptionClock += dt;
      while (port.consumptionClock + 1e-9 >= POPULATION_CYCLE_SECONDS) {
        port.consumptionClock -= POPULATION_CYCLE_SECONDS;
        const cycle = runConsumptionCycle(port.population, port.goodsStock, port.goodPriorities);
        resolvePopulationChanges(port.population);
        port.needsGoods = asNeeds(port);
        port.consumed += cycle.goodsConsumed;
      }
    }
    for(const route of state.routes){
      const source=state.ports[route.from],destination=state.ports[route.to],interval=GOOD_INFO[route.good].seconds;
      if(route.status==='Awaiting demand')continue;
      if(route.status==='Loading'||route.status==='Waiting for stock'){
        if(stockForGood(source,route.good)<=0){if(route.cargo>0){route.status='Sailing';route.handling=0;}else route.status='Waiting for stock';continue;}
        route.status='Loading';route.handling+=dt;
        if(route.handling+1e-9>=interval){route.handling-=interval;addStockForGood(source,route.good,-1);route.cargo++;if(route.cargo>=CAPACITY||stockForGood(source,route.good)===0){route.status='Sailing';route.handling=0;}}
        continue;
      }
      if(route.status==='Unloading'){
        route.handling+=dt;
        if(route.handling+1e-9>=interval){route.handling-=interval;route.cargo--;destination.received++;addStockForGood(destination,route.good,1);state.balance+=DELIVERY_REWARD;if(route.cargo===0){route.status='Returning';route.direction=-1;route.handling=0;}}
        continue;
      }
      route.progress+=route.direction*dt/TRAVEL_SECONDS;
      if(route.progress>=1){route.progress=1;route.handling=0;route.status=destination.needsGoods?.includes(route.good)||destination.needs===route.good?'Unloading':'Awaiting demand';}
      else if(route.progress<=0&&route.direction===-1){route.progress=0;route.direction=1;route.status='Loading';route.handling=0;}
    }
  }
}
