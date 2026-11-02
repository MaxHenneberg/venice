import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, addRoute, removeRoute, advance, CAPACITY, GOOD_INFO, TRAVEL_SECONDS } from '../src/simulation.js';
import { seaPath, onLand } from '../src/sea-routes.js';
import { ports } from '../src/geography.js';
test('loading and unloading handle one unit per good-specific interval', () => {
  const s=createSimulation(),r=addRoute(s,0,1),interval=GOOD_INFO.Glass.seconds;
  assert.equal(r.cargo,0);advance(s,interval-.1);assert.equal(r.cargo,0);advance(s,.1);assert.equal(r.cargo,1);assert.equal(s.ports[0].stock,11);
  advance(s,interval*7);assert.equal(r.cargo,CAPACITY);assert.equal(r.status,'Sailing');
  advance(s,TRAVEL_SECONDS+.1);assert.equal(r.status,'Unloading');assert.equal(s.ports[1].received,0);assert.equal(r.cargo,8);
  advance(s,interval);assert.equal(s.ports[1].received,1);assert.equal(r.cargo,7);
  advance(s,interval*7);assert.equal(s.ports[1].received,8);assert.equal(r.cargo,0);assert.equal(r.status,'Returning');
});
test('goods have distinct handling rates and loading never exceeds available stock', () => {
  const s=createSimulation();s.ports[0].stock=2;const glass=addRoute(s,0,1),salt=addRoute(s,1,2);
  advance(s,GOOD_INFO.Salt.seconds);assert.equal(salt.cargo,1);assert.equal(glass.cargo,0);
  advance(s,1.5);assert.equal(glass.cargo,2);assert.equal(glass.status,'Sailing');assert.equal(s.ports[0].stock,0);
});
test('incompatible destination retains all cargo and removal returns it', () => {
  const s=createSimulation(),r=addRoute(s,0,2);advance(s,GOOD_INFO.Glass.seconds*8+TRAVEL_SECONDS+1);
  assert.equal(r.status,'Awaiting demand');assert.equal(r.cargo,CAPACITY);assert.equal(s.ports[2].received,0);
  const before=s.ports[0].stock;removeRoute(s,r.id);assert.equal(s.ports[0].stock,before+8);
});
test('water path from Venice to Beirut avoids land between coastal endpoints', () => {
  const path=seaPath(ports[0],ports[6]);assert.ok(path?.length>2);
  for(let i=1;i<path.length-2;i++){const a=path[i],b=path[i+1],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);for(let j=0;j<=steps;j++){const t=j/steps;assert.equal(onLand(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t),false);}}
});
test('every port pair has a connected sea route',()=>{for(let i=0;i<ports.length;i++)for(let j=i+1;j<ports.length;j++)assert.ok(seaPath(ports[i],ports[j]));});
