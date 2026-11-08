// Town content is data driven so later cities can define their own recipes and plots.
export const BUILDING_TYPES = {
  glassworks: {
    label: 'Glassworks',
    kind: 'producer',
    output: 'Glass',
    intervalSeconds: 5,
    placeable: true,
    icon: '🏺',
    description: 'Produces one Glass every 5 seconds.'
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
    label: 'Oil Press', kind: 'producer', output: 'Olive oil', intervalSeconds: 5,
    placeable: true, icon: '🫒', description: 'Presses one unit of Olive oil every 5 seconds.'
  },
  wineCellar: {
    label: 'Wine Cellar', kind: 'producer', output: 'Wine', intervalSeconds: 5,
    placeable: true, icon: '🍷', description: 'Produces one unit of Wine every 5 seconds.'
  },
  silkAtelier: {
    label: 'Silk Atelier', kind: 'producer', output: 'Silk', intervalSeconds: 5,
    placeable: true, icon: '🧵', description: 'Weaves one unit of Silk every 5 seconds.'
  },
  grainMill: {
    label: 'Grain Mill', kind: 'producer', output: 'Grain', intervalSeconds: 5,
    placeable: true, icon: '🌾', description: 'Mills one unit of Grain every 5 seconds.'
  },
  spiceHouse: {
    label: 'Spice House', kind: 'producer', output: 'Spices', intervalSeconds: 5,
    placeable: true, icon: '🌶️', description: 'Prepares one unit of Spices every 5 seconds.'
  }
};

// Axial coordinates on land around the central canal. Coordinates are intentionally
// schematic; the hexes are a game placement layer, not a historical street survey.
const canalByRow = { 1: [4], 2: [4], 3: [4], 4: [5], 5: [6] };
const landCells = [];
for (let r = 1; r <= 5; r++) {
  for (let q = 0; q <= 8; q++) {
    if (canalByRow[r].includes(q)) continue;
    if ((r === 1 || r === 5) && (q === 0 || q === 8)) continue;
    landCells.push(`${q}-${r}`);
  }
}

export const TOWN_BLUEPRINTS = {
  venezia: {
    portIndex: 0,
    name: 'Venezia',
    buildableTypes: ['glassworks', 'saltworks', 'olivePress', 'wineCellar', 'silkAtelier', 'grainMill', 'spiceHouse'],
    buildableCells: landCells,
    buildings: [
      { id: 'venice-glassworks-1', type: 'glassworks', cell: '3-3' },
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
      if (current < stockLimit) {
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
  const consumer = town.buildings.find(building => BUILDING_TYPES[building.type]?.input === good);
  if (consumer) consumer.consumed++;
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

