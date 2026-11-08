export const POPULATION_TIERS = ['Low', 'Common', 'Upper'];
export const NEEDS = ['Food', 'Comfort', 'Entertainment'];
export const NEED_POINTS = {
  Low: { Food: 4, Comfort: 2, Entertainment: 2 },
  Common: { Food: 6, Comfort: 4, Entertainment: 2 },
  Upper: { Food: 8, Comfort: 6, Entertainment: 4 }
};
export const HOUSING = { Low: 12, Common: 6, Upper: 3 };
export const GOODS = {
  Grain: { tier: 'resource', points: 1, needs: { Food: ['Low'] } },
  Fish: { tier: 'resource', points: 1, needs: { Food: ['Low', 'Common'] } },
  Salt: { tier: 'resource', points: 1, needs: {} },
  Olives: { tier: 'resource', points: 1, needs: {} },
  Grapes: { tier: 'resource', points: 1, needs: { Food: ['Low'] } },
  Wool: { tier: 'resource', points: 1, needs: { Comfort: ['Low'] } },
  Timber: { tier: 'resource', points: 1, needs: {} },
  'Silica Sand': { tier: 'resource', points: 1, needs: {} },
  'Raw Silk': { tier: 'resource', points: 1, needs: {} },
  Spices: { tier: 'resource', points: 1, needs: {} },
  Bread: { tier: 'manufactured', points: 2, needs: { Food: ['Low', 'Common', 'Upper'] } },
  'Olive Oil': { tier: 'manufactured', points: 2, needs: { Food: ['Low', 'Common', 'Upper'] } },
  Wine: { tier: 'manufactured', points: 2, needs: { Entertainment: ['Low', 'Common'] } },
  'Wool Cloth': { tier: 'manufactured', points: 2, needs: { Comfort: ['Low', 'Common'] } },
  Furniture: { tier: 'manufactured', points: 2, needs: { Comfort: ['Low', 'Common'] } },
  Glassware: { tier: 'luxury', points: 3, needs: { Comfort: ['Common', 'Upper'], Entertainment: ['Common', 'Upper'] } },
  'Silk Garments': { tier: 'luxury', points: 3, needs: { Comfort: ['Upper'] } },
  'Spiced Wine': { tier: 'luxury', points: 3, needs: { Food: ['Upper'], Entertainment: ['Upper'] } }
};
export const RECIPES = {
  Bread: { Grain: 2 }, 'Olive Oil': { Olives: 2 }, Wine: { Grapes: 2 },
  'Wool Cloth': { Wool: 2 }, Furniture: { Timber: 2 },
  Glassware: { 'Silica Sand': 2, Salt: 1 }, 'Silk Garments': { 'Raw Silk': 2, 'Wool Cloth': 1 },
  'Spiced Wine': { Wine: 1, Spices: 1 }
};
export const GOODS_PRIORITY_ORDERS = ['resources', 'manufactured', 'luxury'];
export function createGoodPriorities(first = 'resources') {
  const orders = first === 'manufactured' ? ['manufactured', 'resource', 'luxury'] : first === 'luxury' ? ['luxury', 'manufactured', 'resource'] : ['resource', 'manufactured', 'luxury'];
  const rank = Object.fromEntries(orders.map((tier, index) => [tier, index]));
  const all = Object.keys(GOODS).sort((a, b) => rank[GOODS[a].tier] - rank[GOODS[b].tier] || a.localeCompare(b));
  return Object.fromEntries(POPULATION_TIERS.map(tier => [tier, Object.fromEntries(NEEDS.map(need => [need, all.filter(good => GOODS[good].needs[need]?.includes(tier))]))]));
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}

export function createPopulation({ seed = 1, initial } = {}) {
  const random = seededRandom(seed);
  const low = initial?.Low ?? 5 + Math.floor(random() * 3);
  const common = initial?.Common ?? 1 + Math.floor(random() * 3);
  return {
    residents: { Low: low, Common: common, Upper: initial?.Upper ?? 0 },
    housing: { ...HOUSING },
    counters: Object.fromEntries(POPULATION_TIERS.map(tier => [tier, { growth: 0, promotion: 0, decline: 0 }])),
    cycles: 0,
    rotation: Object.fromEntries(NEEDS.map(need => [need, 0])),
    luxuryCycles: { Common: [] },
    lastCycle: Object.fromEntries(POPULATION_TIERS.map(tier => [tier, { happiness: null, needs: Object.fromEntries(NEEDS.map(need => [need, null])), requested: 0, supplied: 0 }]))
  };
}

export function populationTotal(population) { return POPULATION_TIERS.reduce((sum, tier) => sum + population.residents[tier], 0); }

function eligibleGoods(tier, need, stock, priorities) {
  const rank = { resource: 0, manufactured: 1, luxury: 2 };
  const defaults = Object.keys(GOODS).sort((a, b) => rank[GOODS[a].tier] - rank[GOODS[b].tier] || a.localeCompare(b));
  const order = [...(priorities?.[tier]?.[need] ?? []), ...defaults].filter((good, index, all) => GOODS[good]?.needs[need]?.includes(tier) && all.indexOf(good) === index);
  return order.filter(good => (stock[good] ?? 0) > 0);
}

