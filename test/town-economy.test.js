import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, advance, addRoute, placeProductionBuilding, GOOD_INFO, TRAVEL_SECONDS } from '../src/simulation.js';
import { BUILDING_TYPES, getTownGoods } from '../src/town-economy.js';

test('Venice town economy comes from its placed producer and demand buildings', () => {
  const state = createSimulation(), port = state.ports[0], town = state.towns.venezia;
  assert.equal(port.town, town);
  assert.equal(port.good, 'Glass');
  assert.deepEqual(port.needsGoods, ['Spices']);
  const rates = getTownGoods(town);
  assert.equal(rates.produced.get('Glass'), 1 / BUILDING_TYPES.glassworks.intervalSeconds);
  assert.equal(rates.consumptionSeconds.get('Spices'), GOOD_INFO.Spices.seconds);
  assert.equal(town.buildings.find(b => b.type === 'spiceMarket').type, 'spiceMarket');

  placeProductionBuilding(state, 0, 'glassworks', '1-3');
  placeProductionBuilding(state, 0, 'glassworks', '7-4');
  assert.ok(Math.abs(getTownGoods(town).produced.get('Glass') - 3 / BUILDING_TYPES.glassworks.intervalSeconds) < 1e-12);
  advance(state, 5);
  assert.equal(port.stock, 15, 'each workshop adds one Glass to shared trade stock');
  assert.equal(state.ports[1].stock, 13, 'other towns keep the original production cadence');
});

test('Venice building placement rejects water, occupied plots, and non-producers', () => {
  const state = createSimulation();
  assert.throws(() => placeProductionBuilding(state, 0, 'glassworks', '4-1'), /water or outside/);
  assert.throws(() => placeProductionBuilding(state, 0, 'glassworks', '2-3'), /already occupied/);
  assert.throws(() => placeProductionBuilding(state, 0, 'spiceMarket', '1-3'), /not available for placement/);
  assert.throws(() => placeProductionBuilding(state, 1, 'glassworks', '2-3'), /does not have a building view/);
});

test('Spice Market demand accepts and records only matching arriving cargo', () => {
  const state = createSimulation(), route = addRoute(state, 6, 0);
  advance(state, 8 * GOOD_INFO.Spices.seconds + TRAVEL_SECONDS + 0.1);
  assert.equal(route.status, 'Unloading');
  assert.equal(state.ports[0].consumed, 0);
  advance(state, GOOD_INFO.Spices.seconds);
  assert.equal(state.ports[0].consumed, 1);
  assert.equal(state.towns.venezia.buildings.find(b => b.type === 'spiceMarket').consumed, 1);
});

test('Venice can add a chosen trade-good workshop and ship its output to a matching harbor', () => {
  const state = createSimulation(), venice = state.ports[0];
  placeProductionBuilding(state, 0, 'silkAtelier', '2-2');
  assert.equal(venice.goodsStock.Silk, 0);
  assert.equal(getTownGoods(venice.town).produced.get('Silk'), 1 / BUILDING_TYPES.silkAtelier.intervalSeconds);
  advance(state, BUILDING_TYPES.silkAtelier.intervalSeconds);
  assert.equal(venice.goodsStock.Silk, 1);
  assert.equal(venice.stock, 13, 'adding another good does not change Venice’s Glass inventory');
  const route = addRoute(state, 0, 5);
  assert.equal(route.good, 'Silk', 'the route chooses the source good required by Alessandria');
  advance(state, GOOD_INFO.Silk.seconds);
  assert.equal(route.cargo, 1);
  assert.equal(venice.goodsStock.Silk, 0);
});
