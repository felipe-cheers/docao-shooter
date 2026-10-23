// Origens congeladas no instante do dano; a câmera nunca rastreia o atacante.
const LIFE = 0.8, CAP = 4, MERGE = Math.PI / 6;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const bearing = (p, from) => Math.hypot(p.x - from.x, p.z - from.z) > 1e-4
  ? Math.atan2(p.x - from.x, -(p.z - from.z)) : null;

export function createDamageIndicator(root) {
  const hits = [];
  function clear() {
    for (const h of hits) h.el.remove();
    hits.length = 0;
  }
  function expire(now) {
    for (let i = hits.length - 1; i >= 0; i--) {
      if (now - hits[i].at >= LIFE) { hits[i].el.remove(); hits.splice(i, 1); }
    }
  }
  function hit(source, position, now) {
    if (!root || !source) return;
    const [x, y, z] = Array.isArray(source) ? source : [source.x, source.y, source.z];
    if (![x, y, z].every(Number.isFinite)) return;
    const origin = { x, y, z }, angle = bearing(origin, position);
    if (angle === null) return;
    expire(now);
    const i = hits.findIndex((h) => {
      const previous = bearing(h.origin, position);
      return previous !== null && Math.abs(wrap(previous - angle)) <= MERGE;
    });
    const h = i >= 0 ? hits.splice(i, 1)[0] : hits.length >= CAP ? hits.shift() : {
      el: document.createElementNS('http://www.w3.org/2000/svg', 'path'),
    };
    h.origin = origin; h.at = now;
    h.el.setAttribute('d', 'M -46 -79.674 A 92 92 0 0 1 46 -79.674');
    h.el.style.opacity = '1';
    root.appendChild(h.el);
    hits.push(h);
  }
  function update(position, yaw, now) {
    expire(now);
    for (const h of hits) {
      const angle = bearing(h.origin, position);
      h.el.style.opacity = angle === null ? '0' : String(Math.max(0, 1 - (now - h.at) / LIFE));
      if (angle !== null) h.el.setAttribute('transform', `rotate(${wrap(angle + yaw) * 180 / Math.PI})`);
    }
  }
  return { hit, update, clear };
}
