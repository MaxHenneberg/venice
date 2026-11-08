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

  // Venice reads as a city through its fine network of canals and packed rooflines.
  const sideCanals = [
    'M72 103 C101 146 126 161 113 201 C100 236 126 269 91 315',
    'M195 112 C170 147 199 180 175 214 C152 246 194 280 159 353',
    'M284 122 C246 153 272 190 239 223 C211 251 259 289 221 363',
    'M479 90 C514 130 488 162 526 195 C559 225 517 263 554 303 C582 332 559 359 591 390',
    'M641 103 C616 136 652 160 621 194 C592 224 637 253 605 289 C581 317 625 342 606 367',
    'M721 168 C685 185 712 213 680 232 C652 250 690 276 659 297 C637 313 667 336 649 360'
  ];
  for (const path of sideCanals) {
    svg.append(create('path', { d: path, class: 'side-canal-bank' }));
    svg.append(create('path', { d: path, class: 'side-canal-water' }));
  }

  // Closely packed roof forms create the dense fabric seen in early bird's-eye views.
  const roofColors = ['#b97b59', '#c78a62', '#d1a276', '#a96f55', '#d9b889', '#bb876c', '#c9a17a'];
  const cityRows = [
    { x1: 49, x2: 327, y1: 120, y2: 365 },
    { x1: 465, x2: 735, y1: 111, y2: 365 }
  ];
  cityRows.forEach((district, districtIndex) => {
    let index = districtIndex * 53;
    for (let y = district.y1; y <= district.y2; y += 23) {
      for (let x = district.x1; x <= district.x2; x += 24) {
        index++;
        const jitterX = ((index * 7) % 9) - 4;
        const jitterY = ((index * 11) % 7) - 3;
        const cx = x + jitterX, cy = y + jitterY;
        if ((cx > 282 && cx < 323 && cy > 175 && cy < 220) ||
            (cx > 592 && cx < 684 && cy > 165 && cy < 223) ||
            (cx > 706 && cy < 145)) continue;
        const w = 13 + (index % 4) * 2, h = 9 + (index % 3) * 2;
        const color = roofColors[index % roofColors.length];
        const roof = create('g', { class: 'venetian-roof' });
        roof.append(create('path', {
          d: `M${cx - w / 2 + 2} ${cy - h / 2 + 3} l${w} 0 l0 ${h} l-${w} 0 Z`,
          fill: '#53665a', opacity: '.16'
        }));
        roof.append(create('path', {
          d: `M${cx - w / 2} ${cy - h / 2 + 1} l${w * .42} -3 l${w * .58} 2 l0 ${h} l-${w} 0 Z`,
          fill: color, stroke: '#8e674f', 'stroke-width': '.7'
        }));
        roof.append(create('path', {
          d: `M${cx - w * .06} ${cy - h / 2 - 1} l1 4 l-1 ${h - 2}`,
          fill: 'none', stroke: '#ead7b2', 'stroke-width': '.7', opacity: '.8'
        }));
        if (index % 3 === 0) roof.append(create('rect', {
          x: cx - 1.5, y: cy - h / 2 + 2, width: 3, height: 3, fill: '#eee1c2', opacity: '.8'
        }));
        svg.append(roof);
      }
    }
  });

  // Narrow streets and quays separate the roof blocks while keeping the lagoon
  // canals as the main structure of the city.
  const streets = [
    'M42 176 C122 164 205 183 332 168',
    'M42 245 C126 229 220 251 340 236',
    'M48 315 C129 300 228 321 322 305',
    'M452 154 C534 143 632 163 751 145',
    'M445 263 C534 247 640 268 765 250',
    'M456 329 C533 314 636 333 753 317'
  ];
  for (const path of streets) svg.append(create('path', { d: path, class: 'city-street' }));

  // The Grand Canal is the broad S-shaped spine from the San Marco basin inland.
  const canal = 'M366 91 C449 139 362 178 445 221 C518 259 426 298 521 335 C596 364 497 398 582 433';
  svg.append(create('path', { d: canal, class: 'grand-canal-water' }), create('path', { d: canal, class: 'grand-canal-edge' }));
  svg.append(create('text', { x: 464, y: 286, class: 'canal-label', transform: 'rotate(23 464 286)' }, 'CANAL GRANDE'));

  // A few tiny craft make the waterways feel inhabited, from above.
  const boats = [
    { x: 402, y: 146, a: -24 }, { x: 462, y: 226, a: 34 }, { x: 500, y: 286, a: -25 },
    { x: 118, y: 247, a: -18 }, { x: 640, y: 287, a: 20 }
  ];
  for (const boat of boats) {
    const group = create('g', { transform: `translate(${boat.x} ${boat.y}) rotate(${boat.a})`, class: 'lagoon-boat' });
    group.append(create('path', { d: 'M-8 0 Q0 4 8 0 L5 3 L-5 3 Z' }));
    group.append(create('path', { d: 'M0 -6 L0 0 L5 0 Z' }));
    svg.append(group);
  }

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
