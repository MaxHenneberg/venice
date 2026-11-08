import { BUILDING_TYPES } from './town-economy.js';

const SVG = 'http://www.w3.org/2000/svg';
const cellParts = cell => cell.split('-').map(Number);

export function townCellCenter(cell) {
  const [q, r] = cellParts(cell);
  return { x: 115 + q * 70 + (r % 2) * 35, y: 100 + (r - 1) * 60 };
}

export function hexPoints(cell, radius = 40) {
  const { x, y } = townCellCenter(cell);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

const create = (tag, attrs = {}, content = '') => {
  const element = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  if (content) element.textContent = content;
  return element;
};

export function drawVeniceBoard(svg, town, onSelectTile) {
  svg.replaceChildren();
  svg.setAttribute('viewBox', '0 0 900 500');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Venice lagoon building plots');
  svg.append(create('rect', { x: 0, y: 0, width: 900, height: 500, fill: '#b9d1c8' }));

  const islands = [
    ['M25 118 C100 84 200 84 289 111 C350 130 373 185 354 231 C330 278 337 325 292 359 C227 406 101 386 42 340 C9 293 21 213 25 118Z', 'Cannaregio · San Polo'],
    ['M412 87 C493 63 600 75 664 106 C713 140 704 192 744 226 C790 266 782 336 736 371 C680 402 579 394 523 361 C474 332 474 282 434 246 C402 212 382 140 412 87Z', 'Castello · San Marco'],
    ['M143 420 C271 398 418 410 532 421 C615 432 670 455 728 474 C594 493 388 492 212 480 C163 469 132 447 143 420Z', 'Dorsoduro · Giudecca'],
    ['M683 32 C739 16 799 29 829 55 C844 75 817 100 777 101 C733 100 694 78 683 32Z', 'Murano']
  ];
  for (const [d, label] of islands) {
    const island = create('path', { d, class: 'town-island', 'aria-label': label });
    island.append(create('title', {}, label));
    svg.append(island);
  }

  // The canal is intentionally simplified to a single broad S-curve.
  const canal = 'M366 91 C449 139 362 178 445 221 C518 259 426 298 521 335 C596 364 497 398 582 433';
  svg.append(create('path', { d: canal, class: 'grand-canal-water' }), create('path', { d: canal, class: 'grand-canal-edge' }));
  svg.append(create('text', { x: 464, y: 286, class: 'canal-label', transform: 'rotate(23 464 286)' }, 'CANAL GRANDE'));

  const landmarks = [
    { x: 300, y: 199, label: 'RIALTO', note: 'Market & bridge' },
    { x: 623, y: 192, label: 'SAN MARCO', note: 'Civic heart' },
    { x: 733, y: 112, label: 'ARSENALE', note: 'Shipyards' }
  ];
  for (const item of landmarks) {
    const landmark = create('g', { role: 'img', 'aria-label': `${item.label} · ${item.note}` });
    landmark.append(create('circle', { cx: item.x, cy: item.y, r: 4, class: 'landmark-dot' }));
    landmark.append(create('text', { x: item.x + 8, y: item.y + 3, class: 'landmark-label' }, item.label));
    svg.append(landmark);
  }

  const buildings = new Map(town.buildings.map(building => [building.cell, building]));
  for (const cell of town.buildableCells) {
    const building = buildings.get(cell);
    const def = building ? BUILDING_TYPES[building.type] : null;
    const group = create('g', {
      class: `town-tile ${building ? 'is-occupied' : 'is-empty'}`,
      role: 'button',
      tabindex: building ? '-1' : '0',
      'aria-disabled': String(Boolean(building)),
      'aria-label': building ? `${def.label}, occupied building plot` : `Empty building plot ${cell}`,
      'data-cell': cell
    });
    group.append(create('polygon', { points: hexPoints(cell), class: 'town-hex' }));
    if (building) {
      const { x, y } = townCellCenter(cell);
      group.append(create('text', { x, y: y - 3, class: 'building-icon' }, def.icon));
      group.append(create('text', { x, y: y + 15, class: 'building-label' }, def.label.toUpperCase()));
    }
    group.addEventListener('click', () => { if (!building) onSelectTile(cell); });
    group.addEventListener('keydown', event => {
      if (!building && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onSelectTile(cell);
      }
    });
    svg.append(group);
  }
}
