// PixaPro · tab-gallery.js — Gallery tab (sumário promoted/discarded/pending)
//
// Globals expostos: summaryData, promotedFilter, assetTags, saveAssetTags,
//                   collectAssetTags, fetchSummary, renderGallery
//
// Dependências: MANIFEST, decisions (tab-manager), Api, Store, $, fillSumGrid

let summaryData = null;
let promotedFilter = 'folders'; // folders | files | type | tags

// Tags state: { [assetPath]: ['tag1', 'tag2'] }
let assetTags = Store.loadTags();
function saveAssetTags(){
  Store.saveTags(assetTags);
  Api.saveTags(assetTags);
}
function collectAssetTags(){
  const set = new Set();
  Object.values(assetTags).forEach(tags => tags.forEach(t => set.add(t)));
  return [...set].sort();
}

// Carrega registry do disk se existir (merge: localStorage wins por ser mais recente)
Api.loadTags().then(data => {
  if(data && typeof data === 'object'){
    assetTags = {...data, ...assetTags};
    saveAssetTags();
  }
});

async function fetchSummary(){
  return await Api.listAssets();
}

function renderGallery(){
  const fsAssets = summaryData?.filesystem || [];
  const orphans  = summaryData?.orphans || [];

  // Promoted = filesystem assets em pastas categorizadas + decisions promote
  const fsPromoted    = fsAssets.filter(a => /\/(objects|vegetation|enemies|hud|chars\/[^\/]+\/)/.test(a.path) && !/inbox/.test(a.path));
  const localPromoted = MANIFEST.filter(m => decisions[m.id]?.action === 'promote');

  // Discarded = decisions discard
  const localDiscarded = MANIFEST.filter(m => decisions[m.id]?.action === 'discard');

  // Pending = inbox + manifest sem decisão + orfãos do PixelLab
  const inboxAssets  = fsAssets.filter(a => /inbox/.test(a.path));
  const localPending = MANIFEST.filter(m => !decisions[m.id] || decisions[m.id].action === 'rename');

  const promotedItems = [
    ...fsPromoted.map(a => ({path: a.path, name: a.path.split(/[\\/]/).pop()})),
    ...localPromoted.map(m => ({path: m.path, name: m.name})),
  ];
  $("sumPromoted").textContent = promotedItems.length;
  $("sumPromotedBd").innerHTML = `📁 ${fsPromoted.length} no filesystem · 📋 ${localPromoted.length} marcados (manager)`;
  window._promotedItems = promotedItems;
  fillSumGrid('sumPromotedGrid', promotedItems, promotedFilter);

  $("sumDiscarded").textContent = localDiscarded.length;
  $("sumDiscardedBd").innerHTML = `📋 ${localDiscarded.length} marcados (manager)<br><span style="opacity:.5">obs: descartados ainda não removidos do disco</span>`;
  fillSumGrid('sumDiscardedGrid', localDiscarded.map(m => ({path: m.path, name: m.name})));

  $("sumPending").textContent = inboxAssets.length + orphans.length;
  $("sumPendingBd").innerHTML = `📁 ${inboxAssets.length} no inbox<br>☁ ${orphans.length} órfãos no PixelLab (sem decisão local)`;
  fillSumGrid('sumPendingGrid', inboxAssets.map(a => ({path: a.path, name: a.path.split(/[\\/]/).pop()})));

  if(!summaryData){
    fetchSummary().then(d => { summaryData = d || {filesystem:[], orphans:[]}; renderGallery(); });
  }
}

// Cache do scan in-game (regex precisa em js/*.js, server endpoint /scan_in_game_assets)
// Repopula on demand quando renderInGamePanel é chamado (com TTL no client).
// Fetch direto (não via Api.*) pra evitar issues de cache do api.js.
let _inGameScanCache = null;
let _inGameScanFetchedAt = 0;
async function _ensureInGameScan(){
  if (_inGameScanCache && (Date.now() - _inGameScanFetchedAt) < 60000) return _inGameScanCache;
  try {
    const url = (typeof API_BASE !== 'undefined' ? API_BASE : '') + '/scan_in_game_assets';
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    _inGameScanCache = data?.paths || {};
    _inGameScanFetchedAt = Date.now();
  } catch(e) {
    _inGameScanCache = {};
  }
  return _inGameScanCache;
}

