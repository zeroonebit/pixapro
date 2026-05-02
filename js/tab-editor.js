// PixaPro · tab-editor.js — Editor tab (visualizer 8-dir + PixelLab tool forms)
// Também provê estado da queue MCP (consumido pelo Detail dashboard).
//
// Globals expostos: detailSelected, mcpQueue, saveQueue, updateQueueBar,
//                   approvedAssets, renderEditorList, renderDetailList,
//                   renderDetailMain, queueTool
//
// Dependências: MANIFEST, decisions, summaryData, assetTags, saveAssetTags,
//               PIXELLAB_TOOLS, $, classify.* (groupByFolder/classifyGroup/...),
//               popup.attachPopupOrient, fetchSummary, Store, Api

let detailSelected = null;
let mcpQueue = Store.loadQueue();

function saveQueue(){ Store.saveQueue(mcpQueue); updateQueueBar(); }

function updateQueueBar(){
  const bar = $("queueBar");
  if(!bar) return;
  bar.hidden = mcpQueue.length === 0;
  $("queueBarText").textContent = `📋 ${mcpQueue.length} ações na fila`;
}

function approvedAssets(){
  const list = [];
  // Do MANIFEST + decisions promote
  MANIFEST.forEach(m => {
    if(decisions[m.id]?.action === 'promote') list.push({id: m.id, name: m.name, path: m.path, target: decisions[m.id].target});
  });
  // Do filesystem (assets já em pastas categorizadas)
  if(summaryData?.filesystem){
    summaryData.filesystem.forEach(a => {
      if(/inbox/.test(a.path)) return;
      const fname = a.path.split(/[\\/]/).pop().replace('.png','');
      const m = MANIFEST.find(x => x.name === fname);
      list.push({id: m?.id || '', name: fname, path: a.path, target: a.path.split(/[\\/]/).slice(-2,-1)[0]});
    });
  }
  // Dedup por path
  const seen = new Set();
  return list.filter(a => { const k = a.path; if(seen.has(k)) return false; seen.add(k); return true; });
}

// renderEditorList é alias de renderDetailList (Editor reusa o mesmo listing)
function renderEditorList(){ return renderDetailList(); }

function renderDetailList(){
  if(!summaryData){
    fetchSummary().then(d => { summaryData = d || {filesystem:[], orphans:[]}; renderDetailList(); });
  }
  const body = $("editorAssetListBody") || $("detailListBody");
  const countEl = $("editorApprovedCount");
  // Bug fix: preservar tagInput value via _savedTagInputVal (global)
  if($("tagInput")) window._savedTagInputVal = $("tagInput").value || '';
  body.innerHTML = '';
  body.className = 'detail-list-grid';
  const list = approvedAssets();
  // Bug fix: estabilizar detailSelected por path (evita ref stale)
  if(detailSelected){
    const fresh = list.find(x => x.path === detailSelected.path);
    if(fresh) detailSelected = fresh;
  }
  if(countEl) countEl.textContent = list.length;
  if(list.length === 0){
    body.innerHTML = '<div style="opacity:.6;font-size:12px;text-align:center;padding:20px;grid-column:1/-1;">Nenhum asset aprovado.<br>Vá pra Manager e promova alguns.</div>';
    return;
  }
  const groups = groupByFolder(list);
  for(const [folder, fitems] of groups){
    const classified = classifyGroup(fitems);
    const parent = groupParent(classified);
    if(fitems.length === 1){
      const a = fitems[0];
      const t = document.createElement('div');
      t.className = 'thumb' + (detailSelected?.path === a.path ? ' active' : '');
      const img = document.createElement('img');
      img.src = a.path;
      t.appendChild(img);
      t.title = a.name;
      t.onclick = () => { detailSelected = a; renderDetailList(); renderDetailMain(); };
      body.appendChild(t);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'thumb-group';
      wrap.style.width = '48px'; wrap.style.height = '48px';
      attachPopupOrient(wrap, () => buildGroupPopupHTML(folder, classified, {clickable:true}), {context: 'detail-' + folder});
      const t = document.createElement('div');
      t.className = 'thumb' + (detailSelected?.path === parent.path ? ' active' : '');
      t.style.borderColor = '#f4c95d';
      const img = document.createElement('img');
      img.src = parent.path;
      t.appendChild(img);
      t.title = `${folder} · click pra selecionar parent (${fitems.length})`;
      t.onclick = () => { detailSelected = {...parent, target: folder.split('/').pop()}; renderDetailList(); renderDetailMain(); };
      const badge = document.createElement('span');
      badge.className = 'group-badge';
      badge.textContent = fitems.length;
      wrap.appendChild(t); wrap.appendChild(badge);
      body.appendChild(wrap);
    }
  }
}

