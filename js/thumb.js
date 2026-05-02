// PixaPro · thumb.js — rendering de thumbs e summary grid
// Depende de: utils ($, getAssetType, TYPE_ICONS), classify (groupBy, classify*,
// buildGroupPopupHTML), popup (attachPopupOrient).
// Acessa globals: idx, decisions, MANIFEST, assetTags, API_URL, collectAssetTags

// Mini helper pra reduzir repetição do <div.thumb><img></div>
function _simpleThumb(path, title, size=42){
  const t = document.createElement('div');
  t.className = 'thumb';
  t.style.width = size+'px'; t.style.height = size+'px';
  const img = document.createElement('img');
  img.src = path;
  t.appendChild(img);
  t.title = title;
  return t;
}

// Badge sobre thumb com decisão (✓/✗/✎ no canto)
function thumbBadge(assetId){
  const dec = decisions[assetId];
  if(!dec) return '';
  const colors = {promote:'#1d4a1d',discard:'#4a1d1d',rename:'#1d3a4a'};
  const icons  = {promote:'✓',discard:'✗',rename:'✎'};
  return `<span class="thumb-decision" style="background:${colors[dec.action]};color:#fff;">${icons[dec.action]}</span>`;
}

// Thumb de MANIFEST entry (Manager tab) — destaca active e pending
function makeThumb(m, i){
  const t = document.createElement("div");
  t.className = "thumb" + (i===idx?" active":"") + (m.status==="pending"?" pending":"");
  if(m.status === "ready"){
    const img = document.createElement("img");
    img.src = m.path || API_URL(m.id);
    t.appendChild(img);
  } else {
    t.textContent = "…";
  }
  t.title = m.name;
  return t;
}

// Renderiza summary grid (Gallery tab) com 4 modos: folders | files | type | tags
function fillSumGrid(id, items, mode='folders'){
  const el = $(id);
  el.innerHTML = '';

  // ── modo files: lista flat (até 600) ──
  if(mode === 'files'){
    items.slice(0, 600).forEach(it => {
      el.appendChild(_simpleThumb(it.path, it.path.split('/').pop()));
    });
    return;
  }

  // ── modo type: agrupa por getAssetType() ──
  if(mode === 'type'){
    const byType = {};
    items.forEach(it => { const t = getAssetType(it.path); (byType[t] = byType[t] || []).push(it); });
    const sorted = Object.entries(byType).sort((a,b) => b[1].length - a[1].length);
    sorted.forEach(([type, list]) => {
      const sec = document.createElement('div');
      sec.style.cssText = 'grid-column:1/-1;margin:6px 0 4px;';
      sec.innerHTML = `<div style="font-size:12px;color:#a89368;letter-spacing:2px;margin-bottom:4px;">${TYPE_ICONS[type]||'•'} ${type.toUpperCase()} <span style="opacity:.5;font-size:12px;">${list.length}</span></div>`;
      const sub = document.createElement('div');
      sub.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,42px);gap:3px;justify-content:start;';
      list.slice(0, 100).forEach(it => sub.appendChild(_simpleThumb(it.path, it.path.split('/').pop())));
      sec.appendChild(sub);
      el.appendChild(sec);
    });
    return;
  }

  // ── modo tags: agrupa por tag (assetTags global) ──
  if(mode === 'tags'){
    const tagsByName = {};
    items.forEach(it => {
      const tags = assetTags[it.path] || [];
      if(tags.length === 0){ (tagsByName['(untagged)'] = tagsByName['(untagged)'] || []).push(it); return; }
      tags.forEach(t => { (tagsByName[t] = tagsByName[t] || []).push(it); });
    });
    const sorted = Object.entries(tagsByName).sort((a,b) => b[1].length - a[1].length);
    if(sorted.length === 1 && sorted[0][0] === '(untagged)'){
      el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;opacity:.6;font-size:12px;">Nenhum asset taggeado ainda.<br>Vá no Editor → asset selecionado → adicione tags.</div>';
      return;
    }
    sorted.forEach(([tag, list]) => {
      const sec = document.createElement('div');
      sec.style.cssText = 'grid-column:1/-1;margin:6px 0 4px;';
      const isUntagged = tag === '(untagged)';
      sec.innerHTML = `<div style="font-size:12px;color:${isUntagged?'#666':'#9fcfe8'};letter-spacing:2px;margin-bottom:4px;">🔖 ${tag} <span style="opacity:.5;font-size:12px;">${list.length}</span></div>`;
      const sub = document.createElement('div');
      sub.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,42px);gap:3px;justify-content:start;';
      list.slice(0, 100).forEach(it => sub.appendChild(_simpleThumb(it.path, it.path.split('/').pop())));
      sec.appendChild(sub);
      el.appendChild(sec);
    });
    return;
  }

  // ── modo folders (default): agrupa por groupKeyForPath, popup com classify ──
  const groups = groupByFolder(items);
  let count = 0;
  for(const [folder, fitems] of groups){
    if(count >= 200) break;
    const classified = classifyGroup(fitems);
    const parent = groupParent(classified);
    if(fitems.length === 1){
      const it = fitems[0];
      el.appendChild(_simpleThumb(it.path, it.name));
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'thumb-group';
      wrap.style.width = '42px'; wrap.style.height = '42px';
      attachPopupOrient(wrap, () => buildGroupPopupHTML(folder, classified));
      const t = document.createElement('div');
      t.className = 'thumb';
      t.style.width = '42px'; t.style.height = '42px';
      t.style.borderColor = '#f4c95d';
      const img = document.createElement('img');
      img.src = parent.path;
      t.appendChild(img);
      t.title = `${folder} (${fitems.length} files)`;
      const badge = document.createElement('span');
      badge.className = 'group-badge';
      badge.textContent = fitems.length;
      wrap.appendChild(t); wrap.appendChild(badge);
      el.appendChild(wrap);
    }
    count++;
  }
}
