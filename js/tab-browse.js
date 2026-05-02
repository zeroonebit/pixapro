// PixaPro · tab-browse.js — Asset gallery com filtros (cat/in-game/search)
// Consome /scan_assets (server) ou /data/_assets_index.json (Pages).
// Renderiza thumbs lazy-loaded apontando pra <project>/assets/...

(function(){
  let _data = null;
  let _filtered = [];

  function $(id) { return document.getElementById(id); }
  function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function activeProjectCfg() { return window.PixaProjects.getActiveCfg(); }

  // URL pra fetchar a imagem real do asset
  function assetUrl(relPath) {
    const cfg = activeProjectCfg();
    // Prefere Pages URL (sempre acessivel sem CORS issues entre Pages domains)
    if (cfg.pages) return `${cfg.pages}/${relPath}`;
    if (cfg.server) return `${cfg.server}/${relPath}`;
    return relPath;
  }

  async function loadData() {
    setStats('🔄 loading...');
    const result = await window.PixaProjects.fetchWithFallback(
      '/scan_assets',
      '/data/_assets_index.json'
    );
    if (!result) {
      setStats(`✗ nem server nem Pages respondem`);
      return;
    }
    _data = result.data;
    populateCategoryDropdown();
    applyFilters();
    setStats(`✓ ${_data.total} assets · ${_data.in_game ?? '?'} in-game · ${_data.orphan ?? '?'} órfãos · source: ${result.source}`);
  }

  function populateCategoryDropdown() {
    if (!_data) return;
    const sel = $('browseFilterCat');
    if (!sel) return;
    const current = sel.value;
    const cats = Object.entries(_data.by_category || {}).sort((a,b) => b[1]-a[1]);
    sel.innerHTML = '<option value="">All categories</option>' +
      cats.map(([k, v]) => `<option value="${escHtml(k)}"${k === current ? ' selected' : ''}>${escHtml(k)} (${v})</option>`).join('');
  }

  function applyFilters() {
    if (!_data) return;
    const cat = $('browseFilterCat')?.value || '';
    const ig = $('browseFilterInGame')?.value || '';
    const search = ($('browseSearch')?.value || '').toLowerCase().trim();
    _filtered = (_data.items || []).filter(it => {
      if (cat && it.category !== cat) return false;
      if (ig === 'true' && !it.inGame) return false;
      if (ig === 'false' && it.inGame) return false;
      if (search) {
        const hay = (it.path + ' ' + JSON.stringify(it.tags || {})).toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    renderResults();
  }

  function renderResults() {
    const grid = $('browseGrid');
    const stats = $('browseQueryStats');
    const view = $('browseView')?.value || 'grid';
    if (!grid) return;
    if (stats) stats.textContent = `Showing ${_filtered.length} of ${_data?.total ?? 0} assets`;
    if (_filtered.length === 0) {
      grid.innerHTML = '<div style="opacity:.5;text-align:center;padding:40px;grid-column:1/-1;">Nenhum asset bate os filtros.</div>';
      return;
    }
    if (view === 'list') {
      grid.style.gridTemplateColumns = '1fr';
      grid.innerHTML = _filtered.map((it, i) => {
        const igBadge = it.inGame ? '🟢' : '🟡';
        return `<div class="browse-item" data-idx="${i}" style="display:flex;align-items:center;gap:8px;padding:4px 8px;background:#2a2218;border:1px solid #4a3826;border-radius:3px;font-size:11px;font-family:monospace;cursor:pointer;">
          <span>${igBadge}</span>
          <span style="background:#1a2236;color:#88aacc;padding:1px 6px;border-radius:3px;font-size:9px;">${escHtml(it.category)}</span>
          <span style="flex:1;color:#f4c95d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(it.path)}</span>
        </div>`;
      }).join('');
    } else {
      grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(110px,1fr))';
      // Limita a 200 por render pra performance
      const slice = _filtered.slice(0, 200);
      grid.innerHTML = slice.map((it, i) => {
        const igBadge = it.inGame
          ? '<span style="position:absolute;top:2px;right:2px;background:rgba(76,170,76,0.9);color:#fff;font-size:8px;padding:1px 4px;border-radius:2px;">IN</span>'
          : '<span style="position:absolute;top:2px;right:2px;background:rgba(204,153,102,0.9);color:#fff;font-size:8px;padding:1px 4px;border-radius:2px;">ORF</span>';
        const fname = it.path.split('/').pop().replace('.png','');
        return `<div class="browse-item" data-idx="${i}" style="position:relative;background:#2a2218;border:1px solid #4a3826;border-radius:3px;cursor:pointer;overflow:hidden;">
          <div style="position:relative;aspect-ratio:1;background:#1a1408;display:flex;align-items:center;justify-content:center;">
            <img src="${assetUrl(it.path)}" style="max-width:100%;max-height:100%;image-rendering:pixelated;" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
            <span style="display:none;color:#cc6644;font-size:18px;">⚠</span>
            ${igBadge}
          </div>
          <div style="padding:3px 5px;font-size:9px;color:#f4c95d;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(it.path)}">${escHtml(fname)}</div>
        </div>`;
      }).join('');
      if (_filtered.length > 200) {
        grid.innerHTML += `<div style="grid-column:1/-1;text-align:center;padding:10px;opacity:.5;font-size:11px;">+ ${_filtered.length - 200} more (refine os filtros)</div>`;
      }
    }
    // Click pra detalhe
    grid.querySelectorAll('.browse-item').forEach(el => {
      el.addEventListener('click', () => showDetail(parseInt(el.dataset.idx)));
    });
  }

  function showDetail(idx) {
    const it = _filtered[idx];
    if (!it) return;
    const panel = $('browseDetail');
    if (!panel) return;
    const url = assetUrl(it.path);
    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <h4 style="margin:0;color:#f4c95d;">${escHtml(it.path.split('/').pop())}</h4>
        <button id="browseDetailClose" style="padding:2px 8px;font-size:11px;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:200px 1fr;gap:14px;">
        <div style="background:#1a1408;padding:10px;border-radius:3px;display:flex;align-items:center;justify-content:center;">
          <img src="${url}" style="max-width:180px;max-height:180px;image-rendering:pixelated;" />
        </div>
        <div>
          <div style="margin-bottom:6px;"><strong style="color:#a89368;">Path:</strong> <span style="font-family:monospace;color:#f4c95d;">${escHtml(it.path)}</span></div>
          <div style="margin-bottom:6px;"><strong style="color:#a89368;">Category:</strong> <span style="background:#1a2236;color:#88aacc;padding:1px 8px;border-radius:3px;font-family:monospace;">${escHtml(it.category)}</span></div>
          <div style="margin-bottom:6px;"><strong style="color:#a89368;">In-game:</strong> ${it.inGame ? '<span style="color:#88cc66;">🟢 yes (wired no js)</span>' : '<span style="color:#cc9966;">🟡 no (orfão)</span>'}</div>
          <div style="margin-bottom:6px;"><strong style="color:#a89368;">Confidence:</strong> ${(it.confidence * 100).toFixed(0)}%</div>
          <div style="margin-bottom:6px;"><strong style="color:#a89368;">Tags:</strong>
            <pre style="background:#1a1408;padding:6px;border-radius:3px;font-size:10px;color:#88aacc;margin:4px 0 0;overflow-x:auto;">${escHtml(JSON.stringify(it.tags || {}, null, 2))}</pre>
          </div>
          ${it.suggested_path ? `<div style="margin-bottom:6px;"><strong style="color:#cc8866;">Suggested rename:</strong> <span style="color:#88cc66;font-family:monospace;">${escHtml(it.suggested_path)}</span></div>` : ''}
          <div style="margin-top:10px;">
            <a href="${url}" target="_blank" style="color:#88ccff;font-size:11px;">📂 Open in new tab</a>
          </div>
        </div>
      </div>
    `;
    document.getElementById('browseDetailClose')?.addEventListener('click', () => panel.style.display = 'none');
    panel.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }

  function setStats(msg) {
    const el = $('browseStats');
    if (el) el.textContent = msg;
  }

  // Debounce search input
  let _searchTimer;
  function onSearchInput() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(applyFilters, 250);
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('browseRefresh')?.addEventListener('click', loadData);
    $('browseFilterCat')?.addEventListener('change', applyFilters);
    $('browseFilterInGame')?.addEventListener('change', applyFilters);
    $('browseSearch')?.addEventListener('input', onSearchInput);
    $('browseView')?.addEventListener('change', renderResults);
    document.addEventListener('pixapro:project-changed', loadData);
    document.querySelectorAll('.tab[data-tab="browse"]').forEach(b => {
      b.addEventListener('click', () => {
        if (!_data) setTimeout(loadData, 100);
      });
    });
  });
})();
