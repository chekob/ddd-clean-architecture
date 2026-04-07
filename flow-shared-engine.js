// flow-shared-engine.js
// Shared animation engine for all DDD architecture flow diagrams

function initFlowEngine(stepsArray) {
  const diagram = document.getElementById('diagram');
  const svgEl = document.getElementById('edgeSvg');
  const tokenEl = document.getElementById('token');
  const stepLabelEl = document.getElementById('stepLabel');
  const STEPS = stepsArray;

  function nr(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const dr = diagram.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - dr.left, y: r.top - dr.top, w: r.width, h: r.height, cx: r.left - dr.left + r.width / 2, cy: r.top - dr.top + r.height / 2 };
  }

  function ep(fid, tid) {
    const a = nr(fid), b = nr(tid);
    if (!a || !b) return null;
    const cl = (r, cx, cy, tx, ty) => {
      const dx = tx - cx, dy = ty - cy, sx = r.w / 2 / Math.abs(dx || .001), sy = r.h / 2 / Math.abs(dy || .001), s = Math.min(sx, sy);
      return { x: cx + dx * s, y: cy + dy * s };
    };
    return { from: cl(a, a.cx, a.cy, b.cx, b.cy), to: cl(b, b.cx, b.cy, a.cx, a.cy) };
  }

  function dist(fid, tid) {
    const p = ep(fid, tid);
    if (!p) return 100;
    const dx = p.to.x - p.from.x, dy = p.to.y - p.from.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function ensureMarkers() {
    if (svgEl.querySelector('defs')) return;
    const d = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    [['aa', '#e94560'], ['ad', '#5555aa'], ['ar', '#4488aa']].forEach(([id, c]) => {
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      m.setAttribute('id', id); m.setAttribute('viewBox', '0 0 10 10');
      m.setAttribute('refX', '9'); m.setAttribute('refY', '5');
      m.setAttribute('markerWidth', '6'); m.setAttribute('markerHeight', '6');
      m.setAttribute('orient', 'auto-start-reverse');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z'); p.setAttribute('fill', c);
      m.appendChild(p); d.appendChild(m);
    });
    svgEl.appendChild(d);
  }

  function drawEdge(fid, tid, active, ret, opt) {
    const p = ep(fid, tid);
    if (!p) return;
    const c = active ? '#e94560' : ret ? 'rgba(68,136,170,.3)' : 'rgba(85,85,170,.25)';
    const mk = active ? 'url(#aa)' : ret ? 'url(#ar)' : 'url(#ad)';
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', p.from.x); l.setAttribute('y1', p.from.y);
    l.setAttribute('x2', p.to.x); l.setAttribute('y2', p.to.y);
    l.setAttribute('stroke', c); l.setAttribute('stroke-width', active ? 2.5 : 1.2);
    if (opt) l.setAttribute('stroke-dasharray', '6,4');
    l.setAttribute('marker-end', mk);
    svgEl.appendChild(l);
  }

  let cur = -1, playing = false, spd = 1, af = 0;
  const TK_SPD = 2;

  function fpf(i) {
    if (i < 0 || i >= STEPS.length) return 60;
    const base = Math.round(dist(STEPS[i].from, STEPS[i].to) / TK_SPD);
    return Math.max(30, Math.round(base / spd));
  }

  function render() {
    ensureMarkers();
    svgEl.querySelectorAll('line').forEach(l => l.remove());
    document.querySelectorAll('#diagram [id]').forEach(el => { el.classList.remove('node-active', 'node-visited'); });
    for (let i = 0; i < cur && i < STEPS.length; i++) {
      const s = STEPS[i];
      drawEdge(s.from, s.to, false, s.ret, s.opt);
      document.getElementById(s.from)?.classList.add('node-visited');
      document.getElementById(s.to)?.classList.add('node-visited');
    }
    if (cur >= 0 && cur < STEPS.length) {
      const s = STEPS[cur];
      drawEdge(s.from, s.to, true, s.ret, s.opt);
      document.getElementById(s.from)?.classList.remove('node-visited');
      document.getElementById(s.to)?.classList.remove('node-visited');
      document.getElementById(s.from)?.classList.add('node-active');
      document.getElementById(s.to)?.classList.add('node-active');
    }
  }

  function mvTk(pr) {
    if (cur < 0 || cur >= STEPS.length) { tokenEl.classList.add('hidden'); return; }
    const p = ep(STEPS[cur].from, STEPS[cur].to);
    if (!p) return;
    tokenEl.style.left = (p.from.x + (p.to.x - p.from.x) * pr - 8) + 'px';
    tokenEl.style.top = (p.from.y + (p.to.y - p.from.y) * pr - 8) + 'px';
    tokenEl.classList.remove('hidden');
  }

  function updateLabel() {
    const s = STEPS[cur];
    if (s) {
      stepLabelEl.style.color = PHASE_COLORS[s.phase] || '#e94560';
      stepLabelEl.textContent = s.label;
    }
  }

  function tick() {
    if (!playing) return;
    af++;
    const n = fpf(cur), pr = Math.min(af / n, 1);
    mvTk(pr);
    if (af >= n) {
      cur++; af = 0;
      if (cur >= STEPS.length) {
        playing = false; cur = STEPS.length - 1;
        tokenEl.classList.add('hidden');
        stepLabelEl.textContent = '✅ Flow Complete';
        stepLabelEl.style.color = '#e94560';
        render(); return;
      }
      render();
    }
    updateLabel();
    requestAnimationFrame(tick);
  }

  // Controls
  document.getElementById('btnPlay').onclick = () => {
    if (cur >= STEPS.length - 1) { cur = -1; af = 0; }
    playing = true;
    if (cur < 0) { cur = 0; render(); }
    tick();
  };
  document.getElementById('btnPause').onclick = () => { playing = false; };
  document.getElementById('btnReset').onclick = () => {
    playing = false; cur = -1; af = 0;
    tokenEl.classList.add('hidden');
    stepLabelEl.textContent = 'Press Play to start';
    stepLabelEl.style.color = '#e94560';
    document.querySelectorAll('#diagram [id]').forEach(el => { el.classList.remove('node-active', 'node-visited'); });
    svgEl.querySelectorAll('line').forEach(l => l.remove());
  };
  const spds = [1, 2, 3, .5]; let si = 0;
  document.getElementById('btnSpeed').onclick = () => {
    si = (si + 1) % spds.length; spd = spds[si];
    document.getElementById('btnSpeed').textContent = 'Speed: ' + spd + 'x';
  };
  document.getElementById('btnNext').onclick = () => {
    playing = false;
    if (cur < STEPS.length - 1) { cur++; af = 0; render(); mvTk(1); updateLabel(); }
  };
  document.getElementById('btnPrev').onclick = () => {
    playing = false;
    if (cur > 0) { cur--; af = 0; render(); mvTk(1); updateLabel(); }
  };

  ensureMarkers();
}
