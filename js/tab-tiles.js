// PixaPro · tab-tiles.js — Tiles tab (Wang cr31 editor + test render)
// Tile editor com transforms (rotate/flip), auto-sort visual por color sampling,
// PRNG terrain generator (white noise / CA / value noise), test canvas render.
//
// Globals expostos: tileEditState, activePreset, editorMode, viewMode,
//                   renderTiles, renderTestMap, autoSortTiles
//
// Dependências: WANG_PRESETS, $, mulberry32 (utils), Api (api.js)


// ====== Editor de tiles ======
// State: 16 cells, cada uma com {srcDataURL, transforms[], originalIdx}
let tileEditState = null; // {presetId, cells: Array<{src, current, transforms, origIdx}>}

function applyTransform(srcDataURL){
  // recebe dataURL + array de transforms ['rotate-cw','flip-h',...] e retorna nova dataURL
  return new Promise((resolve, reject) => {
    if(!srcDataURL){ resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = srcDataURL;
  });
}

function transformCanvas(img, transforms){
  let w = img.width, h = img.height;
  // calcular tamanho final após rotações 90°
  const rots = transforms.filter(t => t==='rotate-cw' || t==='rotate-ccw').length;
  const final = (rots % 2 === 1) ? {w: h, h: w} : {w, h};
  const c = document.createElement('canvas');
  c.width = final.w; c.height = final.h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.translate(final.w/2, final.h/2);
  // aplicar transforms na ordem
  transforms.forEach(t => {
    if(t === 'rotate-cw') ctx.rotate(Math.PI/2);
    else if(t === 'rotate-ccw') ctx.rotate(-Math.PI/2);
    else if(t === 'flip-h') ctx.scale(-1, 1);
    else if(t === 'flip-v') ctx.scale(1, -1);
  });
  ctx.drawImage(img, -img.width/2, -img.height/2);
  return c.toDataURL();
}

async function regenCellImage(cellState){
  const img = await applyTransform(cellState.src);
  cellState.current = transformCanvas(img, cellState.transforms);
  return cellState.current;
}

// Auto-sort: classifica cada tile pelos 4 cantos e reordena automaticamente
let _lastAutoSortFlipped = false;
let _autoSortSnapshot = null;  // snapshot pra Restore
// Helper: aplica auto-sort logo após tileset carregar, exceto Ground Truth
// (palette de teste já está em ordem cr31 canônica). Evita re-sort se já
// aplicado neste preset (controle por _autoSortedPresetIds).
const _autoSortedPresetIds = new Set();
function _maybeAutoSort(preset){
  if (!preset || !tileEditState) return;
  if (preset.id === 'ground-truth') return;          // ref já correta
  if (_autoSortedPresetIds.has(preset.id)) return;   // já sorted nesta sessão
  _autoSortedPresetIds.add(preset.id);
  // Pequeno delay pra DOM settle antes de re-render do auto-sort
  setTimeout(() => { autoSortTiles(); }, 100);
}

async function autoSortTiles(forceFlip){
  if(!tileEditState) return;
  // Auto-entra em edit mode pra mostrar resultado completo
  if(!editorMode){ toggleEditorMode(); }
  _autoSortSnapshot = tileEditState.cells.map(c => c ? {...c, transforms: c.transforms.slice()} : null);
  $("btnRestoreSnap").hidden = false;
  $("editorHint").textContent = '🔍 Analisando…';
  const flipped = forceFlip !== undefined ? forceFlip : false;
  _lastAutoSortFlipped = flipped;
  // Carrega imagens com pixel data
  const tiles = await Promise.all(tileEditState.cells.map(c => c?.current ? new Promise(res => {
    const i = new Image();
    i.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = i.naturalWidth; cv.height = i.naturalHeight;
      const ctx = cv.getContext('2d');
      ctx.drawImage(i, 0, 0);
      const w = i.naturalWidth, h = i.naturalHeight;
      // amostra região 3x3 perto do canto exato (mais robusto que single pixel)
      const sampleRegion = (cx, cy) => {
        let r=0, g=0, b=0, n=0;
        for(let dx=-1; dx<=1; dx++){
          for(let dy=-1; dy<=1; dy++){
            const x = Math.max(0, Math.min(w-1, cx+dx));
            const y = Math.max(0, Math.min(h-1, cy+dy));
            const d = ctx.getImageData(x, y, 1, 1).data;
            r += d[0]; g += d[1]; b += d[2]; n++;
          }
        }
        return [r/n, g/n, b/n];
      };
      const margin = Math.max(1, Math.floor(w * 0.08)); // 8% do canto absoluto
      res({
        ref: c,
        NW: sampleRegion(margin, margin),
        NE: sampleRegion(w - 1 - margin, margin),
        SE: sampleRegion(w - 1 - margin, h - 1 - margin),
        SW: sampleRegion(margin, h - 1 - margin),
      });
    };
    i.onerror = () => res(null);
    i.src = c.current;
  }) : null));

  // Variance score por tile (uniformidade entre 4 cantos)
  const variance = (s) => {
    const ks = ['NW','NE','SE','SW'];
    const avg = [0,0,0]; ks.forEach(k => { for(let i=0;i<3;i++) avg[i] += s[k][i]; });
    avg.forEach((v,i) => avg[i] = v/4);
    let v = 0;
    ks.forEach(k => { for(let i=0;i<3;i++) v += (s[k][i] - avg[i])**2; });
    return {v, avg};
  };
  const scored = tiles.map((s, idx) => s ? {idx, ...variance(s), s} : null).filter(Boolean);

  // Heurística primária: posições 0 e 15 (ground truth pós permutação default) são all-lower e all-upper
  // Usa avg color delas como ref. Se não existir/inconsistente, fallback pra detecção por uniformidade.
  let lowerRef, upperRef;
  if(tiles[0] && tiles[15]){
    const avg0 = [0,0,0], avg15 = [0,0,0];
    for(const k of ['NW','NE','SE','SW']){
      for(let i=0;i<3;i++){ avg0[i] += tiles[0][k][i]; avg15[i] += tiles[15][k][i]; }
    }
    avg0.forEach((v,i)=>avg0[i]=v/4); avg15.forEach((v,i)=>avg15[i]=v/4);
    lowerRef = avg0; upperRef = avg15;
  } else {
    // fallback: 2 mais uniformes, lower = lum menor (heurística antiga)
    scored.sort((a,b) => a.v - b.v);
    const ref1 = scored[0];
    let ref2 = null;
    for(let i=1; i<scored.length; i++){
      const dist = (scored[i].avg[0]-ref1.avg[0])**2 + (scored[i].avg[1]-ref1.avg[1])**2 + (scored[i].avg[2]-ref1.avg[2])**2;
      if(dist > 3000){ ref2 = scored[i]; break; }
    }
    if(!ref2){ $("editorHint").textContent = '⚠ não detectou 2 cores distintas'; return; }
    const lum = (rgb) => 0.299*rgb[0] + 0.587*rgb[1] + 0.114*rgb[2];
    lowerRef = lum(ref1.avg) < lum(ref2.avg) ? ref1.avg : ref2.avg;
    upperRef = lowerRef === ref1.avg ? ref2.avg : ref1.avg;
  }
  // se user pediu flip explícito, troca
  if(flipped){ const tmp = lowerRef; lowerRef = upperRef; upperRef = tmp; }

  // Classifica cada tile
  const classifyCorner = (rgb) => {
    const dL = (rgb[0]-lowerRef[0])**2 + (rgb[1]-lowerRef[1])**2 + (rgb[2]-lowerRef[2])**2;
    const dU = (rgb[0]-upperRef[0])**2 + (rgb[1]-upperRef[1])**2 + (rgb[2]-upperRef[2])**2;
    return dU < dL ? 1 : 0;
  };

  const placed = new Array(16).fill(null);
  const conflicts = [];
  tiles.forEach((s, idx) => {
    if(!s) return;
    const nw = classifyCorner(s.NW);
    const ne = classifyCorner(s.NE);
    const se = classifyCorner(s.SE);
    const sw = classifyCorner(s.SW);
    const bits = nw + ne*2 + se*4 + sw*8;
    if(placed[bits] === null){
      placed[bits] = s.ref;
    } else {
      conflicts.push({bits, idx});
    }
  });

  const filled = placed.filter(x => x !== null).length;
  for(let i=0; i<16; i++){
    if(placed[i] === null) placed[i] = tileEditState.cells[i];
  }
  // Conta quantas células trocaram de posição
  const moved = placed.reduce((acc, cell, i) => acc + (cell !== _autoSortSnapshot[i] ? 1 : 0), 0);
  tileEditState.cells = placed;
  if(editorMode) await rerenderEditorGrid();
  renderTestMap();
  const movedMsg = moved === 0 ? '✓ tudo já estava no lugar' : `${moved} tiles moveram`;
  $("editorHint").textContent = `🔍 ${movedMsg} · ${filled}/16 classified · ${conflicts.length} conflicts · lower=rgb(${lowerRef.map(v=>Math.round(v)).join(',')})`;
}

