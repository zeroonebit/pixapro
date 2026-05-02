// PixaPro · tab-naming.js — Asset naming convention audit
// Consome endpoints do project_server:
//   GET  /scan_assets   -> lista classificada + sugestoes
//   POST /apply_renames -> aplica batch (com backup)
//
// Doc: PROJECT_INTEGRATION.md + ASSET_NAMING_STANDARD.md

(function(){

  const PROJECTS = {
    'chapada-escapade': 'http://localhost:8090',
  };

  let _scanData = null;       // ultimo scan completo (cache em memoria)
  let _selected = new Set();  // suggestions selecionadas pra apply

  function activeProject() {
    const sel = document.getElementById('namingProjectSel');
    return sel ? sel.value : 'chapada-escapade';
  }
  function activeProjectUrl() {
    return PROJECTS[activeProject()] || 'http://localhost:8090';
  }
  function $(id) { return document.getElementById(id); }
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function setStatus(msg, ok=true) {
    const el = $('namingStatus');
    if (el) {
      el.textContent = msg;
      el.style.color = ok ? '#88aa66' : '#cc6644';
    }
  }

  async function runScan() {
    setStatus('🔄 scanning...');
    try {
      const r = await fetch(`${activeProjectUrl()}/scan_assets`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      _scanData = await r.json();
      _selected.clear();
      renderStats();
      renderByCategory();
      renderSuggestions();
      renderUnclassified();
      setStatus(`✓ scan completo: ${_scanData.total} assets, ${_scanData.suggestions.length} renames sugeridos`);
    } catch (e) {
      setStatus(`✗ scan falhou: ${e.message} -- rode \`python tools/project_server.py\``, false);
    }
  }

  function renderStats() {
    if (!_scanData) return;
    $('statTotal').textContent = _scanData.total;
    $('statClassified').textContent = _scanData.classified;
    $('statUnclassified').textContent = _scanData.unclassified;
    $('statSuggestions').textContent = _scanData.suggestions.length;
  }

  function renderByCategory() {
    if (!_scanData) return;
    const list = $('namingByCategory');
    if (!list) return;
    const cats = Object.entries(_scanData.by_category).sort((a, b) => b[1] - a[1]);
    list.innerHTML = cats.map(([k, v]) => {
      const isUnc = k === 'unclassified';
      const color = isUnc ? '#cc8866' : '#88cc66';
      return `<div style="background:#2a2218;border:1px solid #4a3826;padding:5px 8px;border-radius:3px;display:flex;justify-content:space-between;">
        <span style="color:${color};font-weight:bold;">${escHtml(k)}</span>
        <span style="opacity:.7;">${v}</span>
      </div>`;
    }).join('');
  }

  function renderSuggestions() {
    if (!_scanData) return;
    const list = $('namingSuggestionsList');
    if (!list) return;
    const sugs = _scanData.suggestions || [];
    if (sugs.length === 0) {
      list.innerHTML = '<div style="opacity:.5;text-align:center;padding:20px;">Nenhuma sugestao -- todos os assets ja seguem o standard ✓</div>';
      return;
    }
    list.innerHTML = sugs.map((s, idx) => `
      <label style="display:flex;align-items:center;gap:6px;background:#2a2218;border:1px solid #4a3826;padding:5px 8px;border-radius:3px;cursor:pointer;">
        <input type="checkbox" class="sugg-chk" data-idx="${idx}" />
        <span style="flex:1;color:#cc8866;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(s.from)}</span>
        <span style="opacity:.4;">→</span>
        <span style="flex:1;color:#88cc66;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(s.to)}</span>
        <span style="opacity:.5;font-size:10px;">${(s.confidence * 100).toFixed(0)}%</span>
      </label>
    `).join('');
    list.querySelectorAll('.sugg-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        const idx = parseInt(chk.dataset.idx);
        if (chk.checked) _selected.add(idx); else _selected.delete(idx);
        updateSelectedCount();
      });
    });
    updateSelectedCount();
  }

  function renderUnclassified() {
    if (!_scanData) return;
    const list = $('namingUnclassifiedList');
    if (!list) return;
    const unc = (_scanData.items || []).filter(i => i.category === 'unclassified');
    if (unc.length === 0) {
      list.innerHTML = '<div style="opacity:.5;text-align:center;padding:20px;">Nenhum asset unclassified ✓</div>';
      return;
    }
    list.innerHTML = unc.map(it => `
      <div style="background:#2a2018;border:1px solid #4a3826;padding:4px 8px;border-radius:3px;">
        <span style="color:#cc8866;">${escHtml(it.path)}</span>
      </div>
    `).join('');
  }

  function updateSelectedCount() {
    const el = $('namingSelectedCount');
    if (el) el.textContent = `${_selected.size} selecionados`;
  }

  async function applySelected() {
    if (!_scanData || _selected.size === 0) {
      setStatus('Nada selecionado.', false);
      return;
    }
    const renames = Array.from(_selected).map(idx => _scanData.suggestions[idx]).map(s => ({from: s.from, to: s.to}));
    const ok = confirm(`Aplicar ${renames.length} renames?\n\nBackup automatico em tools/saves/asset_rename_backup_<ts>/`);
    if (!ok) return;
    setStatus('🔄 aplicando renames...');
    try {
      const r = await fetch(`${activeProjectUrl()}/apply_renames`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(renames),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setStatus(`✓ ${data.applied} aplicados, ${data.errors.length} erros · backup: ${data.backup_dir}`);
      // Re-scan pra atualizar UI
      setTimeout(runScan, 500);
    } catch (e) {
      setStatus(`✗ apply falhou: ${e.message}`, false);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btnScan = $('btnNamingScan');
    if (btnScan) btnScan.addEventListener('click', runScan);
    const btnApply = $('btnNamingApply');
    if (btnApply) btnApply.addEventListener('click', applySelected);
    const btnSelectAll = $('btnNamingSelectAll');
    if (btnSelectAll) btnSelectAll.addEventListener('click', () => {
      document.querySelectorAll('.sugg-chk').forEach(chk => {
        chk.checked = true;
        _selected.add(parseInt(chk.dataset.idx));
      });
      updateSelectedCount();
    });
    const btnDeselect = $('btnNamingDeselectAll');
    if (btnDeselect) btnDeselect.addEventListener('click', () => {
      document.querySelectorAll('.sugg-chk').forEach(chk => chk.checked = false);
      _selected.clear();
      updateSelectedCount();
    });
    const projSel = $('namingProjectSel');
    if (projSel) projSel.addEventListener('change', runScan);
    // Auto-scan quando user clica na aba
    document.querySelectorAll('.tab[data-tab="naming"]').forEach(b => {
      b.addEventListener('click', () => setTimeout(runScan, 100));
    });
  });

})();