function renderDetailMain(){
  const a = detailSelected;
  if(!a){ return; }
  const titleEl = $("editorTitle") || $("detailTitle");
  const bodyEl  = $("editorBody")  || $("detailBody");
  if(!titleEl || !bodyEl){ return; }
  titleEl.textContent = a.name;
  const catLabels = {create:'🆕 CREATE', modify:'🎨 MODIFY', anim:'🎬 ANIMATE', meta:'📖 META'};
  const defaultCats = ['create','modify','anim','meta'];
  const savedOrder = Store.loadEditorOrder();
  const cats = (savedOrder && Array.isArray(savedOrder))
    ? defaultCats.sort((a,b) => (savedOrder.indexOf(a) === -1 ? 999 : savedOrder.indexOf(a)) - (savedOrder.indexOf(b) === -1 ? 999 : savedOrder.indexOf(b)))
    : defaultCats;

  const dirVariants = findDirectionVariants(a);
  const dirShort = {north:'N','north-east':'NE',east:'E','south-east':'SE',south:'S','south-west':'SW',west:'W','north-west':'NW'};
  const dirSlots = Object.keys(dirVariants).map(d => {
    const path = dirVariants[d];
    const cls = path ? 'exists' : 'missing';
    const inner = path ? `<img src="${path}" alt="${d}">` : `+`;
    return `<div class="dir-slot dir-${dirShort[d]} ${cls}" data-dir="${d}" data-asset-path="${a.path}" title="${d}${path?' (existe)':' (gerar via MCP)'}">${inner}</div>`;
  }).join('');

  // Header (visualizer + meta)
  let html = `
    <div class="preview">
      <div class="visualizer">
        <div class="name-overlay">${a.name}</div>
        <img class="main-sprite" src="${a.path}" alt="${a.name}">
        <div class="dir-overlay">${dirSlots}</div>
      </div>
      <div class="dir-preview" id="dirPreview">
        <div class="preview-label" id="dirPreviewLabel"></div>
        <img id="dirPreviewImg" alt="">
      </div>
      <div class="meta">
        <div>path: ${a.path}</div>
        <div>id: ${a.id||'(unknown)'} · target: ${a.target||'-'}</div>
        <div style="margin-top:8px;display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap;">
          <span style="font-size:12px;color:#a89368;">🔖 TAGS:</span>
          <div id="tagChips" style="display:flex;gap:4px;flex-wrap:wrap;"></div>
          <input id="tagInput" type="text" placeholder="add tag…" style="background:#2a2218;color:#f4c95d;border:1px solid #6b5234;padding:3px 8px;font-size:12px;font-family:monospace;width:100px;">
        </div>
        <div style="margin-top:6px;font-size:12px;opacity:.6;">Hover no frame ↑ pra ver direções. Hover slot com sprite → preview grande abaixo. Click <strong>+</strong> em slots vazios pra gerar via MCP.</div>
      </div>
    </div>`;

  // 4 sections de tools (CREATE/MODIFY/ANIMATE/META)
  let sectionsHtml = '<div class="tool-sections-row">';
  cats.forEach((cat) => {
    const tools = PIXELLAB_TOOLS.filter(t => t.cat === cat);
    if(!tools.length) return;
    sectionsHtml += `<div class="tool-section" data-cat="${cat}" data-collapsed="false" draggable="true">
      <div class="sec-head" onclick="this.parentElement.dataset.collapsed = this.parentElement.dataset.collapsed === 'true' ? 'false' : 'true'; const t = this.querySelector('.toggle'); if(t) t.textContent = this.parentElement.dataset.collapsed === 'true' ? '▶' : '▼';">
        <span class="drag-handle" title="arrasta pra reordenar">⋮⋮</span>
        <span class="toggle">▼</span>
        <span>${catLabels[cat]}</span>
        <span class="count">${tools.length}</span>
      </div>
      <div class="sec-body"><div class="tools-grid">`;
    tools.forEach(t => {
      sectionsHtml += `<div class="tool-card cat-${t.cat}"><div class="tname">${t.label}<br><span style="opacity:.5;font-weight:normal;">mcp__pixellab__${t.name}</span></div>`;
      t.args.forEach(arg => {
        const id = `f-${t.name}-${arg.k}`;
        const auto = arg.autoFromAsset && a.id ? a.id : (arg.def !== undefined ? arg.def : '');
        if(arg.type === 'textarea'){
          sectionsHtml += `<label>${arg.label}${arg.required?' *':''}</label><textarea id="${id}" data-tool="${t.name}" data-key="${arg.k}">${auto}</textarea>`;
        } else if(arg.type === 'select'){
          sectionsHtml += `<label>${arg.label}</label><select id="${id}" data-tool="${t.name}" data-key="${arg.k}">${arg.opts.map(o=>`<option value="${o}"${o===auto?' selected':''}>${o||'(none)'}</option>`).join('')}</select>`;
        } else if(arg.type === 'checkbox'){
          sectionsHtml += `<label><input type="checkbox" id="${id}" data-tool="${t.name}" data-key="${arg.k}"${auto?' checked':''}> ${arg.label}</label>`;
        } else {
          sectionsHtml += `<label>${arg.label}${arg.required?' *':''}</label><input type="${arg.type==='number'?'number':'text'}" id="${id}" data-tool="${t.name}" data-key="${arg.k}" value="${auto}">`;
        }
      });
      sectionsHtml += `<button class="qbtn" data-queue="${t.name}">+ Add to queue</button></div>`;
    });
    sectionsHtml += `</div></div></div>`;
  });
  sectionsHtml += `</div>`;

  // Coloca tool sections em editorToolsRow se existir (Editor tab); senão dentro do bodyEl
  const toolsContainer = $("editorToolsRow");
  if(toolsContainer){ toolsContainer.innerHTML = sectionsHtml; }
  else { html += sectionsHtml; }

  // Drag-drop pra reordenar sections
  setTimeout(() => {
    document.querySelectorAll('.tool-section').forEach(sec => {
      sec.ondragstart = (e) => { e.dataTransfer.setData('text/plain', sec.dataset.cat); e.dataTransfer.effectAllowed = 'move'; sec.classList.add('dragging'); };
      sec.ondragend   = () => sec.classList.remove('dragging');
      sec.ondragover  = (e) => { e.preventDefault(); sec.classList.add('drag-over'); };
      sec.ondragleave = () => sec.classList.remove('drag-over');
      sec.ondrop = (e) => {
        e.preventDefault();
        sec.classList.remove('drag-over');
        const fromCat = e.dataTransfer.getData('text/plain');
        const toCat   = sec.dataset.cat;
        if(!fromCat || fromCat === toCat) return;
        const order = cats.slice();
        const i1 = order.indexOf(fromCat), i2 = order.indexOf(toCat);
        if(i1 < 0 || i2 < 0) return;
        order.splice(i1, 1); order.splice(i2, 0, fromCat);
        Store.saveEditorOrder(order);
        renderDetailMain();
      };
    });
  }, 0);
  bodyEl.innerHTML = html;

  // qbtn handlers
  const containers = [bodyEl, $("editorToolsRow")].filter(Boolean);
  containers.forEach(c => c.querySelectorAll('.qbtn').forEach(b => {
    b.onclick = () => queueTool(b.dataset.queue);
  }));

  // Tag editor wireup
  function rerenderTagChips(){
    const chipsEl = $("tagChips");
    if(!chipsEl) return;
    const tags = assetTags[a.path] || [];
    chipsEl.innerHTML = tags.map(t =>
      `<span style="background:#1d3a4a;color:#9fcfe8;padding:2px 8px;border-radius:10px;font-size:12px;display:inline-flex;align-items:center;gap:4px;">${t}<span style="cursor:pointer;opacity:.6;font-weight:bold;" data-rm-tag="${t}">×</span></span>`
    ).join('');
    chipsEl.querySelectorAll('[data-rm-tag]').forEach(x => x.onclick = () => {
      assetTags[a.path] = (assetTags[a.path] || []).filter(t => t !== x.dataset.rmTag);
      if(assetTags[a.path].length === 0) delete assetTags[a.path];
      saveAssetTags(); rerenderTagChips();
    });
  }
  rerenderTagChips();

  const tagInput = $("tagInput");
  if(tagInput){
    if(window._savedTagInputVal){ tagInput.value = window._savedTagInputVal; window._savedTagInputVal = ''; }
    tagInput.oninput = () => { window._savedTagInputVal = tagInput.value; };
    tagInput.onkeydown = (e) => {
      if(e.key === 'Enter'){
        const v = tagInput.value.trim().toLowerCase();
        if(!v) return;
        assetTags[a.path] = [...(assetTags[a.path] || [])];
        if(!assetTags[a.path].includes(v)) assetTags[a.path].push(v);
        saveAssetTags(); rerenderTagChips();
        tagInput.value = '';
      }
    };
  }

  // Hover nos dir-slots existentes → preview grande abaixo
  bodyEl.querySelectorAll('.dir-slot.exists').forEach(slot => {
    slot.onmouseenter = () => {
      const img = slot.querySelector('img');
      if(!img) return;
      const preview = $("dirPreview");
      const previewImg = $("dirPreviewImg");
      const previewLabel = $("dirPreviewLabel");
      if(preview && previewImg){
        previewImg.src = img.src;
        if(previewLabel) previewLabel.textContent = slot.dataset.dir;
        preview.classList.add('show');
      }
    };
    slot.onmouseleave = () => {
      const preview = $("dirPreview");
      if(preview) preview.classList.remove('show');
    };
  });

  // Click nos dir-slots: missing → queue gen, existing → seleciona
  bodyEl.querySelectorAll('.dir-slot').forEach(slot => {
    slot.onclick = () => {
      const dir = slot.dataset.dir;
      const basePath = slot.dataset.assetPath;
      if(slot.classList.contains('exists')){
        const newPath = slot.querySelector('img').src;
        const all = approvedAssets();
        const it = all.find(x => x.path === newPath || newPath.endsWith(x.path.replace(/^\.\.\//,'')));
        if(it){ detailSelected = it; renderDetailList(); renderDetailMain(); }
      } else {
        mcpQueue.push({
          tool: 'pixellab_generate_direction',
          args: { base_asset_path: basePath, direction: dir, reference: 'use base_asset for visual consistency' },
          asset: { path: basePath },
          ts: Date.now()
        });
        saveQueue();
        slot.classList.remove('missing');
        slot.classList.add('queued');
        slot.textContent = '⏳';
        slot.title = `${dir} enfileirado pra geração`;
      }
    };
  });
}

function queueTool(toolName){
  const tool = PIXELLAB_TOOLS.find(t => t.name === toolName);
  if(!tool) return;
  const args = {};
  tool.args.forEach(arg => {
    const el = document.querySelector(`[data-tool="${toolName}"][data-key="${arg.k}"]`);
    if(!el) return;
    let val;
    if(arg.type === 'checkbox') val = el.checked;
    else if(arg.type === 'number') val = el.value === '' ? null : Number(el.value);
    else val = el.value;
    if(val !== null && val !== '') args[arg.k] = val;
  });
  mcpQueue.push({
    tool: 'mcp__pixellab__' + toolName,
    args,
    asset: detailSelected ? {name: detailSelected.name, path: detailSelected.path, id: detailSelected.id} : null,
    ts: Date.now()
  });
  saveQueue();
  Api.saveMcpQueue(mcpQueue);
}

// === Wire queue bar buttons ===
$("btnQueueShow")?.addEventListener('click', () => {
  alert(JSON.stringify(mcpQueue, null, 2));
});
$("btnQueueClear")?.addEventListener('click', () => {
  if(!confirm('Limpar fila MCP?')) return;
  mcpQueue = [];
  saveQueue();
  Api.saveMcpQueue([]);
});

updateQueueBar();

// === Click handler do popup → seleciona asset no Detail (move pra cá da gallery) ===
document.getElementById('floatingPopup')?.addEventListener('click', (e) => {
  const tgt = e.target.closest('img[data-click]');
  if(!tgt) return;
  const popup = document.getElementById('floatingPopup');
  if(!popup.dataset.context?.startsWith('detail-')) return;
  const path = tgt.dataset.path;
  const folder = popup.dataset.context.replace(/^detail-/,'');
  const all = approvedAssets();
  const it = all.find(x => x.path === path);
  if(it){
    detailSelected = {...it, target: folder.split('/').pop()};
    renderDetailList(); renderDetailMain();
    hideFloatingPopup();
  }
});