// Re-pinta as wang-cells do modo VIEW com as imagens atuais do tileEditState
function repaintViewCells(){
  if(!tileEditState || editorMode) return;
  const cellEls = document.querySelectorAll('.wang-grid .wang-cell');
  cellEls.forEach(el => {
    const wtile = el.querySelector('.wtile');
    if(!wtile) return;
    const bits = parseInt(wtile.dataset.bits);
    const cell = tileEditState.cells[bits];
    if(!cell?.current) return;
    wtile.innerHTML = '';
    const img = new Image();
    img.src = cell.current;
    img.style.width = '96px'; img.style.height = '96px'; img.style.imageRendering = 'pixelated';
    wtile.appendChild(img);
  });
}

// Aplica correções salvas em tools/saves/wang_corrections.json (se houver pra esse preset)
async function applyStoredCorrections(presetId){
  if(!tileEditState || tileEditState.presetId !== presetId) return;
  try {
    const registry = await Api.loadWangCorrections();
    if(!registry) return;
    const corr = registry?.[presetId];
    if(!corr) return;
    const original = tileEditState.cells.slice();
    const newCells = [];
    for(let i=0; i<16; i++){
      const c = corr.cells[i];
      if(!c) continue;
      const found = original.find(x => x.origIdx === c.origIdx);
      if(!found) continue;
      const cloned = { ...found, transforms: c.transforms.slice() };
      const img = await applyTransform(cloned.src);
      cloned.current = transformCanvas(img, cloned.transforms);
      newCells[i] = cloned;
    }
    if(newCells.length === 16){
      tileEditState.cells = newCells;
      $("editorHint").textContent = `↪ correções salvas re-aplicadas (${corr.cells.length} cells)`;
      if(editorMode) rerenderEditorGrid();
      else repaintViewCells();  // sincroniza visual em view mode
      renderTestMap();
    }
  } catch(e){ /* sem rede / sem registry */ }
}

