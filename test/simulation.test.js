import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, addRoute, removeRoute, advance, quoteRoute, STARTING_BALANCE, SHIP_COST, DELIVERY_REWARD, CAPACITY, GOOD_INFO, TRAVEL_SECONDS } from '../src/simulation.js';
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
test('route price reflects sea distance plus fixed ship cost, and cannot overdraw',()=>{
  const near=quoteRoute(0,1),far=quoteRoute(0,6);assert.ok(near.distance>0);assert.ok(far.distance>near.distance);assert.ok(far.total>near.total);assert.equal(near.total,SHIP_COST+near.distanceCost);
  const s=createSimulation();const route=addRoute(s,0,1);assert.equal(s.balance,STARTING_BALANCE-near.total);const remaining=s.balance;
  assert.throws(()=>addRoute(s,0,1),/already exists/);assert.equal(s.balance,remaining);
  s.balance=far.total-1;const nextId=s.nextId;assert.throws(()=>addRoute(s,0,6),/Insufficient funds/);assert.equal(s.balance,far.total-1);assert.equal(s.nextId,nextId);assert.equal(s.routes.length,1);
  removeRoute(s,route.id);assert.equal(s.balance,far.total-1);
});
test('only compatible units actually unloaded reward the treasury once',()=>{
  const s=createSimulation(),route=addRoute(s,0,1),afterPurchase=s.balance;advance(s,8*GOOD_INFO.Glass.seconds+TRAVEL_SECONDS+.1);assert.equal(s.balance,afterPurchase);
  advance(s,GOOD_INFO.Glass.seconds);assert.equal(s.balance,afterPurchase+DELIVERY_REWARD);assert.equal(s.ports[1].received,1);
  advance(s,GOOD_INFO.Glass.seconds*7);assert.equal(s.balance,afterPurchase+8*DELIVERY_REWARD);advance(s,1);assert.equal(s.balance,afterPurchase+8*DELIVERY_REWARD);
  const mismatch=createSimulation(),r=addRoute(mismatch,0,2),initial=mismatch.balance;advance(mismatch,8*GOOD_INFO.Glass.seconds+TRAVEL_SECONDS+10);assert.equal(r.status,'Awaiting demand');assert.equal(mismatch.balance,initial);removeRoute(mismatch,r.id);assert.equal(mismatch.balance,initial);
});