// ⏳ PENDING panel unificado (roxo) — Audit tab.
// Anim frames colapsados ao parent (1 thumb por anim, não 232 frames).
// Outline color-coded: blue=in-game (scan REAL via regex em js/), yellow=not in-game.
// Click → loadAuditAsset() carrega no stage; asset NÃO sai da lista
// (decisões só via P/D/R/C buttons ou hotkeys).
async function renderInGamePanel(){
  if (!$("sumPendingTotal")) return;
  if (!summaryData) {
    fetchSummary().then(d => { summaryData = d || {filesystem:[], orphans:[]}; renderInGamePanel(); });
    return;
  }
  const inGameMap = await _ensureInGameScan();  // {path: bool}
  const fsAssets = summaryData?.filesystem || [];
  const decidedPaths = new Set();
  for (const k in decisions) {
    const p = decisions[k]?.path;
    if (p) decidedPaths.add(p.replace(/^\.\.\//, ''));
  }

  // Coleta tudo sem decisão. inGame vem do scan real (regex em js/*.js)
  // — NÃO mais heurística por path/inbox.
  const allUnaudited = [];
  const seenPaths = new Set();
  for (const a of fsAssets) {
    const path = a.abs || a.path.replace(/^\.\.\//, '');
    if (decidedPaths.has(path)) continue;
    seenPaths.add(path);
    allUnaudited.push({
      path: a.path,
      cleanPath: path,
      name: path.split(/[\\/]/).pop().replace('.png',''),
      inGame: !!inGameMap[path],   // scan real
    });
  }
  for (const m of MANIFEST) {
    if (decisions[m.id]?.action) continue;
    if (m._audit) continue;
    const cleanPath = (m.path || '').replace(/^\.\.\//, '');
    if (cleanPath && seenPaths.has(cleanPath)) continue;
    allUnaudited.push({
      path: m.path,
      cleanPath,
      name: m.name,
      inGame: !!inGameMap[cleanPath],
    });
  }

  // === Collapse: agrupa ANIMS (frames) + DIRECTION SETS (8 dirs base) ===
  // Toggle: window._auditCollapseAnims (default true). Quando ON:
  // - anims: chars/<char>/anims/<anim>/<dir>/frame_NNN.png → 1 thumb (group key = anim folder)
  // - directions: chars/<char>/<DIR>.png ou chars/<X>/<color>/<DIR>.png → 1 thumb (S preferred)
  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];
  const dirRe = new RegExp(`^(.+)/(${DIRS.join('|')})\\.png$`);
  const collapseAnims = window._auditCollapseAnims !== false;
  let items;
  if (collapseAnims) {
    const groups = new Map();
    const standalone = [];
    for (const it of allUnaudited) {
      // 1) Anim frames
      let m = it.cleanPath.match(/^(.+?\/anims\/[^/]+)\/[^/]+\/frame_\d+\.png$/);
      if (m) {
        const groupKey = '🎬 ' + m[1];
        if (!groups.has(groupKey)) {
          const animName = m[1].split('/').slice(-3).join('/');
          groups.set(groupKey, {
            path: it.path, cleanPath: it.cleanPath,
            name: '🎬 ' + animName, inGame: it.inGame,
            count: 0, isAnimGroup: true, groupKey,
          });
        }
        const g = groups.get(groupKey);
        g.count++;
        if (/\/S\//.test(it.cleanPath) && /frame_000/.test(it.cleanPath)) {
          g.path = it.path; g.cleanPath = it.cleanPath;
        }
        continue;
      }
      // 2) Direction sets (8-dir base)
      m = it.cleanPath.match(dirRe);
      if (m) {
        const folder = m[1];        // chars/vaca  ou chars/scarecrow_droid/blue
        const dir = m[2];           // N, NE, etc
        const groupKey = '🧭 ' + folder;
        if (!groups.has(groupKey)) {
          const dispName = folder.split('/').slice(-2).join('/');
          groups.set(groupKey, {
            path: it.path, cleanPath: it.cleanPath,
            name: '🧭 ' + dispName, inGame: it.inGame,
            count: 0, isDirGroup: true, groupKey,
          });
        }
        const g = groups.get(groupKey);
        g.count++;
        if (dir === 'S') { g.path = it.path; g.cleanPath = it.cleanPath; }
        continue;
      }
      standalone.push(it);
    }
    items = [...standalone, ...groups.values()];
  } else {
    items = allUnaudited;
  }

  // Aplica filtro ativo (window._auditFilter: 'all' | 'in-game' | 'not-in-game')
  const filter = window._auditFilter || 'all';
  const filtered = items.filter(it => {
    if (filter === 'in-game')     return it.inGame;
    if (filter === 'not-in-game') return !it.inGame;
    return true;
  });

  // Render no painel unificado
  const inGameCount = items.filter(x => x.inGame).length;
  const notInGameCount = items.length - inGameCount;
  $("sumPendingTotal").textContent =
    filter === 'all' ? items.length : `${filtered.length}/${items.length}`;
  $("sumPendingBd").innerHTML =
    `<span style="color:#9fcfe8;">🔵 ${inGameCount} in-game</span> · ` +
    `<span style="color:#f4c95d;">🟡 ${notInGameCount} not in-game</span> · ` +
    `<span style="opacity:.6;">Click no thumb pra abrir no stage. Anim frames colapsados.</span>`;

  const grid = $("sumPendingGridUnified");
  if (!grid) return;
  grid.innerHTML = '';
  for (const it of filtered) {
    const wrap = document.createElement('div');
    wrap.className = 'thumb';
    wrap.style.width = '46px'; wrap.style.height = '46px';
    wrap.style.cursor = 'pointer';
    wrap.style.position = 'relative';
    wrap.style.borderColor = it.inGame ? '#4da9e8' : '#f4c95d';
    wrap.style.borderWidth = '2px';
    wrap.title = it.name + (it.isAnimGroup ? ` (${it.count} frames)` : '');
    const img = document.createElement('img');
    img.src = it.path;
    wrap.appendChild(img);
    if (it.isAnimGroup || it.isDirGroup) {
      const badge = document.createElement('span');
      badge.textContent = it.isAnimGroup ? '🎬' : '🧭';
      badge.style.cssText = 'position:absolute;top:-3px;right:-3px;font-size:10px;background:#1a1410;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;';
      wrap.appendChild(badge);
      // Conta visível (X frames/dirs)
      if (it.count > 1) {
        const cnt = document.createElement('span');
        cnt.textContent = it.count;
        cnt.style.cssText = 'position:absolute;bottom:-3px;right:-3px;font-size:9px;background:#1a1410;color:#dfa6df;border-radius:8px;padding:0 4px;font-weight:bold;';
        wrap.appendChild(cnt);
      }
    }
    wrap.onclick = () => {
      if (typeof loadAuditAsset === 'function') loadAuditAsset(it.path, it.name);
    };
    grid.appendChild(wrap);
  }
}

// === Filter bar do PROMOTED ===
// === Audit filter buttons (All / In-game / Not in-game) ===
document.addEventListener('click', (e) => {
  const b = e.target.closest('.audit-filter');
  if (!b) return;
  window._auditFilter = b.dataset.filter;
  document.querySelectorAll('.audit-filter').forEach(x => {
    const active = (x === b);
    x.classList.toggle('active', active);
    x.style.boxShadow = active ? '0 0 8px rgba(244,201,93,0.5)' : 'none';
    x.style.fontWeight = active ? 'bold' : 'normal';
  });
  if (typeof renderInGamePanel === 'function') renderInGamePanel();
});

// === Toggle: Group anim frames no sprite parent ===
document.addEventListener('click', (e) => {
  const b = e.target.closest('#btnToggleCollapseAnims');
  if (!b) return;
  window._auditCollapseAnims = !(window._auditCollapseAnims !== false);
  // window._auditCollapseAnims agora = false se era true (estava ativo), true se era false
  const isOn = window._auditCollapseAnims !== false;
  b.classList.toggle('active', isOn);
  b.style.boxShadow = isOn ? '0 0 8px rgba(244,201,93,0.5)' : 'none';
  b.style.fontWeight = isOn ? 'bold' : 'normal';
  b.style.opacity = isOn ? '1' : '0.5';
  b.textContent = isOn ? '🎬🧭 Group anims+dirs' : '🎞️ Show all individuals';
  if (typeof renderInGamePanel === 'function') renderInGamePanel();
});

document.querySelectorAll('#promotedFilterBar button').forEach(b => {
  b.onclick = () => {
    promotedFilter = b.dataset.filter;
    document.querySelectorAll('#promotedFilterBar button').forEach(x => x.classList.toggle('active', x === b));
    if(window._promotedItems) fillSumGrid('sumPromotedGrid', window._promotedItems, promotedFilter);
  };
});

// === Refresh button ===
let _galleryRefreshing = false;
$("btnRefreshSummary")?.addEventListener('click', async () => {
  if(_galleryRefreshing) return; // Bug fix: debounce double-click
  _galleryRefreshing = true;
  const btn = $("btnRefreshSummary");
  btn.textContent = '⏳ Scanning…';
  btn.disabled = true;
  summaryData = null;
  summaryData = await fetchSummary() || {filesystem:[], orphans:[]};
  renderGallery();
  btn.textContent = '↻ Refresh';
  btn.disabled = false;
  _galleryRefreshing = false;
});
