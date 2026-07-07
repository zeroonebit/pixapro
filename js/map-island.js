// PixaPro · map-island.js — modo "🏝 Ilha Bevy" da aba Map.
//
// Port em JS do gerador procedural do Bevy edition (terrain.rs):
// value-noise fBm de ELEVAÇÃO (água abaixo do nível) + UMIDADE
// (grass↔dirt), RIM CIRCULAR com borda ondulada por noise (a ilha
// que cabe exata no radar do jogo), anel de PRAIA (1-2 células da
// água), CHAPADAS (1-2 blobs de rocha) e oceano×lago via flood fill
// (mesma distinção do minimapa in-game: oceano escuro, lago claro).
//
// Não substitui o gerador do jogo — é a visualização "ver por lá"
// pedida pelo user. Integra no canvas #testCanvas existente: quando
// o bias select = 'island-bevy', o wrap de renderTestMap desvia pra cá.

(function(){
  const $ = id => document.getElementById(id);

  // ── Paleta oficial (TerrainType::srgb8 do terrain.rs) ──
  const PAL = {
    ocean: [30, 75, 115],   // água conectada à borda (minimapa do jogo)
    lake:  [66, 128, 168],  // água interna (sobrevoável no jogo)
    sand:  [235, 218, 165],
    grass: [105, 165, 80],
    dirt:  [180, 95, 60],
    rock:  [125, 82, 60],
  };

  // ── Value noise (espelho do hash2/vnoise/fbm do terrain.rs) ──
  // u32 math via Math.imul + >>>0 — mesmo hash do jogo e dos shaders
  function hash2(x, y){
    let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) & 0xffff) / 65536;
  }
  function vnoise(px, py, seed){
    const ix = Math.floor(px), iy = Math.floor(py);
    const fx = px - ix, fy = py - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const s = seed | 0;
    const a = hash2(ix + s, iy - s), b = hash2(ix + 1 + s, iy - s);
    const c = hash2(ix + s, iy + 1 - s), d = hash2(ix + 1 + s, iy + 1 - s);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(px, py, seed, oct = 4){
    let v = 0, amp = 0.5, f = 1, norm = 0;
    for (let o = 0; o < oct; o++){
      v += amp * vnoise(px * f, py * f, seed + o * 101);
      norm += amp; amp *= 0.5; f *= 2;
    }
    return v / norm;
  }

  // ── Geração (CELLS×CELLS, default 100 como o jogo) ──
  function generateIsland(seed, cells, waterLevel, moisture){
    const half = cells / 2;
    const T = { water: 0, sand: 1, grass: 2, dirt: 3, rock: 4 };
    const grid = new Uint8Array(cells * cells);

    // elevação + rim circular (raio ondulado por fBm — terrain.rs)
    for (let r = 0; r < cells; r++){
      for (let c = 0; c < cells; c++){
        const dx = c - half + 0.5, dy = r - half + 0.5;
        const d = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const rim = half - 2 - fbm(Math.cos(ang) * 3 + 7, Math.sin(ang) * 3 + 7, seed + 77, 3) * 4;
        const elev = fbm(c * 0.045, r * 0.045, seed, 4);
        const wet = fbm(c * 0.06 + 31, r * 0.06 + 31, seed + 913, 3);
        let t;
        if (d > rim || elev < waterLevel) t = T.water;
        else t = (wet < moisture) ? T.dirt : T.grass;
        grid[r * cells + c] = t;
      }
    }

    // CHAPADAS: 1-2 blobs de rocha (topo plano no jogo) longe da borda
    const rnd = mulberry32(seed ^ 0xbeef);
    const blobs = 1 + Math.floor(rnd() * 2);
    for (let b = 0; b < blobs; b++){
      const br = 4.5 + rnd() * 2.5;
      const bx = half + (rnd() - 0.5) * cells * 0.5;
      const by = half + (rnd() - 0.5) * cells * 0.5;
      for (let r = 0; r < cells; r++){
        for (let c = 0; c < cells; c++){
          const d = Math.hypot(c - bx, r - by) + (vnoise(c * 0.3, r * 0.3, seed + 5) - 0.5) * 2.2;
          if (d < br && grid[r * cells + c] !== T.water) grid[r * cells + c] = T.rock;
        }
      }
    }

    // PRAIA: terra a ≤2 células da água vira areia (dist_water do jogo)
    const out = grid.slice();
    for (let r = 0; r < cells; r++){
      for (let c = 0; c < cells; c++){
        const t = grid[r * cells + c];
        if (t === T.water || t === T.rock) continue;
        let nearWater = false;
        for (let dr = -2; dr <= 2 && !nearWater; dr++){
          for (let dc = -2; dc <= 2 && !nearWater; dc++){
            const rr = r + dr, cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= cells || cc >= cells) continue;
            if (grid[rr * cells + cc] === T.water) nearWater = true;
          }
        }
        if (nearWater) out[r * cells + c] = T.sand;
      }
    }

    // OCEANO×LAGO: flood fill de água a partir da borda (grid.ocean)
    const ocean = new Uint8Array(cells * cells);
    const stack = [];
    for (let i = 0; i < cells; i++){
      for (const idx of [i, (cells - 1) * cells + i, i * cells, i * cells + cells - 1]){
        if (out[idx] === T.water && !ocean[idx]){ ocean[idx] = 1; stack.push(idx); }
      }
    }
    while (stack.length){
      const idx = stack.pop();
      const r = Math.floor(idx / cells), c = idx % cells;
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= cells || cc >= cells) continue;
        const j = rr * cells + cc;
        if (out[j] === T.water && !ocean[j]){ ocean[j] = 1; stack.push(j); }
      }
    }

    return { grid: out, ocean, cells, T };
  }

  // ── Render ──
  function paintCells(ctx, island, px, ox, oy){
    const { grid, ocean, cells, T } = island;
    const names = ['water', 'sand', 'grass', 'dirt', 'rock'];
    for (let r = 0; r < cells; r++){
      for (let c = 0; c < cells; c++){
        const t = grid[r * cells + c];
        let key = names[t];
        if (t === T.water) key = ocean[r * cells + c] ? 'ocean' : 'lake';
        const [R, G, B] = PAL[key];
        ctx.fillStyle = `rgb(${R},${G},${B})`;
        ctx.fillRect(ox + c * px, oy + r * px, Math.ceil(px), Math.ceil(px));
      }
    }
  }

  function renderIsland(){
    const canvas = $('testCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const seed = parseInt($('testSeed')?.value) || 42;
    const waterLevel = (parseInt($('islandWater')?.value ?? 34)) / 100;
    const moisture = (parseInt($('islandMoisture')?.value ?? 30)) / 100;
    const round = $('islandRound')?.checked ?? true;
    const cells = 100; // escala do jogo

    const island = generateIsland(seed, cells, waterLevel, moisture);

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!round){
      // mapa quadrado simples (célula a célula)
      const px = Math.min(W, H) / cells;
      const ox = (W - px * cells) / 2, oy = (H - px * cells) / 2;
      ctx.fillStyle = '#141008';
      ctx.fillRect(0, 0, W, H);
      paintCells(ctx, island, px, ox, oy);
    } else {
      // MINIMAPA REDONDO estilo radar do jogo: disco com clip circular,
      // anel escuro com rivets cardinais, tint verde-radar sutil
      const R = Math.min(W, H) * 0.46;
      const cx = W / 2, cy = H / 2;
      ctx.fillStyle = '#141008';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const px = (R * 2) / cells;
      paintCells(ctx, island, px, cx - R, cy - R);
      // tint do radar (o disco do jogo: 185,205,190 multiplicado)
      ctx.fillStyle = 'rgba(60, 110, 70, 0.10)';
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();
      // anel do frame + rivets cardinais (o Graphics custom do HUD)
      ctx.strokeStyle = '#241c10';
      ctx.lineWidth = Math.max(4, R * 0.05);
      ctx.beginPath(); ctx.arc(cx, cy, R + ctx.lineWidth * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#3a2e1c';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#5a4a30';
      for (let k = 0; k < 4; k++){
        const a = k * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * (R + ctx.lineWidth * 2.2), cy + Math.sin(a) * (R + ctx.lineWidth * 2.2), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const info = $('testGridInfo');
    if (info) info.textContent = `ilha ${cells}×${cells} células (500×500u no jogo)`;
  }

  // ── Integração: desvia o renderTestMap quando bias = island-bevy ──
  function isIslandMode(){ return $('testBias')?.value === 'island-bevy'; }
  function syncControlsVisibility(){
    const row = $('islandControls');
    if (row) row.style.display = isIslandMode() ? 'flex' : 'none';
  }

  document.addEventListener('DOMContentLoaded', () => {
    // wrap: todo caminho que chama renderTestMap passa a respeitar o modo
    const orig = window.renderTestMap;
    window.renderTestMap = function(){
      syncControlsVisibility();
      if (isIslandMode()) return renderIsland();
      if (typeof orig === 'function') return orig.apply(this, arguments);
    };
    // controles live
    for (const id of ['islandWater', 'islandMoisture', 'islandRound']){
      $(id)?.addEventListener('input', () => { if (isIslandMode()) renderIsland(); });
    }
    $('islandWaterVal') && $('islandWater')?.addEventListener('input', () => {
      $('islandWaterVal').textContent = $('islandWater').value + '%';
    });
    $('islandMoistureVal') && $('islandMoisture')?.addEventListener('input', () => {
      $('islandMoistureVal').textContent = $('islandMoisture').value + '%';
    });
    $('testBias')?.addEventListener('change', syncControlsVisibility);
    syncControlsVisibility();
  });

  // export pro tab-map (presets salvam/carregam os params da ilha)
  window.PixaIsland = { renderIsland, isIslandMode };
})();
