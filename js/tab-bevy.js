// PixaPro · tab-bevy.js — editor de scatter do Bevy edition (Chapada 3D)
//
// Fala com tools/editor_server.py do repo Bevy (porta 8091, editável no
// input). O manifest (assets/manifest/scatter.json) decide O QUE spawna
// e QUANTO; as REGRAS de placement (pedra em dirt, planta em grama,
// margens...) vivem no código Rust — a CATEGORIA do entry é a regra.
//
// O jogo tem watcher de mtime (scenery.rs): SAVE aqui → re-scatter
// in-game em ~2s, sem recompilar. Backup automático de cada save em
// tools/saves/manifest_backups/ (server-side).
//
// Órfãos: PNGs em assets/textures/env/** que não estão no manifest —
// dá pra adicionar em qualquer categoria (o loading.rs do jogo escaneia
// a pasta inteira, então órfão novo funciona sem recompilar).

(function(){

  const LS_KEY = 'pixapro_bevy_url';
  const CATS = [
    { key: 'rocks',         label: '🪨 Rocks',         rule: 'só DIRT (miolo) · longe de quintais/gramados · perigo de colisão' },
    { key: 'vegetation',    label: '🌵 Vegetation',    rule: 'só GRASS (miolo) · em moitas 1-3 · pode entrar em gramado' },
    { key: 'landmarks',     label: '⛪ Landmarks',     rule: 'GRASS/DIRT · 140u entre si · nada de praia/quintal/gramado' },
    { key: 'extras',        label: '🛢️ Extras',        rule: 'qualquer terra · fora de gramado/quintal' },
    { key: 'ground_decals', label: '🟤 Ground decals', rule: 'só GRASS · decal DEITADO no chão (não billboard)' },
  ];

  let manifest = null;   // objeto editável (POST no save)
  let spriteMap = {};    // stem -> relpath (thumbs + órfãos)
  let dirty = false;

  const $ = id => document.getElementById(id);
  const serverUrl = () => ($('bevyServerUrl')?.value || 'http://localhost:8091').replace(/\/+$/, '');

  function setStatus(msg, ok=true){
    const el = $('bevyStatus');
    if (el){ el.textContent = msg; el.style.color = ok ? '#88aa66' : '#cc6644'; }
  }
  function markDirty(){
    dirty = true;
    const btn = $('btnBevySave');
    if (btn) btn.textContent = '💾 SAVE → jogo ●';
  }
  function clearDirty(){
    dirty = false;
    const btn = $('btnBevySave');
    if (btn) btn.textContent = '💾 SAVE → jogo';
  }

  async function refreshBevy(){
    const url = serverUrl();
    localStorage.setItem(LS_KEY, url);
    setStatus('carregando…');
    try {
      const [mRes, sRes] = await Promise.all([
        fetch(`${url}/manifest`),
        fetch(`${url}/sprite_map`),
      ]);
      if (!mRes.ok){
        const err = await mRes.json().catch(() => ({}));
        setStatus(`✗ manifest: ${err.error || mRes.status} — roda o JOGO 1x pra bootstrapar`, false);
        return;
      }
      manifest = await mRes.json();
      spriteMap = sRes.ok ? (await sRes.json()).sprites || {} : {};
      clearDirty();
      render();
      const total = CATS.reduce((n,c) => n + (manifest[c.key]?.length || 0), 0);
      setStatus(`✓ manifest carregado — ${total} entries · ${Object.keys(spriteMap).length} PNGs no disco`);
    } catch(e){
      setStatus(`✗ server 8091 offline (${e.message}) — roda \`python tools/editor_server.py\` na raiz do repo Bevy`, false);
      $('bevyContent').innerHTML = '';
    }
  }

  async function saveBevy(){
    if (!manifest){ setStatus('nada carregado ainda — ↻ Reload primeiro', false); return; }
    const url = serverUrl();
    setStatus('salvando…');
    try {
      const res = await fetch(`${url}/manifest`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(manifest),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok){ setStatus(`✗ save recusado: ${data.error || res.status}`, false); return; }
      clearDirty();
      setStatus(`✓ salvo${data.backup ? ` (backup: ${data.backup})` : ''} — o jogo re-scattera em ~2s 🎮`);
    } catch(e){
      setStatus(`✗ save falhou: ${e.message}`, false);
    }
  }

  // thumb: acha o path pelo stem; fallback = quadrado vazio
  function thumbHtml(sprite){
    const rel = spriteMap[sprite];
    if (!rel) return `<div style="width:44px;height:44px;background:#2a2218;border:1px dashed #6b5234;display:flex;align-items:center;justify-content:center;font-size:9px;color:#cc6644;" title="PNG não achado em assets/textures/">?</div>`;
    return `<img src="${serverUrl()}/${rel}" style="width:44px;height:44px;object-fit:contain;background:#2a2218;border:1px solid #4a3826;image-rendering:pixelated;" title="${rel}">`;
  }

  function render(){
    const box = $('bevyContent');
    if (!box || !manifest) return;
    let html = '';

    for (const cat of CATS){
      const entries = manifest[cat.key] || [];
      const on = entries.filter(e => e.enabled !== false).length;
      html += `
        <div style="background:#1a1408;border:1px solid #4a3826;border-radius:4px;padding:10px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
            <h4 style="margin:0;font-size:13px;color:#f4c95d;">${cat.label} <span style="opacity:.5;font-weight:normal;">${on}/${entries.length} on</span></h4>
            <span style="font-size:10px;opacity:.5;">${cat.rule}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">`;
      entries.forEach((e, i) => {
        const off = e.enabled === false;
        html += `
          <div style="display:flex;align-items:center;gap:8px;padding:3px 6px;background:${off ? '#151005' : '#231a0e'};border:1px solid ${off ? '#3a2e1c' : '#4a3826'};border-radius:3px;${off ? 'opacity:.55;' : ''}">
            <input type="checkbox" ${off ? '' : 'checked'} data-bevy-toggle="${cat.key}:${i}" title="enabled" style="cursor:pointer;">
            ${thumbHtml(e.sprite)}
            <span style="flex:1;font-family:monospace;font-size:12px;color:#f4c95d;${off ? 'text-decoration:line-through;' : ''}">${e.sprite}</span>
            <label style="font-size:10px;color:#a89368;">size</label>
            <input type="number" step="0.1" min="0.1" value="${e.size}" data-bevy-size="${cat.key}:${i}" style="width:58px;background:#2a2218;color:#f4c95d;border:1px solid #6b5234;padding:2px 5px;font-family:monospace;font-size:11px;">
            <label style="font-size:10px;color:#a89368;">count</label>
            <input type="number" step="1" min="0" value="${e.count ?? 1}" data-bevy-count="${cat.key}:${i}" style="width:52px;background:#2a2218;color:#f4c95d;border:1px solid #6b5234;padding:2px 5px;font-family:monospace;font-size:11px;">
            <button data-bevy-remove="${cat.key}:${i}" title="tira do manifest (o PNG fica no disco → vira órfão)" style="padding:2px 8px;font-size:11px;background:#5a2a1a;color:#e8a;border:1px solid #7a3a2a;">✕</button>
          </div>`;
      });
      html += `</div></div>`;
    }

    // ── Órfãos: PNGs de env/** fora do manifest ──
    const used = new Set(CATS.flatMap(c => (manifest[c.key] || []).map(e => e.sprite)));
    const orphans = Object.entries(spriteMap)
      .filter(([stem, rel]) => rel.includes('textures/env/') && !used.has(stem))
      .sort((a,b) => a[0].localeCompare(b[0]));
    html += `
      <div style="background:#141a0e;border:1px solid #3c4a26;border-radius:4px;padding:10px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <h4 style="margin:0;font-size:13px;color:#aad477;">🌱 Órfãos em assets/textures/env/ <span style="opacity:.5;font-weight:normal;">${orphans.length}</span></h4>
          <span style="font-size:10px;opacity:.5;">PNG no disco, fora do manifest — adiciona numa categoria e SAVE (sem recompilar)</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">`;
    if (!orphans.length) html += `<div style="font-size:11px;opacity:.5;">nenhum — tudo que tá no disco tá wireado</div>`;
    orphans.forEach(([stem]) => {
      html += `
        <div style="display:flex;align-items:center;gap:8px;padding:3px 6px;background:#1c2213;border:1px solid #3c4a26;border-radius:3px;">
          ${thumbHtml(stem)}
          <span style="flex:1;font-family:monospace;font-size:12px;color:#cde39f;">${stem}</span>
          <select data-bevy-orphan-cat="${stem}" style="background:#2a2218;color:#f4c95d;border:1px solid #6b5234;padding:2px 5px;font-size:11px;">
            ${CATS.map(c => `<option value="${c.key}">${c.key}</option>`).join('')}
          </select>
          <button data-bevy-orphan-add="${stem}" style="padding:2px 10px;font-size:11px;background:#3c6a2c;color:#dfd;border:1px solid #4c7a3c;">＋ add</button>
        </div>`;
    });
    html += `</div></div>`;

    box.innerHTML = html;
    wireHandlers(box);
  }

  function wireHandlers(box){
    const at = (spec) => {
      const [cat, i] = spec.split(':');
      return manifest[cat][parseInt(i, 10)];
    };
    box.querySelectorAll('[data-bevy-toggle]').forEach(el => el.onchange = () => {
      at(el.dataset.bevyToggle).enabled = el.checked; markDirty(); render();
    });
    box.querySelectorAll('[data-bevy-size]').forEach(el => el.onchange = () => {
      const v = parseFloat(el.value);
      if (v > 0){ at(el.dataset.bevySize).size = v; markDirty(); }
    });
    box.querySelectorAll('[data-bevy-count]').forEach(el => el.onchange = () => {
      const v = parseInt(el.value, 10);
      if (v >= 0){ at(el.dataset.bevyCount).count = v; markDirty(); }
    });
    box.querySelectorAll('[data-bevy-remove]').forEach(el => el.onclick = () => {
      const [cat, i] = el.dataset.bevyRemove.split(':');
      manifest[cat].splice(parseInt(i, 10), 1); markDirty(); render();
    });
    box.querySelectorAll('[data-bevy-orphan-add]').forEach(el => el.onclick = () => {
      const stem = el.dataset.bevyOrphanAdd;
      const sel = box.querySelector(`[data-bevy-orphan-cat="${stem}"]`);
      const cat = sel ? sel.value : 'extras';
      // defaults razoáveis por categoria (o user ajusta depois)
      const size = { rocks: 4.0, vegetation: 3.0, landmarks: 10.0, extras: 2.5, ground_decals: 6.0 }[cat] || 3.0;
      const count = { landmarks: 1 }[cat] || 10;
      manifest[cat].push({ sprite: stem, size, count, enabled: true });
      markDirty(); render();
    });
  }

  // ── Painel LIVE (Fase 3): runtime_state.json escrito pelo JOGO a
  // cada 5s → polling 4s aqui (pattern do MCP Live dashboard).
  // Idade > 15s = jogo parado/fechado.
  let _liveTimer = null;
  async function pollLive(){
    const box = $('bevyLive');
    if (!box) return;
    let snap = null;
    try {
      const r = await fetch(`${serverUrl()}/tools/saves/runtime_state.json?t=${Date.now()}`, {signal: AbortSignal.timeout(2500)});
      if (r.ok) snap = await r.json();
    } catch(e) {}
    if (!snap){
      box.innerHTML = `<div style="background:#141a0e;border:1px dashed #3c4a26;border-radius:4px;padding:8px;font-size:11px;opacity:.6;">📡 live: sem runtime_state.json — roda o JOGO (cargo run) que ele escreve a cada 5s</div>`;
      return;
    }
    const age = Math.max(0, Math.floor(Date.now()/1000 - snap.ts));
    const alive = age < 15;
    const dot = alive ? '🟢' : '⚫';
    const chips = Object.entries(snap.counts || {})
      .map(([k,v]) => `<span style="background:#2a2218;border:1px solid #4a3826;border-radius:10px;padding:1px 8px;font-size:10px;">${k} <b style="color:#f4c95d;">${v}</b></span>`)
      .join(' ');
    const scenery = Object.entries(snap.scenery || {}).sort((a,b) => b[1]-a[1]);
    const maxN = scenery.length ? scenery[0][1] : 1;
    const bars = scenery.map(([s,n]) => `
      <div style="display:flex;align-items:center;gap:6px;font-size:10px;font-family:monospace;">
        <span style="width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s}</span>
        <div style="flex:1;background:#1a1408;border-radius:2px;height:8px;"><div style="width:${Math.round(n/maxN*100)}%;background:#6a8a4c;height:8px;border-radius:2px;"></div></div>
        <span style="width:26px;text-align:right;color:#f4c95d;">${n}</span>
      </div>`).join('');
    const missing = (snap.missing || []).length
      ? `<div style="margin-top:6px;font-size:10px;color:#e88;">⚠ sem PNG: ${snap.missing.join(', ')}</div>` : '';
    box.innerHTML = `
      <div style="background:#141a0e;border:1px solid #3c4a26;border-radius:4px;padding:10px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
          <h4 style="margin:0;font-size:13px;color:#aad477;">📡 LIVE ${dot} <span style="font-weight:normal;opacity:.7;">${snap.state} · ${Math.round(snap.fps)} fps · há ${age}s</span></h4>
          <div>${chips}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;max-height:170px;overflow-y:auto;">${bars || '<span style="font-size:10px;opacity:.5;">sem scatter (splash?)</span>'}</div>
        ${missing}
      </div>`;
  }
  function startLive(){ if (!_liveTimer){ pollLive(); _liveTimer = setInterval(pollLive, 4000); } }
  function stopLive(){ if (_liveTimer){ clearInterval(_liveTimer); _liveTimer = null; } }

  // ── Hover-zoom: thumb 44px → preview flutuante 220px (AR real) ──
  function setupHoverZoom(){
    const zoom = document.createElement('div');
    zoom.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;display:none;background:#1a1408;border:2px solid #6b5234;padding:6px;border-radius:4px;box-shadow:0 4px 18px rgba(0,0,0,.6);';
    const zimg = document.createElement('img');
    zimg.style.cssText = 'max-width:220px;max-height:220px;object-fit:contain;image-rendering:pixelated;display:block;';
    const zlabel = document.createElement('div');
    zlabel.style.cssText = 'font-family:monospace;font-size:10px;color:#f4c95d;text-align:center;margin-top:4px;max-width:220px;overflow:hidden;text-overflow:ellipsis;';
    zoom.appendChild(zimg); zoom.appendChild(zlabel);
    document.body.appendChild(zoom);

    const box = $('bevyContent');
    if (!box) return;
    box.addEventListener('mouseover', e => {
      const img = e.target.closest('img');
      if (!img || !box.contains(img)) return;
      zimg.src = img.src;
      zlabel.textContent = img.title || img.src.split('/').pop();
      zoom.style.display = 'block';
    });
    box.addEventListener('mousemove', e => {
      if (zoom.style.display === 'none') return;
      const pad = 18;
      let x = e.clientX + pad, y = e.clientY + pad;
      const r = zoom.getBoundingClientRect();
      if (x + r.width > innerWidth) x = e.clientX - r.width - pad;
      if (y + r.height > innerHeight) y = e.clientY - r.height - pad;
      zoom.style.left = x + 'px';
      zoom.style.top = y + 'px';
    });
    box.addEventListener('mouseout', e => {
      if (e.target.closest('img')) zoom.style.display = 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupHoverZoom();
    const urlInput = $('bevyServerUrl');
    if (urlInput) urlInput.value = localStorage.getItem(LS_KEY) || 'http://localhost:8091';
    $('btnBevyRefresh')?.addEventListener('click', refreshBevy);
    $('btnBevySave')?.addEventListener('click', saveBevy);
    // 1º clique na aba carrega; cliques seguintes NÃO recarregam se tem
    // edição pendente (não perder o trabalho do user). Live poll só
    // roda com a aba aberta (para nos outros tabs)
    document.querySelectorAll('.tab').forEach(b => {
      b.addEventListener('click', () => setTimeout(() => {
        if (b.dataset.tab === 'bevy'){
          if (!manifest || !dirty) refreshBevy();
          startLive();
        } else {
          stopLive();
        }
      }, 100));
    });
  });

})();
