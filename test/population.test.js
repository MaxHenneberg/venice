import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPopulation, runConsumptionCycle, resolvePopulationChanges, populationTotal, createGoodPriorities } from '../src/population.js';

test('cities get deterministic, slightly varied starting household counts', () => {
  const starts = Array.from({ length: 8 }, (_, seed) => createPopulation({ seed: seed + 1 }).residents);
  assert.deepEqual(createPopulation({ seed: 1 }).residents, starts[0]);
  assert.ok(new Set(starts.map(({ Low, Common }) => `${Low}/${Common}`)).size > 1);
  for (const { Low, Common, Upper } of starts) {
    assert.ok(Low >= 5 && Low <= 7); assert.ok(Common >= 1 && Common <= 3); assert.equal(Upper, 0);
  }
});

test('simulation gives every harbor a city population and opening provisions', async () => {
  const { createSimulation } = await import('../src/simulation.js');
  const state = createSimulation(), repeat = createSimulation();
  assert.equal(state.ports.length, 7);
  const starts = state.ports.map(port => port.population.residents);
  assert.ok(new Set(starts.map(({ Low, Common }) => `${Low}/${Common}`)).size > 1, 'the seven cities should not all start with the same population');
  assert.deepEqual(repeat.ports.map(port => port.population.residents), starts, 'each city seed should reproduce the same starting population');
  for (const port of state.ports) {
    const { Low, Common, Upper } = port.population.residents;
    assert.ok(Low >= 5 && Low <= 7); assert.ok(Common >= 1 && Common <= 3); assert.equal(Upper, 0);
    assert.ok(port.population.residents.Low > 0);
    assert.ok(port.goodsStock.Grain > 0);
    assert.ok(port.goodsStock.Wool > 0);
  }
});

test('whole goods fill needs by priority and excess points are discarded', () => {
  const population = createPopulation({ initial: { Low: 1, Common: 0, Upper: 0 } });
  const stock = { Bread: 1, Grain: 1, Wool: 2, Wine: 1 };
  const result = runConsumptionCycle(population, stock);
  assert.deepEqual(result.served.Low, { Food: 3, Comfort: 2, Entertainment: 2 });
  assert.equal(population.lastCycle.Low.happiness, 87.5);
  assert.equal(stock.Bread, 0); assert.equal(stock.Wool, 0); assert.equal(stock.Wine, 0);
});

test('one versatile luxury good serves only one need', () => {
  const population = createPopulation({ initial: { Low: 0, Common: 1, Upper: 0 } });
  const stock = { Glassware: 1 };
  runConsumptionCycle(population, stock);
  assert.equal(population.lastCycle.Common.served.Comfort, 3);
  assert.equal(population.lastCycle.Common.served.Entertainment, 0);
  assert.equal(stock.Glassware, 0);
});

test('players can change which good tier citizens use first', () => {
  const population = createPopulation({ initial: { Low: 1, Common: 0, Upper: 0 } });
  const stock = { Grain: 1, Bread: 1, 'Olive Oil': 1, Wool: 2, Wine: 1 };
  runConsumptionCycle(population, stock, createGoodPriorities('manufactured'));
  assert.equal(population.lastCycle.Low.served.Food, 4);
  assert.equal(stock.Grain, 1, 'crafted goods are preferred while the resource remains in storage');
  assert.equal(stock.Bread, 0);
});

test('uninterrupted growth triggers once and empty tiers never grow', () => {
  const population = createPopulation({ initial: { Low: 1, Common: 0, Upper: 0 } });
  const stock = { Bread: 2, 'Olive Oil': 1, Wool: 2, Wine: 1 };
  for (let i = 0; i < 4; i++) { runConsumptionCycle(population, { ...stock }); resolvePopulationChanges(population); }
  assert.equal(population.residents.Low, 2);
  assert.equal(population.counters.Low.growth, 0);
  const empty = createPopulation({ initial: { Low: 0, Common: 0, Upper: 0 } });
  for (let i = 0; i < 8; i++) { runConsumptionCycle(empty, {}); resolvePopulationChanges(empty); }
  assert.equal(populationTotal(empty), 0);
});

test('housing blocks growth while retaining one pending action', () => {
  const population = createPopulation({ initial: { Low: 12, Common: 0, Upper: 0 } });
  const stock = { Bread: 30, 'Olive Oil': 12, Wool: 24, Wine: 12 };
  for (let i = 0; i < 7; i++) { runConsumptionCycle(population, { ...stock }); resolvePopulationChanges(population); }
  assert.equal(population.residents.Low, 12);
  assert.equal(population.counters.Low.growth, 4);
});

test('common promotion waits for recent luxury consumption', () => {
  const population = createPopulation({ initial: { Low: 0, Common: 1, Upper: 0 } });
  const stock = { Bread: 6, 'Olive Oil': 6, Furniture: 4, Glassware: 2, Wine: 2 };
  const priorities = { Common: { Entertainment: ['Glassware'] } };
  for (let i = 0; i < 7; i++) { runConsumptionCycle(population, { ...stock }, priorities); resolvePopulationChanges(population); }
  assert.equal(population.residents.Upper, 0);
  runConsumptionCycle(population, { ...stock }, priorities); resolvePopulationChanges(population);
  assert.equal(population.residents.Upper, 1);
});

test('interrupted happiness breaks the consecutive growth streak', () => {
  const population = createPopulation({ initial: { Low: 1, Common: 0, Upper: 0 } });
  const goodCycle = { Bread: 2, 'Olive Oil': 1, Wool: 2, Wine: 1 };
  runConsumptionCycle(population, { ...goodCycle });
  runConsumptionCycle(population, {});
  assert.equal(population.counters.Low.growth, 0);
  for (let i = 0; i < 3; i++) { runConsumptionCycle(population, { ...goodCycle }); resolvePopulationChanges(population); }
  assert.equal(population.residents.Low, 1, 'three good cycles after a shortage are not enough for growth');
});

test('promotion and growth can mature together without moving a pop twice', () => {
  const population = createPopulation({ initial: { Low: 2, Common: 0, Upper: 0 } });
  population.counters.Low.growth = 4;
  population.counters.Low.promotion = 8;
  const moves = resolvePopulationChanges(population);
  assert.deepEqual(moves.map(move => move.type), ['promotion', 'growth']);
  assert.deepEqual(population.residents, { Low: 2, Common: 1, Upper: 0 });
});

test('simulation outcomes match when time advances in different step sizes', async () => {
  const { createSimulation, advance } = await import('../src/simulation.js');
  const whole = createSimulation(), split = createSimulation();
  advance(whole, 60);
  advance(split, 12.5); advance(split, 17.5); advance(split, 30);
  assert.deepEqual(whole.ports.map(port => ({ population: port.population.residents, stock: port.goodsStock, cycles: port.population.cycles })), split.ports.map(port => ({ population: port.population.residents, stock: port.goodsStock, cycles: port.population.cycles })));
});

