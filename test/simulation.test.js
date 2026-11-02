import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, addRoute, advance, CAPACITY, PRODUCTION_SECONDS, TRAVEL_SECONDS } from '../src/simulation.js';
import { seaPath, onLand } from '../src/sea-routes.js';
import { ports } from '../src/geography.js';

test('production and loading respect stock and capacity; needed goods are delivered', () => {
  const s=createSimulation(); s.ports[0].stock=3;
  const r=addRoute(s,0,1); assert.equal(r.cargo,3); assert.equal(s.ports[0].stock,0);
  advance(s,PRODUCTION_SECONDS); assert.equal(s.ports[0].stock,1); assert.ok(r.progress>0&&r.progress<1);
  advance(s,TRAVEL_SECONDS); assert.equal(s.ports[1].received,3); assert.equal(r.cargo,0); assert.equal(r.status,'Returning');
  const other=createSimulation();const full=addRoute(other,0,1);assert.equal(full.cargo,CAPACITY);assert.equal(other.ports[0].stock,4);
});
test('incompatible destination retains cargo rather than unloading', () => {
  const s=createSimulation(),r=addRoute(s,0,2); advance(s,TRAVEL_SECONDS+1);
  assert.equal(r.status,'Awaiting demand');assert.equal(r.cargo,CAPACITY);assert.equal(s.ports[2].received,0);
  advance(s,30);assert.equal(r.cargo,CAPACITY);assert.equal(r.progress,1);
});
test('water path from Venice to Beirut avoids land between coastal endpoints', () => {
  const path=seaPath(ports[0],ports[6]);assert.ok(path?.length>2);
  for(let i=1;i<path.length-2;i++){const a=path[i],b=path[i+1],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);for(let j=0;j<=steps;j++){const t=j/steps;assert.equal(onLand(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t),false);}}
});
test('every port pair has a connected sea route', () => {
  for (let i=0;i<ports.length;i++) for (let j=i+1;j<ports.length;j++) assert.ok(seaPath(ports[i],ports[j]), `${ports[i].name} to ${ports[j].name}`);
});
