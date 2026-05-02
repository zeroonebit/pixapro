// PixaPro · tab-naming.js — Asset naming convention audit
// Consome endpoints do project_server:
//   GET  /scan_assets   -> lista classificada + sugestoes
//   POST /apply_renames -> aplica batch (com backup)
//
// Doc: PROJECT_INTEGRATION.md + ASSET_NAMING_STANDARD.md

(function(){

  const PROJECTS = {
    'chapada-escapade': {
      server: 'http://localhost:8090',
      pages:  'https://zeroonebit.github.io/chapada-escapade',
    },
  };

  let _scanData = null;       // ultimo scan completo (cache em memoria)
  let _selected = new Set();  // suggestions selecionadas pra apply
  let _readOnly = false;      // true se source = Pages (sem write)

  function activeProject() {
    const sel = document.getElementById('namingProjectSel');
    return sel ? sel.value : 'chapada-escapade';
  }
  function activeProjectCfg() {
    return PROJECTS[activeProject()] || PROJECTS['chapada-escapade'];
  }
  async function fetchWithFallback(serverPath, pagesPath) {
    const cfg = activeProjectCfg();
    try {
      const r = await fetch(cfg.server + serverPath, {signal: AbortSignal.timeout(2000)});
      if (r.ok) return {data: await r.json(), source: 'server'};
    } catch {}
    if (pagesPath) {
      try {
        const r = await fetch(cfg.pages + pagesPath);
        if (r.ok) return {data: await r.json(), source: 'pages'};
      } catch {}
    }
    return null;
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
    const result = await fetchWithFallback('/scan_assets', '/data/_assets_index.json');
    if (!result) {
      setStatus(`✗ scan falhou: nem server (8090) nem Pages respondem`, false);
      return;
    }
    _scanData = result.data;
    _readOnly = (result.source === 'pages');
    _selected.clear();
    renderStats();
    renderByCategory();
    renderSuggestions();
    renderUnclassified();
    const srcLabel = result.source === 'server' ? '(local · read+write)' : '(Pages · read-only)';
    setStatus(`✓ scan completo: ${_scanData.total} assets, ${_scanData.suggestions.length} renames sugeridos · ${srcLabel}`);
    // Disable Apply button se for read-only
    const applyBtn = document.getElementById('btnNamingApply');
    if (applyBtn) {
      applyBtn.disabled = _readOnly;
      applyBtn.title = _readOnly ? 'Apply requer project_server.py local rodando' : '';
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

  async function checkRefs() {
    if (!_scanData || _selected.size === 0) {
      setStatus('Marca pelo menos um rename pra checar refs.', false);
      return;
    }
    if (_readOnly) {
      setStatus('Check refs requer project_server.py local rodando.', false);
      return;
    }
    const paths = Array.from(_selected).map(idx => _scanData.suggestions[idx].from);
    setStatus(`🔄 checando refs em ${paths.length} paths...`);
    try {
      const r = await fetch(`${activeProjectCfg().server}/check_refs`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({paths}),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      renderRefsPanel(data);
      setStatus(`✓ ${data.paths_with_refs}/${data.paths_checked} paths tem refs · ${data.files_count} js files affected`);
    } catch (e) {
      setStatus(`✗ check_refs falhou: ${e.message}`, false);
    }
  }

  function renderRefsPanel(data) {
    const panel = $('namingRefsPanel');
    const content = $('namingRefsContent');
    if (!panel || !content) return;
    panel.style.display = 'block';
    if (data.files_count === 0) {
      content.innerHTML = '<div style="opacity:.6;text-align:center;padding:20px;color:#88cc66;">✓ Nenhum js file referencia esses paths -- safe to apply!</div>';
      return;
    }
    // Agrupa por arquivo
    const byFile = {};
    for (const [path, hits] of Object.entries(data.details)) {
      for (const h of hits) {
        if (!byFile[h.file]) byFile[h.file] = [];
        byFile[h.file].push({path, ...h});
      }
    }
    const files = Object.keys(byFile).sort();
    content.innerHTML = `
      <div style="margin-bottom:10px;color:#cc8866;">
        ⚠ ${files.length} js files referenciam ${data.paths_with_refs} paths a serem renomeados.
        <strong>Apply renames vai quebrar esses refs ate atualizar.</strong>
      </div>
    ` + files.map(f => `
      <details style="margin-bottom:6px;background:#2a2218;border:1px solid #4a3826;border-radius:3px;">
        <summary style="padding:6px 8px;cursor:pointer;color:#f4c95d;font-weight:bold;">
          ${escHtml(f)} <span style="opacity:.6;font-weight:normal;">(${byFile[f].length} refs)</span>
        </summary>
        <div style="padding:6px 8px;border-top:1px solid #4a3826;">
          ${byFile[f].map(h => `
            <div style="padding:3px 0;border-bottom:1px dotted #3a3018;">
              <div style="display:flex;gap:8px;align-items:baseline;">
                <span style="color:#88aacc;min-width:50px;">L${h.line}</span>
                <span style="color:${h.kind === 'literal' ? '#cc8866' : '#aa88cc'};font-size:10px;">[${h.kind}]</span>
                <span style="color:#cc8866;font-size:10px;overflow:hidden;text-overflow:ellipsis;">${escHtml(h.path)}</span>
              </div>
              <div style="margin-left:60px;color:#aaa;font-size:10px;margin-top:2px;">${escHtml(h.snippet)}</div>
            </div>
          `).join('')}
        </div>
      </details>
    `).join('');
  }

  async function applySelected() {
    if (!_scanData || _selected.size === 0) {
      setStatus('Nada selecionado.', false);
      return;
    }
    const renames = Array.from(_selected).map(idx => _scanData.suggestions[idx]).map(s => ({from: s.from, to: s.to}));
    // Auto-check refs antes pra avisar se vai quebrar js
    let warning = '';
    try {
      const r = await fetch(`${activeProjectCfg().server}/check_refs`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({paths: renames.map(x => x.from)}),
      });
      if (r.ok) {
        const refs = await r.json();
        if (refs.files_count > 0) {
          warning = `\n\n⚠ AVISO: ${refs.files_count} js files referenciam esses paths:\n` +
                    refs.files_affected.slice(0, 5).join('\n') +
                    (refs.files_affected.length > 5 ? `\n... +${refs.files_affected.length - 5} more` : '') +
                    '\n\nApplicar VAI QUEBRAR esses refs ate voce updateá-los manualmente.\n' +
                    'Recomendado: cancela aqui, atualiza os js primeiro, depois apply.';
        }
      }
    } catch {}
    const ok = confirm(`Aplicar ${renames.length} renames?${warning}\n\nBackup automatico em tools/saves/asset_rename_backup_<ts>/`);
    if (!ok) return;
    setStatus('🔄 aplicando renames...');
    try {
      const r = await fetch(`${activeProjectCfg().server}/apply_renames`, {
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
    const btnCheckRefs = $('btnNamingCheckRefs');
    if (btnCheckRefs) btnCheckRefs.addEventListener('click', checkRefs);
    const btnCloseRefs = $('btnNamingCloseRefs');
    if (btnCloseRefs) btnCloseRefs.addEventListener('click', () => {
      const panel = $('namingRefsPanel');
      if (panel) panel.style.display = 'none';
    });
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
