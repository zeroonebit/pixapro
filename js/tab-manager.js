// PixaPro · tab-manager.js — Manager tab (curadoria one-by-one)
// Gerencia decisões promote/discard/rename com keyboard shortcuts.
//
// Globals expostos (script-globally):
//   idx, refreshTimer, decisions, saveDecisions, render
//
// Dependências: MANIFEST (constants.js), $/makeThumb/thumbBadge/suggestTargetFolder (utils+thumb),
//               Store/Api (store.js+api.js), activeTab (inline)

let idx = 0;
let refreshTimer = 8;

// Decisões: { [assetId]: { action: 'promote'|'discard'|'rename', target?, newName?, name, path } }
let decisions = Store.loadDecisions();
const saveDecisions = () => Store.saveDecisions(decisions);

function _updateStats(){
  let p=0, d=0, r=0, w=0;
  MANIFEST.forEach(a => {
    const dec = decisions[a.id];
    if(!dec) { w++; return; }
    if(dec.action==='promote') p++;
    else if(dec.action==='discard') d++;
    else if(dec.action==='rename') r++;
  });
  $("stats").textContent = `✅ ${p} promoted · ❌ ${d} discarded · ✏️ ${r} renamed · ⏳ ${w} pending`;
}

function _renderBadge(assetId, el){
  const dec = decisions[assetId];
  if(!dec){ el.style.display='none'; return; }
  el.style.display='block';
  if(dec.action==='promote'){ el.textContent='✅ '+dec.target; el.className='decision promoted'; }
  else if(dec.action==='discard'){ el.textContent='❌ DISCARD'; el.className='decision discarded'; }
  else if(dec.action==='rename'){ el.textContent='✏️ →'+dec.newName; el.className='decision renamed'; }
}

function _pendingIndices(){
  const out = [];
  MANIFEST.forEach((m,i) => { if(!decisions[m.id] || decisions[m.id].action === 'rename') out.push(i); });
  return out;
}

function _nextPendingIdx(from, dir){
  const pend = _pendingIndices();
  if(pend.length === 0) return from;
  const futureSorted = pend.slice().sort((a,b) => {
    const da = ((a - from) * dir + MANIFEST.length) % MANIFEST.length || MANIFEST.length;
    const db = ((b - from) * dir + MANIFEST.length) % MANIFEST.length || MANIFEST.length;
    return da - db;
  });
  return futureSorted[0];
}

function _renderSide(targetId, action, label){
  const el = $(targetId);
  el.innerHTML = "";
  const items = MANIFEST.map((m,i)=>({m,i})).filter(x => decisions[x.m.id]?.action === action);
  const title = document.createElement('div');
  title.className = 'side-title';
  title.textContent = label.replace('(N)', `(${items.length})`);
  el.appendChild(title);
  items.forEach(({m,i}) => {
    const t = makeThumb(m, i);
    t.onclick = () => {
      delete decisions[m.id];
      saveDecisions();
      idx = i;
      render();
    };
    t.title = m.name + ' — click pra restaurar';
    el.appendChild(t);
  });
}

function render(){
  const a = MANIFEST[idx];
  if(!a){return;}
  $("name").textContent = a.name;
  $("id").textContent = a.id;

  if(a.status === "ready"){
    $("img").src = a.path || API_URL(a.id);
    $("img").style.display = "block";
    $("pending").style.display = "none";
  } else {
    $("img").src = API_URL(a.id) + "?t=" + Date.now();
    $("img").style.display = "block";
    $("pending").style.display = "block";
    $("img").onerror = ()=>{ $("img").style.display = "none"; };
    $("img").onload  = ()=>{ $("pending").style.display = "none"; };
  }

  _renderBadge(a.id, $("decisionBadge"));
  _updateStats();

  _renderSide('gridLeft',  'discard', '❌ DISCARDED (N)');
  _renderSide('gridRight', 'promote', '✅ APPROVED (N)');
  // #grid antigo (linha de pending no rodapé) removido — pending agora vive
  // nos 2 painéis PENDING (IN-GAME) + PENDING (NOT IN-GAME) abaixo do stats.
}

