import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, advance, addRoute, placeProductionBuilding, GOOD_INFO, TRAVEL_SECONDS } from '../src/simulation.js';
import { BUILDING_TYPES, getTownGoods } from '../src/town-economy.js';

test('Venice town economy comes from its placed producer and demand buildings', () => {
  const state = createSimulation(), port = state.ports[0], town = state.towns.venezia;
  assert.equal(port.town, town);
  assert.equal(port.good, 'Glassware');
  assert.ok(port.needsGoods.includes('Spices'));
  const rates = getTownGoods(town);
  assert.equal(rates.produced.get('Glassware'), 1 / BUILDING_TYPES.glassworks.intervalSeconds);
  assert.equal(rates.consumptionSeconds.get('Spices'), GOOD_INFO.Spices.seconds);
  assert.equal(town.buildings.find(b => b.type === 'spiceMarket').type, 'spiceMarket');

  placeProductionBuilding(state, 0, 'glassworks', '1-3');
  placeProductionBuilding(state, 0, 'glassworks', '7-4');
  port.goodsStock['Silica Sand'] = 6; port.goodsStock.Salt = 3;
  assert.ok(Math.abs(getTownGoods(town).produced.get('Glassware') - 3 / BUILDING_TYPES.glassworks.intervalSeconds) < 1e-12);
  advance(state, 5);
  assert.equal(port.stock, 15, 'each workshop makes one Glassware after consuming its recipe inputs');
  assert.equal(port.goodsStock['Silica Sand'], 0);
  assert.equal(port.goodsStock.Salt, 0);
  assert.equal(state.ports[1].stock, 13, 'other towns keep the original production cadence');
});

test('Venice building placement rejects water, occupied plots, and non-producers', () => {
  const state = createSimulation();
  assert.throws(() => placeProductionBuilding(state, 0, 'glassworks', '4-1'), /water or outside/);
  assert.throws(() => placeProductionBuilding(state, 0, 'glassworks', '2-3'), /already occupied/);
  assert.throws(() => placeProductionBuilding(state, 0, 'spiceMarket', '1-3'), /not available for placement/);
  assert.throws(() => placeProductionBuilding(state, 1, 'glassworks', '2-3'), /does not have a building view/);
});

test('Spice Market demand stores matching cargo for production or population use', () => {
  const state = createSimulation(), route = addRoute(state, 6, 0);
  advance(state, 8 * GOOD_INFO.Spices.seconds + TRAVEL_SECONDS + 0.1);
  assert.equal(route.status, 'Unloading');
  assert.equal(state.ports[0].consumed, 0);
  advance(state, GOOD_INFO.Spices.seconds);
  assert.equal(state.ports[0].consumed, 0);
  assert.equal(state.ports[0].goodsStock.Spices, 1);
  assert.equal(state.towns.venezia.buildings.find(b => b.type === 'spiceMarket').consumed, 0);
});

test('recipe workshops wait for all inputs and consume them only when output fits', () => {
  const state = createSimulation(), port = state.ports[0];
  const building = placeProductionBuilding(state, 0, 'breadBakery', '1-3');
  port.goodsStock.Grain = 1;
  advance(state, BUILDING_TYPES.breadBakery.intervalSeconds);
  assert.equal(port.goodsStock.Bread, 0);
  assert.equal(port.goodsStock.Grain, 1);
  port.goodsStock.Grain = 2;
  advance(state, BUILDING_TYPES.breadBakery.intervalSeconds);
  assert.equal(port.goodsStock.Bread, 1);
  assert.equal(port.goodsStock.Grain, 0);
  assert.equal(building.produced, 1);
});

test('Venice can add a chosen trade-good workshop and ship its output to a matching harbor', () => {
  const state = createSimulation(), venice = state.ports[0];
  placeProductionBuilding(state, 0, 'breadBakery', '2-2');
  assert.equal(venice.goodsStock.Bread, 0);
  assert.equal(getTownGoods(venice.town).produced.get('Bread'), 1 / BUILDING_TYPES.breadBakery.intervalSeconds);
  advance(state, BUILDING_TYPES.breadBakery.intervalSeconds);
  assert.equal(venice.goodsStock.Bread, 1);
  assert.equal(venice.stock, 12, 'waiting for Glassware inputs leaves its own inventory unchanged');
  const route = addRoute(state, 0, 5);
  assert.equal(route.good, 'Bread');
  assert.ok(state.ports[5].needsGoods.includes(route.good), 'the selected cargo must match a good Alessandria needs');
  advance(state, GOOD_INFO.Bread.seconds);
  assert.equal(route.cargo, 1);
  assert.equal(venice.goodsStock.Bread, 0);
});

