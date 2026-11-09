// Town content is data driven so later cities can define their own recipes and plots.
export const BUILDING_TYPES = {
  glassworks: {
    label: 'Glassworks',
    kind: 'producer',
    output: 'Glassware',
    recipe: { 'Silica Sand': 2, Salt: 1 },
    intervalSeconds: 5,
    placeable: true,
    icon: '🏺',
    description: 'Makes one Glassware from 2 Silica Sand and 1 Salt.'
  },
  spiceMarket: {
    label: 'Spice Market',
    kind: 'consumer',
    input: 'Spices',
    consumptionSecondsPerUnit: 1.3,
    placeable: false,
    icon: '🌶️',
    description: 'Receives Spices brought by Venetian traders.'
  },
  saltworks: {
    label: 'Salt Works', kind: 'producer', output: 'Salt', intervalSeconds: 5,
    placeable: true, icon: '🧂', description: 'Evaporates one unit of Salt every 5 seconds.'
  },
  olivePress: {
    label: 'Oil Press', kind: 'producer', output: 'Olive Oil', recipe: { Olives: 2 }, intervalSeconds: 5,
    placeable: true, icon: '🫒', description: 'Presses Olive Oil from 2 Olives.'
  },
  wineCellar: {
    label: 'Wine Cellar', kind: 'producer', output: 'Wine', recipe: { Grapes: 2 }, intervalSeconds: 5,
    placeable: true, icon: '🍷', description: 'Makes Wine from 2 Grapes.'
  },
  silkAtelier: {
    label: 'Silk Atelier', kind: 'producer', output: 'Silk Garments', recipe: { 'Raw Silk': 2, 'Wool Cloth': 1 }, intervalSeconds: 5,
    placeable: true, icon: '🧵', description: 'Weaves Silk Garments from Raw Silk and Wool Cloth.'
  },
  grainMill: {
    label: 'Grain Mill', kind: 'producer', output: 'Grain', intervalSeconds: 5,
    placeable: true, icon: '🌾', description: 'Mills one unit of Grain every 5 seconds.'
  },
  spiceHouse: {
    label: 'Spiced Wine Cellar', kind: 'producer', output: 'Spiced Wine', recipe: { Wine: 1, Spices: 1 }, intervalSeconds: 5,
    placeable: true, icon: '🌶️', description: 'Blends one Spiced Wine from Wine and Spices every 5 seconds.'
  },
  breadBakery: { label: 'Bakery', kind: 'producer', output: 'Bread', recipe: { Grain: 2 }, intervalSeconds: 5, placeable: true, icon: '🍞', description: 'Bakes Bread from 2 Grain. Imports Grain as needed.' },
  woolMill: { label: 'Wool Mill', kind: 'producer', output: 'Wool Cloth', recipe: { Wool: 2 }, intervalSeconds: 5, placeable: true, icon: '🧶', description: 'Weaves Wool Cloth from 2 Wool.' },
  furnitureWorkshop: { label: 'Furniture Workshop', kind: 'producer', output: 'Furniture', recipe: { Timber: 2 }, intervalSeconds: 5, placeable: true, icon: '🪑', description: 'Makes Furniture from 2 Timber.' },
  glassStudio: { label: 'Glass Studio', kind: 'producer', output: 'Glassware', recipe: { 'Silica Sand': 2, Salt: 1 }, intervalSeconds: 5, placeable: true, icon: '🏺', description: 'Makes Glassware from 2 Silica Sand and 1 Salt.' },
  silkTailor: { label: 'Silk Tailor', kind: 'producer', output: 'Silk Garments', recipe: { 'Raw Silk': 2, 'Wool Cloth': 1 }, intervalSeconds: 5, placeable: true, icon: '🪡', description: 'Sews Silk Garments from Raw Silk and Wool Cloth.' },
  oliveGrove: { label: 'Olive Grove', kind: 'producer', output: 'Olives', intervalSeconds: 5, placeable: true, icon: '🫒', description: 'Harvests one Olives every 5 seconds.' },
  grapeVineyard: { label: 'Grape Vineyard', kind: 'producer', output: 'Grapes', intervalSeconds: 5, placeable: true, icon: '🍇', description: 'Harvests one Grapes every 5 seconds.' },
  woolFarm: { label: 'Sheep Pasture', kind: 'producer', output: 'Wool', intervalSeconds: 5, placeable: true, icon: '🐑', description: 'Produces one Wool every 5 seconds.' },
  timberYard: { label: 'Timber Yard', kind: 'producer', output: 'Timber', intervalSeconds: 5, placeable: true, icon: '🪵', description: 'Cuts one Timber every 5 seconds.' },
  sandQuarry: { label: 'Sand Quarry', kind: 'producer', output: 'Silica Sand', intervalSeconds: 5, placeable: true, icon: '⛏️', description: 'Quarries one Silica Sand every 5 seconds.' },
  silkMarket: { label: 'Silk Exchange', kind: 'producer', output: 'Raw Silk', intervalSeconds: 5, placeable: true, icon: '🧵', description: 'Sources one Raw Silk every 5 seconds.' },
  fishingPier: { label: 'Fishing Pier', kind: 'producer', output: 'Fish', intervalSeconds: 5, placeable: true, icon: '🐟', description: 'Brings in one Fish every 5 seconds.' }
};

