// PixaPro · tab-map.js — Map presets por projeto
// Save/load/list de map presets via API REST do project server.
// O canvas/controles vem da migracao do tab-tiles (testCanvas, testSeed, etc)
// que continuam sendo usados por renderTestMap() em tab-tiles.js.
//
// Endpoints (ver PROJECT_INTEGRATION.md):
//   GET  /maps?project=<slug>          -> {maps: [...]}
//   GET  /maps/<name>?project=<slug>   -> JSON do preset
//   POST /maps/<name>?project=<slug>   -> salva
//
// Pra adicionar mais projetos: edita pixapro_config.json.linkedProjects e
// recarrega a pagina. O dropdown vai listar automaticamente.

(function(){

  // PROJECT URL: por enquanto chapada-escapade fixo.
  // TODO: ler de /config.js (servido pelo server.py) ou do pixapro_config.json
  const PROJECTS = {
    'chapada-escapade': 'http://localhost:8090',
  };

  function activeProject() {
    const sel = document.getElementById('mapProjectSel');
    return sel ? sel.value : 'chapada-escapade';
  }
  function activeProjectUrl() {
    return PROJECTS[activeProject()] || 'http://localhost:8090';
  }

  function setStatus(msg, ok=true) {
    const el = document.getElementById('mapPresetStatus');
    if (el) {
      el.textContent = msg;
      el.style.color = ok ? '#88aa66' : '#cc6644';
    }
  }

  async function refreshMapList() {
    const proj = activeProject();
    const url = `${activeProjectUrl()}/maps?project=${proj}`;
    const list = document.getElementById('mapPresetsList');
    const count = document.getElementById('mapPresetsCount');
    if (!list) return;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const maps = data.maps || [];
      if (count) count.textContent = `${maps.length}`;
      if (maps.length === 0) {
        list.innerHTML = '<div style="font-size:11px;opacity:.5;text-align:center;padding:10px;">nenhum preset salvo ainda.<br>configure parametros + Save.</div>';
      } else {
        list.innerHTML = maps.map(m => `
          <div style="background:#2a2218;border:1px solid #4a3826;padding:6px 8px;border-radius:3px;display:flex;justify-content:space-between;align-items:center;gap:6px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;color:#f4c95d;font-weight:bold;font-family:monospace;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
              <div style="font-size:10px;opacity:.55;">seed ${m.seed} · ${m.bias}${m.tileStyle ? ' · '+m.tileStyle : ''}</div>
            </div>
            <button class="btn-load-preset" data-name="${m.name}" style="padding:2px 8px;font-size:10px;background:#3a4a8a;color:#fff;border:none;cursor:pointer;">load</button>
          </div>
        `).join('');
        list.querySelectorAll('.btn-load-preset').forEach(b => {
          b.addEventListener('click', () => loadPreset(b.dataset.name));
        });
      }
      setStatus(`✓ ${maps.length} presets · ${proj}`);
    } catch (e) {
      list.innerHTML = '';
      if (count) count.textContent = '0';
      setStatus(`✗ server offline: ${e.message}`, false);
    }
  }

  async function loadPreset(name) {
    const url = `${activeProjectUrl()}/maps/${encodeURIComponent(name)}?project=${activeProject()}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const m = await r.json();
      // Aplica nos controles + re-renderiza
      const $ = (id) => document.getElementById(id);
      if (m.seed != null && $('testSeed')) $('testSeed').value = m.seed;
      if (m.threshold != null && $('testThreshold')) {
        $('testThreshold').value = Math.round(m.threshold * 100);
        if ($('testThresholdVal')) $('testThresholdVal').textContent = Math.round(m.threshold * 100) + '%';
      }
      if (m.bias && $('testBias')) $('testBias').value = m.bias;
      if (m.gridW && m.gridH && $('testSize')) {
        $('testSize').value = `${m.gridW}x${m.gridH}`;
      }
      if ($('mapNewName')) $('mapNewName').value = m.name;
      if (typeof renderTestMap === 'function') renderTestMap();
      setStatus(`✓ loaded "${name}"`);
    } catch (e) {
      setStatus(`✗ load fail: ${e.message}`, false);
    }
  }

  async function savePreset() {
    const $ = (id) => document.getElementById(id);
    const nameInp = $('mapNewName');
    const name = (nameInp?.value || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!name) {
      setStatus('✗ nome do preset eh obrigatorio', false);
      nameInp?.focus();
      return;
    }
    const seed = parseInt($('testSeed')?.value) || 42;
    const threshold = (parseInt($('testThreshold')?.value) || 50) / 100;
    const bias = $('testBias')?.value || 'ca-3';
    const sizeVal = $('testSize')?.value || '32x24';
    let gridW = 32, gridH = 24;
    if (sizeVal.includes('x')) {
      const [w, h] = sizeVal.split('x').map(Number);
      gridW = w; gridH = h;
    }
    // CA passes/value scale derivado do bias (ex: 'ca-5' -> 5 passes)
    let vertCaPasses = 4;
    const m = bias.match(/^ca-(\d+)$/);
    if (m) vertCaPasses = parseInt(m[1]);
    const preset = {
      name,
      seed,
      threshold,
      bias,
      gridW,
      gridH,
      vertThreshold: threshold,
      vertCaPasses,
      // tileStyle: opcional -- se vazio, game usa seu proprio fx.tileStyle
      tileStyle: '',
    };
    const url = `${activeProjectUrl()}/maps/${encodeURIComponent(name)}?project=${activeProject()}`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(preset),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setStatus(`✓ saved "${name}" -> ${data.path}`);
      refreshMapList();
    } catch (e) {
      setStatus(`✗ save fail: ${e.message}`, false);
    }
  }

  // Auto-init quando o usuario abre a aba Map
  document.addEventListener('DOMContentLoaded', () => {
    const projSel = document.getElementById('mapProjectSel');
    if (projSel) projSel.addEventListener('change', refreshMapList);
    const refreshBtn = document.getElementById('btnRefreshProjectMaps');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshMapList);
    const saveBtn = document.getElementById('btnSaveMapPreset');
    if (saveBtn) saveBtn.addEventListener('click', savePreset);
    // Quando user clica na aba Map, re-fetcha lista
    document.querySelectorAll('.tab[data-tab="map"]').forEach(b => {
      b.addEventListener('click', () => setTimeout(refreshMapList, 100));
    });
  });

})();
