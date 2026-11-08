import { BUILDING_TYPES } from './town-economy.js';
import './town-map.css';
import veniceMapUrl from './assets/venice-lagoon-1500.png';

const SVG = 'http://www.w3.org/2000/svg';
const cellParts = cell => cell.split('-').map(Number);

export function townCellCenter(cell) {
  const [q, r] = cellParts(cell);
  return { x: 115 + q * 70 + (r % 2) * 35, y: r === 6 ? 430 : 100 + (r - 1) * 60 };
}

export function hexPoints(cell, radius = cellParts(cell)[1] === 6 ? 30 : 40) {
  const { x, y } = townCellCenter(cell);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

function fitsLand(cell, landPath) {
  const points = hexPoints(cell).split(' ').map(point => point.split(',').map(Number));
  const [xs, ys] = [points.map(([x]) => x), points.map(([, y]) => y)];
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const insideHex = (x, y) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i], [xj, yj] = points[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  // Reject a plot unless its perimeter and its interior samples all remain on
  // dry land. This avoids clipped coastal/canal cells with clickable water area.
  for (let x = minX; x <= maxX; x += 5) {
    for (let y = minY; y <= maxY; y += 5) {
      if (insideHex(x, y) && !landPath.isPointInFill(new DOMPoint(x, y))) return false;
    }
  }
  return points.every(([x, y]) => landPath.isPointInFill(new DOMPoint(x, y)));
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
  const mapImage = svg.parentElement.querySelector('.venice-historic-map') || document.createElement('img');
  mapImage.className = 'venice-historic-map';
  mapImage.src = veniceMapUrl;
  mapImage.alt = '';
  mapImage.setAttribute('aria-hidden', 'true');
  if (!mapImage.parentElement) svg.parentElement.prepend(mapImage);

  // Match the plotted hex layer to Venice's dry urban island and Giudecca. The
  // central Grand Canal and the lagoon stay outside these land silhouettes.
  const defs = create('defs');
  const landMask = create('clipPath', { id: 'venice-land-clip', clipPathUnits: 'userSpaceOnUse' });
  landMask.append(create('path', {
    'clip-rule': 'evenodd',
    d: 'M60 185 C55 131 91 88 150 71 C205 43 272 35 330 47 C385 28 438 37 482 68 C526 81 587 72 640 87 C694 101 735 134 765 172 C788 204 793 249 770 290 C755 320 718 343 676 350 C629 360 589 342 552 326 C513 307 478 285 445 297 C404 308 350 345 295 356 C235 369 173 357 130 340 C92 321 70 280 63 238 C60 217 60 197 60 185 Z M421 70 C399 98 373 118 350 142 C330 160 308 176 319 193 C336 215 374 227 400 246 C426 265 446 297 470 329 L493 314 C473 284 454 253 428 231 C401 209 362 198 345 181 C335 171 356 155 373 137 C395 114 418 91 438 78 Z M70 389 C150 369 238 368 323 377 C412 381 510 393 600 412 C622 427 642 448 661 469 C548 482 433 481 328 469 C230 464 147 453 97 432 C74 421 64 405 70 389 Z',
    'fill-rule': 'evenodd'
  }));
  defs.append(landMask);
  svg.append(defs);
  const landPath = landMask.querySelector('path');

  const landmarks = [
    { x: 300, y: 199, label: 'RIALTO', note: 'Market & bridge' },
    { x: 623, y: 192, label: 'SAN MARCO', note: 'Basilica & piazza' },
    { x: 733, y: 112, label: 'ARSENALE', note: 'Shipyards' }
  ];
  for (const item of landmarks) {
    const landmark = create('g', { role: 'img', 'aria-label': `${item.label} · ${item.note}` });
    landmark.append(create('circle', { cx: item.x, cy: item.y, r: 4, class: 'landmark-dot' }));
    landmark.append(create('text', { x: item.x + 8, y: item.y + 3, class: 'landmark-label' }, item.label));
    if (item.label === 'RIALTO') {
      landmark.append(create('path', { d: 'M-12 3 Q0 -11 12 3 M-12 3 L12 3 M-8 0 L-8 3 M0 -4 L0 3 M8 0 L8 3', class: 'rialto-bridge' }));
      landmark.append(create('text', { x: item.x + 8, y: item.y + 15, class: 'landmark-subtitle' }, 'CANAL GRANDE'));
    } else if (item.label === 'SAN MARCO') {
      landmark.append(create('path', { d: 'M-10 3 L-10 -5 L10 -5 L10 3 Z M-12 -5 L0 -11 L12 -5 M-6 -5 Q-6 -11 -3 -11 Q0 -11 0 -5 M1 -5 Q1 -13 5 -13 Q9 -13 9 -5', class: 'san-marco-basilica' }));
      landmark.append(create('rect', { x: 15, y: -24, width: 4, height: 18, class: 'campanile-tower' }));
      landmark.append(create('path', { d: 'M14 -24 L17 -30 L20 -24 Z M14 -6 L20 -6 L21 -2 L13 -2 Z', class: 'campanile-tower' }));
      landmark.append(create('text', { x: item.x + 8, y: item.y + 15, class: 'landmark-subtitle' }, 'BASILICA'));
    } else if (item.label === 'ARSENALE') {
      landmark.append(create('path', { d: 'M-4 9 L-4 -2 L12 -2 L12 9 M0 -2 L0 9 M5 -2 L5 9 M10 -2 L10 9 M-5 -3 L4 -10 L13 -3', class: 'arsenal-sheds' }));
      landmark.append(create('text', { x: item.x + 8, y: item.y + 22, class: 'landmark-subtitle' }, 'SHIPYARDS'));
    }
    svg.append(landmark);
  }

  const tileLayer = create('g', { class: 'town-tile-layer', 'clip-path': 'url(#venice-land-clip)' });
  const buildings = new Map(town.buildings.map(building => [building.cell, building]));
  for (const cell of town.buildableCells) {
    const building = buildings.get(cell);
    if (!fitsLand(cell, landPath)) continue;
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
    tileLayer.append(group);
  }
  svg.append(tileLayer);
}