let activePreset = WANG_PRESETS[0];
let presetMetadata = {};

// rotação CW dos 4 cantos: NW→NE→SE→SW→NW (bit positions cyclical shift)
function rotCW(b){ return ((b << 1) & 0xF) | ((b >> 3) & 1); }
function rotCCW(b){ return ((b >> 1) & 0xF) | ((b & 1) << 3); }
function rotOrbit(b){
  const seen = new Set(); let cur = b;
  while(!seen.has(cur)){ seen.add(cur); cur = rotCW(cur); }
  return [...seen].sort((a,b)=>a-b);
}
function canonicalRot(b){ return Math.min(...rotOrbit(b)); }
// retorna {canon, rotations} onde rotations = nº de rot CW do canon pra chegar em b
function rotInfoFor(b){
  let cur = canonicalRot(b);
  for(let i=0; i<4; i++){
    if(cur === b) return {canon: canonicalRot(b), rotations: i};
    cur = rotCW(cur);
  }
  return {canon: b, rotations: 0};
}
const ROT_CANONS = [0, 1, 3, 5, 7, 15]; // 6 representantes únicos

// PixelLab gera tiles em convenção CCW-shifted vs cr31. Discovered manualmente
// pelo usuário no Ground Truth. Mapping: cr31 position N -> PixelLab source index.
// Permutação: CR31_TO_PIXELLAB[N] = ((N & 7) * 2) + ((N >> 3) & 1) — interleave bits
const CR31_TO_PIXELLAB_MAP = [0, 8, 1, 9, 2, 10, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];

function bitsToCorners(bits){
  return {
    NW: (bits & 1) ? 'upper' : 'lower',
    NE: (bits & 2) ? 'upper' : 'lower',
    SE: (bits & 4) ? 'upper' : 'lower',
    SW: (bits & 8) ? 'upper' : 'lower',
  };
}

function cornerSquare(c){
  return `<div class="corner-vis"><div class="${c.NW}"></div><div class="${c.NE}"></div><div class="${c.SW}"></div><div class="${c.SE}"></div></div>`;
}

// 🌐 Compare All — render grid com todos os 13 tilesets, filter biome/season
let _compareFilter = { type: 'all', val: 'all' };
function renderCompareAll(){
  const grid = $("compareAllGrid");
  if (!grid) return;

  const filtered = WANG_PRESETS.filter(p => {
    if (_compareFilter.type === 'all') return true;
    return p[_compareFilter.type] === _compareFilter.val;
  });

  $("compareAllCount").textContent = `(${filtered.length}/${WANG_PRESETS.length})`;

  const biomeColor = {
    'cerrado-verde': '#9fe89f', 'cerrado-seco': '#dfa6df',
    'costa': '#9fcfe8', 'ref': '#a89368'
  };

  grid.innerHTML = filtered.map(p => {
    const isActive = p === activePreset;
    // Imagem preview: prioriza p.image (URL PixelLab) ou sliceFn (local)
    let imgSrc = '';
    if (p.image) imgSrc = p.image;
    else if (p.sliceFn) imgSrc = p.sliceFn(15);  // tile bits=15 (canto upper completo) como preview

    const bColor = biomeColor[p.biome] || '#a89368';
    return `<div class="cmp-card" data-preset-id="${p.id}" style="
      border:2px solid ${isActive ? '#f4c95d' : '#4a3826'};
      border-radius:6px;padding:8px;background:#1a1410;cursor:pointer;
      ${isActive ? 'box-shadow:0 0 12px rgba(244,201,93,0.5);' : ''}
    ">
      <div style="display:flex;justify-content:center;background:#2a2218;border-radius:3px;padding:4px;margin-bottom:6px;height:96px;align-items:center;">
        <img src="${imgSrc}" style="max-width:100%;max-height:90px;image-rendering:pixelated;" alt="">
      </div>
      <div style="font-size:12px;color:#f4c95d;font-weight:bold;line-height:1.3;margin-bottom:4px;">${p.name}</div>
      <div style="font-size:12px;display:flex;gap:6px;flex-wrap:wrap;">
        ${p.biome ? `<span style="color:${bColor};">🌿 ${p.biome}</span>` : ''}
        ${p.season ? `<span style="color:#a89368;">${p.season}</span>` : ''}
        <span style="opacity:.5;color:#a89368;">${p.tileSize || '32'}px</span>
      </div>
    </div>`;
  }).join('') || `<div style="grid-column:1/-1;text-align:center;padding:30px;opacity:.5;font-size:12px;">Nenhum tileset com ${_compareFilter.type}=${_compareFilter.val}</div>`;

  // Click no card → set active preset
  grid.querySelectorAll('.cmp-card').forEach(card => {
    card.onclick = () => {
      const id = card.dataset.presetId;
      const p = WANG_PRESETS.find(x => x.id === id);
      if (p && p !== activePreset) {
        activePreset = p;
        tileEditState = null;
        renderTiles();
      }
    };
  });
}