// === Wire up buttons ===
$("prev").onclick = ()=>{ idx = _nextPendingIdx(idx, -1); render(); };
$("next").onclick = ()=>{ idx = _nextPendingIdx(idx, 1);  render(); };

$("btnPromote").onclick = ()=>{
  const a = MANIFEST[idx];
  decisions[a.id] = { action:'promote', target: suggestTargetFolder(a.name), name: a.name, path: a.path };
  saveDecisions();
  idx = _nextPendingIdx(idx, 1); render();
};

$("btnDiscard").onclick = ()=>{
  const a = MANIFEST[idx];
  decisions[a.id] = { action:'discard', name: a.name, path: a.path };
  saveDecisions();
  idx = _nextPendingIdx(idx, 1); render();
};

$("btnRename").onclick = ()=>{
  const a = MANIFEST[idx];
  const newName = prompt(`Novo nome (sem extensão):`, a.name);
  if(!newName || newName === a.name) return;
  decisions[a.id] = { action:'rename', newName, name: a.name, path: a.path };
  saveDecisions(); render();
};

$("btnClear").onclick = ()=>{
  const a = MANIFEST[idx];
  delete decisions[a.id];
  saveDecisions();
  idx = _nextPendingIdx(idx, 1); render();
};

$("btnExport").onclick = async ()=>{
  const out = {};
  MANIFEST.forEach(a => {
    const dec = decisions[a.id];
    if(!dec) return;
    out[a.id] = { ...dec };
  });
  try {
    const res = await Api.saveDecisions(out);
    if(res.ok){
      const r = await res.json();
      $("stats").textContent = `💾 Salvo ${r.count} decisões em ${r.saved_to}`;
    } else {
      $("stats").textContent = `⚠ Servidor sem endpoint. Mata o http.server e roda: python tools/gallery_server.py`;
    }
  } catch(e){
    $("stats").textContent = `⚠ Servidor offline. Roda: python tools/gallery_server.py`;
  }
};

// === Keyboard shortcuts (só ativos na Manager tab) ===
document.addEventListener("keydown", e => {
  if(e.target.matches('input, textarea')) return;
  if(typeof activeTab !== 'undefined' && activeTab !== 'manager') return;
  if(e.key === "ArrowLeft")  $("prev").click();
  if(e.key === "ArrowRight") $("next").click();
  if(e.key === "p" || e.key === "P") $("btnPromote").click();
  if(e.key === "d" || e.key === "D") $("btnDiscard").click();
  if(e.key === "r" || e.key === "R") $("btnRename").click();
  if(e.key === "c" || e.key === "C") $("btnClear").click();
});

// === Auto-refresh timer (re-tenta carregar pendentes a cada 8s) ===
setInterval(()=>{
  refreshTimer--;
  if(refreshTimer <= 0){
    refreshTimer = 8;
    render();
  }
  $("refreshInfo").textContent = "próximo refresh em " + refreshTimer + "s";
}, 1000);

// === Carregar asset arbitrário no stage (pelos painéis IN-GAME / PENDING) ===
// Estende MANIFEST dinâmicamente com entry sintética. ID estável (slug do path)
// pra decisões persistirem em decisions.json normalmente.
function loadAuditAsset(path, name){
  if (!path) return;
  const cleanPath = path.replace(/^\.\.\//, '');
  // Synthetic id baseado em path (estável)
  const id = 'audit_' + cleanPath.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  // Se já existe no MANIFEST (real ou audit), reusa
  let i = MANIFEST.findIndex(m => m.id === id || m.path === path);
  if (i === -1) {
    MANIFEST.push({
      id, name: name || path.split(/[/\\]/).pop().replace('.png',''),
      status: 'ready', path, _audit: true
    });
    i = MANIFEST.length - 1;
  }
  idx = i;
  render();
  // Scroll suave pro stage
  const stage = document.getElementById('stage');
  if (stage) stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// === Initial render ===
render();

// === IN-GAME audit panel (carrega quando Audit/Manager está ativa, default tab) ===
// renderInGamePanel é definido em tab-gallery.js; lazy call após scripts carregarem
setTimeout(() => {
  if (typeof renderInGamePanel === 'function') renderInGamePanel();
}, 0);