export function runConsumptionCycle(population, stock, priorities = {}) {
  let goodsConsumed = 0;
  const served = Object.fromEntries(POPULATION_TIERS.map(tier => [tier, Object.fromEntries(NEEDS.map(need => [need, 0]))]));
  const luxuryConsumed = Object.fromEntries(POPULATION_TIERS.map(tier => [tier, false]));
  const demand = Object.fromEntries(POPULATION_TIERS.map(tier => [tier, Object.fromEntries(NEEDS.map(need => [need, population.residents[tier] * NEED_POINTS[tier][need]]))]));
  for (const need of NEEDS) {
    const populated = POPULATION_TIERS.filter(tier => population.residents[tier] > 0);
    if (!populated.length) continue;
    const offset = population.rotation[need] % populated.length;
    const order = [...populated.slice(offset), ...populated.slice(0, offset)];
    let lastServed = -1;
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (let i = 0; i < order.length; i++) {
        const tier = order[i];
        const popLimit = Math.min(population.residents[tier], Math.ceil((demand[tier][need] - served[tier][need]) / NEED_POINTS[tier][need]));
        for (let pop = 0; pop < popLimit; pop++) {
          if (served[tier][need] >= demand[tier][need]) break;
          const good = eligibleGoods(tier, need, stock, priorities)[0];
          if (!good) continue;
          stock[good]--;
          goodsConsumed++;
          if (GOODS[good].tier === 'luxury') luxuryConsumed[tier] = true;
          served[tier][need] += Math.min(GOODS[good].points, demand[tier][need] - served[tier][need]);
          progressed = true; lastServed = i;
        }
      }
    }
    if (lastServed >= 0) population.rotation[need] = (offset + lastServed + 1) % populated.length;
  }
  population.luxuryCycles.Common = [...(population.luxuryCycles.Common ?? []).slice(-3), luxuryConsumed.Common];
  population.cycles++;
  for (const tier of POPULATION_TIERS) {
    const requested = NEEDS.reduce((sum, need) => sum + demand[tier][need], 0);
    const supplied = NEEDS.reduce((sum, need) => sum + served[tier][need], 0);
    const tierNeeds = Object.fromEntries(NEEDS.map(need => [need, demand[tier][need] ? served[tier][need] / demand[tier][need] * 100 : null]));
    const happiness = requested ? supplied / requested * 100 : null;
    population.lastCycle[tier] = { happiness, needs: tierNeeds, requested, supplied, served: { ...served[tier] }, demand: { ...demand[tier] } };
    population.lastCycle[tier].luxuryConsumed = luxuryConsumed[tier];
    const counters = population.counters[tier];
    if (happiness === null) { counters.growth = counters.promotion = counters.decline = 0; continue; }
    counters.growth = happiness >= 60 ? Math.min(4, counters.growth + 1) : 0;
    counters.promotion = happiness >= 80 && NEEDS.every(need => tierNeeds[need] >= 70) ? Math.min(8, counters.promotion + 1) : 0;
    counters.decline = happiness < 40 ? Math.min(4, counters.decline + 1) : 0;
  }
  return { demand, served, goodsConsumed };
}

export function resolvePopulationChanges(population) {
  const moves = [];
  const canHouse = tier => population.residents[tier] < population.housing[tier];
  // Losses and demotions first, from the highest tier downward.
  for (const tier of ['Upper', 'Common', 'Low']) {
    const counters = population.counters[tier];
    if (counters.decline < 4) continue;
    const lower = tier === 'Upper' ? 'Common' : tier === 'Common' ? 'Low' : null;
    if (population.residents[tier] > 0) {
      population.residents[tier]--;
      const demote = Boolean(lower && canHouse(lower));
      if (demote) population.residents[lower]++;
      moves.push({ type: demote ? 'demotion' : 'departure', from: tier, to: demote ? lower : null });
    }
    counters.decline = 0; counters.growth = 0; counters.promotion = 0;
  }
  const moved = new Set(moves.map(move => move.from));
  const promotedSources = new Set();
  for (const tier of ['Common', 'Low']) {
    if (moved.has(tier) || !population.residents[tier] || population.counters[tier].promotion < 8) continue;
    const target = tier === 'Low' ? 'Common' : 'Upper';
    const luxuryOkay = tier !== 'Common' || (population.luxuryCycles.Common ?? []).some(Boolean);
    if (!luxuryOkay || !canHouse(target)) continue;
    population.residents[tier]--; population.residents[target]++;
    population.counters[tier].promotion = 0; population.counters[target].promotion = 0;
    moves.push({ type: 'promotion', from: tier, to: target }); moved.add(tier); moved.add(target); promotedSources.add(tier);
  }
  for (const tier of ['Upper', 'Common', 'Low']) {
    const counters = population.counters[tier];
    if ((moved.has(tier) && !promotedSources.has(tier)) || !population.residents[tier] || counters.growth < 4) continue;
    if (!canHouse(tier)) continue;
    population.residents[tier]++; counters.growth = 0;
    moves.push({ type: 'growth', from: tier, to: tier }); moved.add(tier);
  }
  return moves;
}

export function populationProgress(population, tier) {
  const counters = population.counters[tier], latest = population.lastCycle[tier];
  const canHouse = target => population.residents[target] < population.housing[target];
  const decline = latest.happiness !== null && latest.happiness < 40;
  const grow = latest.happiness !== null && latest.happiness >= 60;
  const promote = latest.happiness !== null && latest.happiness >= 80 && NEEDS.every(need => latest.needs[need] >= 70);
  const candidates = [];
  if (decline) candidates.push({ action: tier === 'Low' ? 'leaving' : 'decline', count: counters.decline, target: 4 });
  if (promote && tier !== 'Upper') {
    const target = tier === 'Low' ? 'Common' : 'Upper';
    candidates.push({ action: 'promotion', count: counters.promotion, target: 8, blocker: !canHouse(target) ? `${target} homes full` : tier === 'Common' && !(population.luxuryCycles.Common ?? []).some(Boolean) ? 'needs a luxury good' : null });
  }
  if (grow) candidates.push({ action: 'growth', count: counters.growth, target: 4, blocker: !canHouse(tier) ? 'homes full' : null });
  return candidates;
}