// Filter buttons (biome/season/all)
document.addEventListener('click', (e) => {
  const b = e.target.closest('.cmp-filter');
  if (!b) return;
  _compareFilter = { type: b.dataset.filterType, val: b.dataset.filterVal };
  document.querySelectorAll('.cmp-filter').forEach(x => {
    const active = (x === b);
    x.classList.toggle('active', active);
    x.style.borderColor = active ? '#f4c95d' : '#4a3826';
    x.style.color = active ? '#f4c95d' : x.style.color;  // mantém a cor atual se não-active
  });
  renderCompareAll();
});

function renderPresetList(){
  const cont = $("tilesetPresetButtons");
  if(!cont) return;
  cont.innerHTML = '';
  WANG_PRESETS.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'tileset-btn' + (p === activePreset ? ' active' : '');
    b.textContent = p.name;
    b.title = p.meta;
    b.onclick = () => { activePreset = p; tileEditState = null; renderTiles(); };
    cont.appendChild(b);
  });
  // biome + season buttons (placeholder por enquanto)
  document.querySelectorAll('#biomeButtons button, #seasonButtons button').forEach(btn => {
    btn.onclick = () => {
      btn.parentElement.querySelectorAll('button').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      // TODO: lookup tileset por biome+season e ativar quando existirem
      const biome = document.querySelector('#biomeButtons button.active')?.dataset.biome;
      const season = document.querySelector('#seasonButtons button.active')?.dataset.season;
      $("tilesetInfo").innerHTML += `<br>🚧 ${biome||'?'} + ${season||'?'} — tileset não gerado ainda`;
    };
  });
}

// PRNG simples (mulberry32)

// Gera grid binário (lower=0, upper=1) com diferentes biases
// NW×NH = colunas × linhas de cells (vertices = NW+1 × NH+1)
function generateTerrainGrid(seed, threshold, NW, NH, bias){
  if(!NH) NH = NW; // fallback quadrado
  const rand = mulberry32(seed);
  const vert = [];
  // 1. White noise base (todos os modos começam aqui)
  for(let y=0; y<=NH; y++){
    vert[y] = [];
    for(let x=0; x<=NW; x++){
      vert[y][x] = rand() < threshold ? 1 : 0;
    }
  }
  if(bias === 'white' || !bias) return vert;

  // 2. Cellular Automata: smoothing por majoritária do 3x3
  if(bias?.startsWith('ca-')){
    const iters = parseInt(bias.split('-')[1]) || 4;
    for(let it=0; it<iters; it++){
      const next = [];
      for(let y=0; y<=NH; y++){
        next[y] = [];
        for(let x=0; x<=NW; x++){
          let count = 0, total = 0;
          for(let dy=-1; dy<=1; dy++){
            for(let dx=-1; dx<=1; dx++){
              const ny = y+dy, nx = x+dx;
              if(ny<0 || ny>NH || nx<0 || nx>NW){ count++; total++; continue; }
              count += vert[ny][nx];
              total++;
            }
          }
          next[y][x] = count >= Math.ceil(total/2) ? 1 : 0;
        }
      }
      for(let y=0; y<=NH; y++) vert[y] = next[y];
    }
    return vert;
  }

  // 3. Value noise: amostra grid grosso e interpola
  if(bias?.startsWith('value-')){
    const scale = parseInt(bias.split('-')[1]) || 4;
    const coarseW = Math.ceil(NW / scale);
    const coarseH = Math.ceil(NH / scale);
    const coarse = [];
    const rand2 = mulberry32(seed * 7919);
    for(let y=0; y<=coarseH; y++){
      coarse[y] = [];
      for(let x=0; x<=coarseW; x++){
        coarse[y][x] = rand2(); // 0..1
      }
    }
    for(let y=0; y<=NH; y++){
      for(let x=0; x<=NW; x++){
        const fx = x / scale; const fy = y / scale;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const x1 = Math.min(x0+1, coarseW), y1 = Math.min(y0+1, coarseH);
        const sx = fx - x0, sy = fy - y0;
        // smoothstep
        const u = sx*sx*(3-2*sx), v = sy*sy*(3-2*sy);
        const a = coarse[y0][x0]*(1-u) + coarse[y0][x1]*u;
        const b = coarse[y1][x0]*(1-u) + coarse[y1][x1]*u;
        const val = a*(1-v) + b*v;
        vert[y][x] = val < threshold ? 1 : 0;
      }
    }
    return vert;
  }
  return vert;
}

