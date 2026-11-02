export const goods = ['Glass', 'Salt', 'Olive oil', 'Wine', 'Silk', 'Grain', 'Spices'];
export const CAPACITY = 8;
export const PRODUCTION_SECONDS = 5;
export const TRAVEL_SECONDS = 12;
export function createSimulation() {
  return { ports: goods.map((good, i) => ({ good, needs: goods[(i + goods.length - 1) % goods.length], stock: 12, received: 0, clock: 0 })), routes: [], nextId: 1 };
}
export function addRoute(state, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || !state.ports[from] || !state.ports[to] || from === to) throw new Error('Choose two different ports.');
  if (state.routes.some(route => route.from === from && route.to === to)) throw new Error('This route already exists.');
  const source = state.ports[from];
  const cargo = Math.min(CAPACITY, source.stock);
  source.stock -= cargo;
  const route = { id: state.nextId++, from, to, good: source.good, cargo, progress: 0, direction: 1, status: cargo ? 'Sailing' : 'Waiting for stock' };
  state.routes.push(route);
  return route;
}
export function removeRoute(state, id) {
  const route = state.routes.find(item => item.id === id);
  if (route) state.ports[route.from].stock += route.cargo;
  state.routes = state.routes.filter(item => item.id !== id);
}
export function advance(state, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  // Small steps ensure production and ship departures remain in chronological order.
  while (seconds > 0) {
    const dt = Math.min(seconds, .25); seconds -= dt;
    for (const port of state.ports) {
      port.clock += dt;
      while (port.clock >= PRODUCTION_SECONDS) { port.clock -= PRODUCTION_SECONDS; port.stock = Math.min(40, port.stock + 1); }
    }
    for (const route of state.routes) {
      const source = state.ports[route.from], destination = state.ports[route.to];
      if (route.status === 'Waiting for stock') {
        route.cargo = Math.min(CAPACITY, source.stock); source.stock -= route.cargo;
        if (!route.cargo) continue;
        route.status = 'Sailing';
      }
      if (route.status === 'Awaiting demand') continue;
      route.progress += route.direction * dt / TRAVEL_SECONDS;
      if (route.progress >= 1) {
        route.progress = 1;
        if (destination.needs !== route.good) { route.status = 'Awaiting demand'; continue; }
        destination.received += route.cargo; route.cargo = 0; route.direction = -1; route.status = 'Returning';
      } else if (route.progress <= 0 && route.direction === -1) {
        route.progress = 0; route.direction = 1;
        route.cargo = Math.min(CAPACITY, source.stock); source.stock -= route.cargo;
        route.status = route.cargo ? 'Sailing' : 'Waiting for stock';
      }
    }
  }
}
