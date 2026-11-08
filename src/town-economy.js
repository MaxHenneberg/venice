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
    buildableTypes: ['glassworks'],
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
    if (definition.output) produced.set(definition.output, (produced.get(definition.output) ?? 0) + 1 / definition.intervalSeconds);
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
    if (!definition?.output) continue;
    building.clock += seconds;
    while (building.clock + 1e-9 >= definition.intervalSeconds) {
      building.clock -= definition.intervalSeconds;
      if (port.stock < stockLimit) {
        port.stock++;
        building.produced++;
      }
    }
  }
}

export function recordTownConsumption(town, good) {
  const consumer = town.buildings.find(building => BUILDING_TYPES[building.type]?.input === good);
  if (consumer) consumer.consumed++;
}