function renderTestMap(){
  const canvas = $("testCanvas");
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if(!tileEditState){
    // Bug fix: mostra mensagem em vez de canvas cinza
    ctx.fillStyle = '#2a2218';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#a89368';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Selecione um tileset acima', canvas.width/2, canvas.height/2 - 8);
    ctx.fillText('pra ver o test render', canvas.width/2, canvas.height/2 + 12);
    return;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2a2218';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const seed = parseInt($("testSeed").value) || 1;
  const threshold = (parseInt($("testThreshold").value) || 50) / 100;
  // Parse grid size "WxH" ou fallback quadrado
  const sizeVal = $("testSize")?.value || '32x24';
  let NW, NH;
  if(sizeVal.includes('x')){
    const parts = sizeVal.split('x');
    NW = parseInt(parts[0]) || 32;
    NH = parseInt(parts[1]) || 24;
  } else {
    NW = NH = parseInt(sizeVal) || 24;
  }
  const bias = $("testBias")?.value || 'white';
  const vert = generateTerrainGrid(seed, threshold, NW, NH, bias);
  // cellPx: preenche o canvas inteiro mantendo pixels quadrados
  const cellPx = Math.min(Math.floor(canvas.width / NW), Math.floor(canvas.height / NH));
  const offX = Math.floor((canvas.width - NW * cellPx) / 2);
  const offY = Math.floor((canvas.height - NH * cellPx) / 2);
  // pré-carregar imgs. Em modo 'reduced-r' usa só os 6 canônicos; aplica rotação ao desenhar.
  const useReduced = (viewMode === 'reduced-r');
  const imgs = tileEditState.cells.map(c => {
    if(!c || !c.current) return null;
    const i = new Image();
    i.src = c.current;
    return i;
  });
  // depois que imgs carregarem (eles são dataURL síncronos via .onload), desenha
  let pendingLoad = imgs.filter(i => i && !i.complete).length;
  const draw = () => {
    for(let y=0; y<NH; y++){
      for(let x=0; x<NW; x++){
        const nw = vert[y][x];
        const ne = vert[y][x+1];
        const se = vert[y+1][x+1];
        const sw = vert[y+1][x];
        const bits = nw + ne*2 + se*4 + sw*8;
        let img = imgs[bits];
        let rotations = 0;
        if(useReduced){
          const info = rotInfoFor(bits);
          img = imgs[info.canon];
          rotations = info.rotations;
        }
        const px = offX + x*cellPx;
        const py = offY + y*cellPx;
        if(img && img.complete){
          if(rotations === 0){
            ctx.drawImage(img, px, py, cellPx, cellPx);
          } else {
            ctx.save();
            ctx.translate(px + cellPx/2, py + cellPx/2);
            ctx.rotate(rotations * Math.PI/2);
            ctx.drawImage(img, -cellPx/2, -cellPx/2, cellPx, cellPx);
            ctx.restore();
          }
        } else {
          ctx.fillStyle = bits === 0 ? '#7a5a2d' : (bits === 15 ? '#a8d088' : '#888');
          ctx.fillRect(px, py, cellPx, cellPx);
        }
      }
    }
  };
  if(pendingLoad === 0){ draw(); }
  else { imgs.forEach(i => i && (i.onload = () => { if(--pendingLoad <= 0) draw(); })); }
}

async function fetchTilesetMetadata(preset){
  if(!preset.metadataUrl) return null;
  if(presetMetadata[preset.id]) return presetMetadata[preset.id];
  const data = await Api.fetchMetadata(preset.metadataUrl);
  if(data) presetMetadata[preset.id] = data;
  return data;
}

function sliceImage(imgEl, tileSize, gridCols){
  const tiles = [];
  for(let i=0; i<16; i++){
    const cx = (i % gridCols) * tileSize;
    const cy = Math.floor(i / gridCols) * tileSize;
    const c = document.createElement('canvas');
    c.width = tileSize; c.height = tileSize;
    c.getContext('2d').drawImage(imgEl, cx, cy, tileSize, tileSize, 0, 0, tileSize, tileSize);
    tiles.push(c.toDataURL());
  }
  return tiles;
}

function renderRefGuide(){
  const g = $("wangRefGrid");
  g.innerHTML = '';
  for(let bits=0; bits<16; bits++){
    const c = bitsToCorners(bits);
    const cell = document.createElement('div');
    cell.className = 'wang-ref-cell';
    cell.innerHTML = `<div class="ref-corners"><div class="${c.NW}"></div><div class="${c.NE}"></div><div class="${c.SW}"></div><div class="${c.SE}"></div></div><div>${bits}</div>`;
    g.appendChild(cell);
  }
}

let editorMode = false;
let viewMode = 'full'; // 'full' | 'reduced-r'

function toggleEditorMode(){
  editorMode = !editorMode;
  $("btnEditorToggle").textContent = editorMode ? '👁 View only' : '✏️ Edit mode';
  $("btnSaveCorrected").hidden = !editorMode;
  $("btnResetCorrections").hidden = !editorMode;
  $("wangRefSection").hidden = !editorMode;
  $("editorHint").textContent = editorMode ? 'arrasta tile pra outra posição · ↻ rotate CW (top) · ↺ CCW (bottom) · ⇿ flip H (esq) · ⇕ flip V (dir)' : '';
  renderTiles();
}

function initEditState(p, slicedTiles){
  tileEditState = {
    presetId: p.id,
    cells: slicedTiles.map((src, i) => ({ src, current: src, transforms: [], origIdx: i })),
  };
}

async function rerenderEditorGrid(){
  const grid = $("wangGrid");
  grid.innerHTML = '';
  for(let i=0; i<16; i++){
    const cell = tileEditState.cells[i];
    const corners = bitsToCorners(i);
    const div = document.createElement('div');
    div.className = 'wang-cell editable';
    div.draggable = true;
    div.dataset.idx = i;
    const corrected = (cell.transforms.length > 0 || cell.origIdx !== i) ? '<div class="corrected-mark">EDIT</div>' : '';
    div.innerHTML = `
      ${corrected}
      <button class="tx-btn tx-cw" data-tx="rotate-cw" title="rotate CW">↻</button>
      <button class="tx-btn tx-ccw" data-tx="rotate-ccw" title="rotate CCW">↺</button>
      <button class="tx-btn tx-fh" data-tx="flip-h" title="flip H">⇿</button>
      <button class="tx-btn tx-fv" data-tx="flip-v" title="flip V">⇕</button>
      <img class="tile-canvas" src="${cell.current || ''}" draggable="false">
      <div class="wlabel">${i} (orig: ${cell.origIdx}${cell.transforms.length ? ' +'+cell.transforms.length+'tx' : ''})</div>
      <div class="wcorners">NW:${corners.NW[0].toUpperCase()} NE:${corners.NE[0].toUpperCase()} SE:${corners.SE[0].toUpperCase()} SW:${corners.SW[0].toUpperCase()}</div>
      ${cornerSquare(corners)}`;
    // transform handlers
    div.querySelectorAll('.tx-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        cell.transforms.push(btn.dataset.tx);
        await regenCellImage(cell);
        rerenderEditorGrid();
        renderTestMap();
      };
    });
    // drag-drop
    div.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; });
    div.addEventListener('dragover', (e) => { e.preventDefault(); div.classList.add('drag-over'); });
    div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
    div.addEventListener('drop', async (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      if(fromIdx === i) return;
      // swap cells
      const tmp = tileEditState.cells[fromIdx];
      tileEditState.cells[fromIdx] = tileEditState.cells[i];
      tileEditState.cells[i] = tmp;
      rerenderEditorGrid();
      renderTestMap();
    });
    grid.appendChild(div);
  }
}