// Axial plot rows follow the city islands and Giudecca; omit cells crossed by
// the Grand Canal and keep the outer cells inset from the shoreline.
const canalByRow = { 1: [4], 2: [3, 4], 3: [3, 4], 4: [5], 5: [5], 6: [] };
const landCells = [];
for (let r = 1; r <= 6; r++) {
  for (let q = 0; q <= 8; q++) {
    if (r === 5 || (r === 6 && q > 6)) continue;
    if (canalByRow[r].includes(q)) continue;
    if ((r === 1 || r === 5 || r === 6) && (q === 0 || q === 8)) continue;
    landCells.push(`${q}-${r}`);
  }
}

export const TOWN_BLUEPRINTS = {
  venezia: {
    portIndex: 0,
    name: 'Venezia',
    buildableTypes: ['glassworks', 'saltworks', 'olivePress', 'wineCellar', 'silkAtelier', 'grainMill', 'spiceHouse', 'breadBakery', 'woolMill', 'furnitureWorkshop', 'silkTailor', 'oliveGrove', 'grapeVineyard', 'woolFarm', 'timberYard', 'sandQuarry', 'silkMarket', 'fishingPier'],
    buildableCells: landCells,
    buildings: [
      { id: 'venice-glassworks-1', type: 'glassworks', cell: '2-3' },
      { id: 'venice-spice-market-1', type: 'spiceMarket', cell: '6-2' }
    ]
  }
};

export const VENICE_LAND_CELLS = new Set(landCells);

export function createTownState(blueprint) {
  return {
    id: blueprint.name.toLowerCase(),
    name: blueprint.name,
    portIndex: blueprint.portIndex,
    buildableTypes: new Set(blueprint.buildableTypes ?? []),
    buildings: blueprint.buildings.map((building, index) => ({
      ...building,
      id: building.id ?? `${blueprint.name.toLowerCase()}-${building.type}-${index + 1}`,
      clock: 0,
      produced: 0,
      consumed: 0
    })),
    buildableCells: new Set(blueprint.buildableCells),
    nextBuildingId: blueprint.buildings.length + 1
  };
}

export function getTownGoods(town) {
  const produced = new Map();
  const demanded = new Set();
  const consumptionSeconds = new Map();
  for (const building of town.buildings) {
    const definition = BUILDING_TYPES[building.type];
    if (!definition) continue;
    const output = building.output ?? definition.output;
    if (output) produced.set(output, (produced.get(output) ?? 0) + 1 / definition.intervalSeconds);
    if (definition.input) {
      demanded.add(definition.input);
      consumptionSeconds.set(definition.input, Math.min(consumptionSeconds.get(definition.input) ?? Infinity, definition.consumptionSecondsPerUnit));
    }
  }
  return { produced, demanded: [...demanded], consumptionSeconds };
}

export function addTownBuilding(town, type, cell) {
  const definition = BUILDING_TYPES[type];
  if (!definition) throw new Error('Choose a known building.');
  if (!town.buildableCells.has(cell)) throw new Error('That tile is water or outside the town.');
  if (town.buildings.some(building => building.cell === cell)) throw new Error('That tile is already occupied.');
  if (!definition.placeable || !town.buildableTypes.has(type)) throw new Error('That building is not available for placement in this town.');
  const building = { id: `${town.id}-${type}-${town.nextBuildingId++}`, type, cell, clock: 0, produced: 0, consumed: 0 };
  town.buildings.push(building);
  return building;
}

export function advanceTownProduction(town, port, seconds, stockLimit = 40) {
  for (const building of town.buildings) {
    const definition = BUILDING_TYPES[building.type];
    const output = building.output ?? definition?.output;
    if (!output) continue;
    building.clock += seconds;
    while (building.clock + 1e-9 >= definition.intervalSeconds) {
      building.clock -= definition.intervalSeconds;
      const current = output === port.good ? port.stock : (port.goodsStock?.[output] ?? 0);
      const recipe = definition.recipe;
      const hasInputs = !recipe || Object.entries(recipe).every(([input, amount]) => (port.goodsStock?.[input] ?? (input === port.good ? port.stock : 0)) >= amount);
      if (current < stockLimit && hasInputs) {
        if (recipe) for (const [input, amount] of Object.entries(recipe)) {
          const available = port.goodsStock?.[input] ?? (input === port.good ? port.stock : 0);
          if (input === port.good) port.stock = Math.max(0, available - amount);
          if (port.goodsStock) port.goodsStock[input] = Math.max(0, available - amount);
          recordTownConsumption(town, input);
        }
        if (output === port.good) {
          port.stock++;
          if (port.goodsStock) port.goodsStock[output] = port.stock;
        }
        else if (port.goodsStock) port.goodsStock[output] = current + 1;
        building.produced++;
      }
    }
  }
}

export function recordTownConsumption(town, good) {
  for (const building of town.buildings) {
    const definition = BUILDING_TYPES[building.type];
    const amount = definition?.input === good ? 1 : definition?.recipe?.[good] ?? 0;
    if (amount) building.consumed += amount;
  }
}

export function stockForGood(port, good = port.good) {
  return good === port.good ? port.stock : (port.goodsStock?.[good] ?? 0);
}

export function addStockForGood(port, good, amount) {
  if (good === port.good) {
    port.stock = Math.min(40, Math.max(0, port.stock + amount));
    if (port.goodsStock) port.goodsStock[good] = port.stock;
  }
  else if (port.goodsStock) port.goodsStock[good] = Math.min(40, Math.max(0, (port.goodsStock[good] ?? 0) + amount));
}