async function renderTiles(){
  renderPresetList();
  renderCompareAll();   // 🌐 overview de todos os 13 tilesets, com filter biome/season
  const p = activePreset;
  $("tilesetTitle").textContent = p.name;
  $("editorBar").hidden = false;
  $("btnViewFull").classList.toggle('active', viewMode === 'full');
  $("btnViewReduced").classList.toggle('active', viewMode === 'reduced-r');
  renderRefGuide();
  // Bug fix: mostra placeholder no canvas enquanto tiles carregam
  if(!tileEditState || tileEditState.presetId !== p.id) renderTestMap();
  const grid = $("wangGrid");
  grid.innerHTML = '';
  if(editorMode && tileEditState && tileEditState.presetId === p.id){
    await rerenderEditorGrid();
    return;
  }
  const cells = [];
  const bitsList = (viewMode === 'reduced-r') ? ROT_CANONS : Array.from({length:16}, (_,i)=>i);
  bitsList.forEach(bits => {
    const corners = bitsToCorners(bits);
    const cell = document.createElement('div');
    cell.className = 'wang-cell';
    const orbitMembers = rotOrbit(bits);
    const orbitLabel = (viewMode === 'reduced-r' && orbitMembers.length > 1)
      ? `<div class="orbit-info">orbit: {${orbitMembers.join(', ')}} via R</div>` : '';
    cell.innerHTML = `
      <div class="wtile" data-bits="${bits}"></div>
      <div class="wlabel">${bits} (0x${bits.toString(16).toUpperCase()})</div>
      <div class="wcorners">NW:${corners.NW[0].toUpperCase()} NE:${corners.NE[0].toUpperCase()} SE:${corners.SE[0].toUpperCase()} SW:${corners.SW[0].toUpperCase()}</div>
      ${cornerSquare(corners)}${orbitLabel}`;
    grid.appendChild(cell);
    cells.push({el: cell, bits});
  });
  let infoHTML = `Tileset <code>${p.id}</code> · ${p.meta}`;
  if(p.info) infoHTML += `<br><br>${p.info}`;
  if(p.docLink) infoHTML += `<br>📖 <a href="${p.docLink}" target="_blank" style="color:#9fcfe8;">${p.docTitle || p.docLink}</a>`;
  if(p.refs?.length){
    infoHTML += `<br><br><strong style="font-size:12px;letter-spacing:1px;">📚 REFS:</strong><ul style="margin:4px 0 0 18px;padding:0;">`;
    p.refs.forEach(r => { infoHTML += `<li style="font-size:12px;"><a href="${r.url}" target="_blank" style="color:#9fcfe8;">${r.title}</a></li>`; });
    infoHTML += `</ul>`;
  }
  $("tilesetInfo").innerHTML = infoHTML;
  if(p.sliced){
    // Sempre carrega os 16 pra alimentar tileEditState/renderTestMap. Renderiza só os visíveis (filtrados por viewMode).
    const slicedURLs = [];
    let pending = 16;
    const onAll = () => { initEditState(p, slicedURLs); renderTestMap(); _maybeAutoSort(p); };
    for(let bits=0; bits<16; bits++){
      const visibleCell = cells.find(c => c.bits === bits);
      const wtile = visibleCell ? visibleCell.el.querySelector('.wtile') : null;
      const img = new Image();
      img.src = p.sliceFn(bits);
      img.style.width = '96px'; img.style.height = '96px'; img.style.imageRendering = 'pixelated';
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        cv.getContext('2d').drawImage(img, 0, 0);
        try { slicedURLs[bits] = cv.toDataURL(); } catch(e){ slicedURLs[bits] = null; }
        if(wtile){ wtile.innerHTML = ''; wtile.appendChild(img); }
        if(--pending === 0) onAll();
      };
      img.onerror = () => { if(wtile){ wtile.style.background = '#3a2d1e'; wtile.textContent = '?'; wtile.style.color='#666'; wtile.style.lineHeight='96px'; } if(--pending === 0) onAll(); };
    }
    return;
  }
  const meta = await fetchTilesetMetadata(p);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const tileSize = p.tileSize || 16;
    const tiles = sliceImage(img, tileSize, Math.floor(img.width / tileSize));
    const mapping = {};
    if(meta?.tiles){
      meta.tiles.forEach((t, i) => {
        const c = t.corners || {};
        const b = (c.NW==='upper'?1:0) + (c.NE==='upper'?2:0) + (c.SE==='upper'?4:0) + (c.SW==='upper'?8:0);
        mapping[b] = i;
      });
    } else {
      // Aplicar default: PixelLab usa convenção CCW-shifted vs cr31 (validado em Ground Truth)
      for(let i=0;i<16;i++) mapping[i] = CR31_TO_PIXELLAB_MAP[i];
    }
    const orderedTiles = [];
    for(let bits=0; bits<16; bits++){
      const ti = mapping[bits];
      orderedTiles[bits] = (ti !== undefined) ? tiles[ti] : null;
    }
    cells.forEach(({el, bits}) => {
      const wtile = el.querySelector('.wtile');
      wtile.innerHTML = '';
      if(!orderedTiles[bits]){
        wtile.textContent = '—'; wtile.style.color='#666'; wtile.style.lineHeight='96px';
        return;
      }
      const tileImg = new Image();
      tileImg.src = orderedTiles[bits];
      tileImg.style.width = '96px'; tileImg.style.height = '96px'; tileImg.style.imageRendering = 'pixelated';
      wtile.appendChild(tileImg);
    });
    initEditState(p, orderedTiles);
    renderTestMap();
    if(!meta?.tiles){
      $("tilesetInfo").innerHTML += `<br>🔁 default PixelLab→cr31 permutation aplicada (sem metadata cr31 nativa)`;
    }
    // tenta aplicar correção salva por cima do default
    applyStoredCorrections(p.id);
    _maybeAutoSort(p);
  };
  img.onerror = () => {
    $("tilesetInfo").innerHTML += `<br>⚠ erro ao carregar imagem (tileset talvez ainda em geração no PixelLab)`;
    cells.forEach(({el}) => {
      const wtile = el.querySelector('.wtile');
      wtile.style.background = '#4a1d1d';
      wtile.style.color = '#e89f9f';
      wtile.style.lineHeight = '96px';
      wtile.textContent = 'X';
    });
  };
  img.src = p.image + (p.image.includes('?') ? '&' : '?') + 't=' + Date.now();
}

// Test map controls
function updateGridInfo(){
  const info = $("testGridInfo");
  if(!info) return;
  const sizeVal = $("testSize")?.value || '32x24';
  let nw, nh;
  if(sizeVal.includes('x')){ const p = sizeVal.split('x'); nw = +p[0]; nh = +p[1]; }
  else { nw = nh = +sizeVal; }
  const tileSize = activePreset?.tileSize || 16;
  const totalCells = nw * nh;
  // Game map: 8000x6000 = NW×NH cells com tile_size px
  const gameW = Math.ceil(8000 / tileSize);
  const gameH = Math.ceil(6000 / tileSize);
  info.textContent = `${nw}×${nh} = ${totalCells} cells · tile ${tileSize}px · game map: ${gameW}×${gameH} = ${(gameW*gameH).toLocaleString()} tiles (PixelLab max: 32px)`;
}
function bindTestControls(){
  const t = $("testThreshold"); const tv = $("testThresholdVal");
  if(t){ t.oninput = () => { tv.textContent = t.value + '%'; renderTestMap(); }; }
  const s = $("testSeed"); if(s) s.onchange = () => renderTestMap();
  const sz = $("testSize"); if(sz) sz.onchange = () => { updateGridInfo(); renderTestMap(); };
  const r = $("btnRandomSeed"); if(r) r.onclick = () => { $("testSeed").value = Math.floor(Math.random()*1e6); renderTestMap(); };
  const re = $("btnRegenTest"); if(re) re.onclick = renderTestMap;
  const b = $("testBias"); if(b) b.onchange = renderTestMap;
}
bindTestControls();
updateGridInfo();

// botões do editor
document.addEventListener('click', (e) => {
  if(e.target.id === 'btnViewFull'){ viewMode = 'full'; renderTiles(); }
  if(e.target.id === 'btnViewReduced'){ viewMode = 'reduced-r'; renderTiles(); }
  if(e.target.id === 'btnEditorToggle') toggleEditorMode();
  if(e.target.id === 'btnAutoSort') autoSortTiles();
  if(e.target.id === 'btnShuffleTiles'){
    if(!tileEditState) return;
    _autoSortSnapshot = tileEditState.cells.map(c => c ? {...c, transforms: c.transforms.slice()} : null);
    $("btnRestoreSnap").hidden = false;
    // Embaralha apenas os 14 do meio (mantém 0 e 15 anchored como ref pro auto-sort)
    const middle = [];
    for(let i=1; i<15; i++) middle.push(tileEditState.cells[i]);
    for(let i = middle.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [middle[i], middle[j]] = [middle[j], middle[i]];
    }
    for(let i=1; i<15; i++) tileEditState.cells[i] = middle[i-1];
    if(editorMode) rerenderEditorGrid();
    renderTestMap();
    $("editorHint").textContent = '🎲 Embaralhado (0/15 anchored). Click 🔍 Auto-sort pra ver funcionar';
  }
  if(e.target.id === 'btnFlipLU') autoSortTiles(!_lastAutoSortFlipped);
  if(e.target.id === 'btnRotPlaceCW' || e.target.id === 'btnRotPlaceCCW'){
    if(!tileEditState) return;
    const dir = (e.target.id === 'btnRotPlaceCW') ? 1 : -1;
    const newCells = new Array(16).fill(null);
    for(let i=0; i<16; i++){
      const target = dir === 1 ? rotCW(i) : rotCCW(i);
      newCells[target] = tileEditState.cells[i];
    }
    tileEditState.cells = newCells;
    if(editorMode) rerenderEditorGrid();
    renderTestMap();
    $("editorHint").textContent = `${dir===1?'↻':'↺'} placements rotacionados`;
  }
  if(e.target.id === 'btnRestoreSnap'){
    if(!_autoSortSnapshot){ return; }
    tileEditState.cells = _autoSortSnapshot.map(c => c ? {...c, transforms: c.transforms.slice()} : null);
    if(editorMode) rerenderEditorGrid();
    renderTestMap();
    $("editorHint").textContent = '↩ Estado anterior restaurado (incluindo orientações)';
    $("btnRestoreSnap").hidden = true;
    _autoSortSnapshot = null;
  }
  if(e.target.id === 'btnReloadTileset'){ presetMetadata = {}; tileEditState = null; _autoSortSnapshot = null; $("btnRestoreSnap").hidden = true; renderTiles(); }
  if(e.target.id === 'btnSaveCorrected'){
    if(!tileEditState) return;
    // Fetch existing registry, merge this preset, save back
    Api.loadWangCorrections().then(registry => {
      registry = registry || {};
      registry[tileEditState.presetId] = {
        timestamp: Date.now(),
        cells: tileEditState.cells.map((c,i) => ({ position: i, origIdx: c.origIdx, transforms: c.transforms })),
      };
      Api.saveWangCorrections(registry).then(r => r.json()).then(r => {
        $("editorHint").textContent = r.ok ? `💾 Salvo (${Object.keys(registry).length} presets registrados)` : `⚠ erro: ${JSON.stringify(r)}`;
      }).catch(err => {
        $("editorHint").textContent = `⚠ servidor offline (${err.message})`;
      });
    });
  }
  if(e.target.id === 'btnResetCorrections'){
    if(!tileEditState) return;
    if(!confirm('Reset todas as correções?')) return;
    tileEditState.cells.forEach((c,i) => { c.transforms = []; c.current = c.src; c.origIdx = i; });
    rerenderEditorGrid();
  }
});
