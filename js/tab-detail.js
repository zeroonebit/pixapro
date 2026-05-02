// PixaPro · tab-detail.js — Detail tab dashboard + MCP Live polling
// Renderiza queue do mcpQueue (vem de tab-editor.js) e faz polling
// do gallery_server.py /mcp_status pra real-time updates de jobs.
//
// Globals expostos: renderDetailDashboard, startMcpPolling, stopMcpPolling
//
// Dependências: mcpQueue/saveQueue (tab-editor), Api, $/escHtml/timeAgo,
//               PIXELLAB_TOOLS, switchTab (inline)

function renderDetailDashboard(){
  // Reload from localStorage pra pegar updates de outras tabs
  mcpQueue = Store.loadQueue();

  const pending = mcpQueue.filter(q => !q.done && !q.failed && !q.running);
  const running = mcpQueue.filter(q => q.running);
  const done    = mcpQueue.filter(q => q.done);
  const failed  = mcpQueue.filter(q => q.failed);
  const total = mcpQueue.length;
  const pct = total ? Math.round(done.length / total * 100) : 0;

  const statsEl = $("dashStats");
  if(statsEl) statsEl.innerHTML = `
    <div class="dash-stat cooking"><div class="ds-val">${pending.length}</div><div class="ds-label">⏳ pending</div></div>
    <div class="dash-stat" style="border-color:#1d3a4a;"><div class="ds-val" style="color:#9fcfe8;">${running.length}</div><div class="ds-label">🔄 running</div></div>
    <div class="dash-stat done"><div class="ds-val">${done.length}</div><div class="ds-label">✅ done</div></div>
    <div class="dash-stat failed"><div class="ds-val">${failed.length}</div><div class="ds-label">❌ failed</div></div>
    <div class="dash-stat total"><div class="ds-val">${total}</div><div class="ds-label">📋 total</div></div>
    <div class="dash-stat pct"><div class="ds-val">${pct}%</div><div class="ds-label">⏱ progress</div></div>`;

  const fill = $("dashProgressFill");
  if(fill) fill.style.width = pct + '%';

  // Category breakdown chips
  const catBar = $("dashCategoryBar");
  if(catBar){
    const cats = {};
    mcpQueue.forEach(q => {
      const toolName = (q.tool || '').replace(/^mcp__pixellab__/, '');
      const def = PIXELLAB_TOOLS.find(t => t.name === toolName);
      const cat = def?.cat || 'unknown';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    const catColors = {create:'#9fe89f', modify:'#9fcfe8', anim:'#dfa6df', meta:'#f4c95d', delete:'#e89f9f', unknown:'#a89368'};
    const catIcons  = {create:'🆕', modify:'🎨', anim:'🎬', meta:'📖', delete:'🗑', unknown:'❓'};
    catBar.innerHTML = Object.entries(cats)
      .sort((a,b) => b[1] - a[1])
      .map(([c, n]) => `<span class="dash-cat-chip" style="color:${catColors[c]||'#a89368'};border-color:${catColors[c]||'#4a3826'};">${catIcons[c]||'•'} ${c} <strong>${n}</strong></span>`)
      .join('');
    if(total === 0) catBar.innerHTML = '<span style="opacity:.5;font-size:12px;">nenhuma ação na fila</span>';
  }

  // Queue cards
  const cardsEl = $("dashQueueCards");
  if(cardsEl){
    if(total === 0){
      cardsEl.innerHTML = '<div style="text-align:center;padding:30px;opacity:.5;font-size:12px;">Queue vazia. Vá no Editor → preencha um tool → "Add to queue".</div>';
    } else {
      cardsEl.innerHTML = mcpQueue.map((q, idx) => {
        const st = q.done ? 'done' : q.failed ? 'failed' : q.running ? 'running' : 'pending';
        const stLabel = st;
        const toolShort = (q.tool || '').replace(/^mcp__pixellab__/, '');
        const assetName = q.asset?.name || q.args?.description?.substring(0,40) || '—';
        const tsStr = q.ts ? new Date(q.ts).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '';
        const resultStr = q.result ? `<span style="opacity:.6;font-size:12px;margin-left:8px;">${typeof q.result === 'string' ? q.result.substring(0,60) : 'result saved'}</span>` : '';
        return `<div class="qcard st-${st}" data-qidx="${idx}">
          <span class="qc-tool">${toolShort}</span>
          <span class="qc-asset" title="${assetName}">${assetName}${resultStr}</span>
          <span style="font-size:12px;opacity:.4;min-width:40px;">${tsStr}</span>
          <span class="qc-status ${st}">${stLabel}</span>
          <div class="qc-actions">
            ${st === 'pending' ? `<button data-qaction="done" data-qi="${idx}" title="Marcar como concluído">✅</button>` : ''}
            ${st === 'pending' ? `<button data-qaction="fail" data-qi="${idx}" title="Marcar como falho">❌</button>` : ''}
            ${st === 'done' || st === 'failed' ? `<button data-qaction="reset" data-qi="${idx}" title="Voltar pra pending">↺</button>` : ''}
            <button data-qaction="remove" data-qi="${idx}" title="Remover da fila">🗑</button>
          </div>
        </div>`;
      }).join('');
      cardsEl.querySelectorAll('[data-qaction]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.qi);
          const action = btn.dataset.qaction;
          if(idx < 0 || idx >= mcpQueue.length) return;
          if(action === 'done')   { mcpQueue[idx].done = true;   delete mcpQueue[idx].failed; delete mcpQueue[idx].running; }
          else if(action === 'fail')   { mcpQueue[idx].failed = true; delete mcpQueue[idx].done; delete mcpQueue[idx].running; }
          else if(action === 'reset')  { delete mcpQueue[idx].done; delete mcpQueue[idx].failed; delete mcpQueue[idx].running; }
          else if(action === 'remove') { mcpQueue.splice(idx, 1); }
          saveQueue();
          Api.saveMcpQueue(mcpQueue);
          renderDetailDashboard();
        };
      });
    }
  }
}

// === Wire dashboard buttons ===
$("btnDetailRefreshQueue")?.addEventListener('click', () => renderDetailDashboard());
$("btnDetailClearQueue")?.addEventListener('click', () => {
  if(!confirm('Limpar todo o queue MCP?')) return;
  mcpQueue = [];
  saveQueue();
  Api.saveMcpQueue([]);
  renderDetailDashboard();
});
$("btnDetailClearDone")?.addEventListener('click', () => {
  mcpQueue = mcpQueue.filter(q => !q.done);
  saveQueue();
  Api.saveMcpQueue(mcpQueue);
  renderDetailDashboard();
});
$("btnDetailExportJSON")?.addEventListener('click', () => {
  const json = JSON.stringify(mcpQueue, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    const btn = $("btnDetailExportJSON");
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy JSON'; }, 1500);
  }).catch(() => prompt('Copy JSON:', json));
});

// ========== MCP Live Status polling (server endpoint /mcp_status) ==========
let _mcpPollInterval = null;
let _mcpLiveConnected = false;

async function pollMcpStatus() {
  const dot = $('mcpLiveDot');
  const cards = $('mcpLiveCards');
  const countEl = $('mcpLiveCount');
  const lastPoll = $('mcpLiveLastPoll');
  try {
    const jobs = await Api.mcpStatus();
    _mcpLiveConnected = true;
    dot.style.background = '#3da53d';
    const now = new Date();
    lastPoll.textContent = 'poll ' + now.toLocaleTimeString();
    const active = jobs.filter(j => j.status === 'processing').length;
    const done   = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    const pending = jobs.filter(j => j.status === 'pending').length;
    countEl.textContent = `${jobs.length} jobs (${active} active, ${done} done, ${failed} fail, ${pending} pending)`;
    if (jobs.length === 0) {
      cards.innerHTML = '<div style="opacity:.5;font-size:12px;text-align:center;padding:12px;">Nenhum job MCP ativo. Claude posta status automaticamente ao chamar PixelLab.</div>';
      return;
    }
    // Preserve open state across re-renders
    const openJobs = new Set();
    cards.querySelectorAll('.mcp-job.open').forEach(el => {
      const jid = el.dataset.jobId;
      if (jid) openJobs.add(jid);
    });
    cards.innerHTML = jobs.map(j => {
      const st = j.status || 'pending';
      const elapsed = j.ts ? timeAgo(j.ts) : '';
      const idShort = (j.id || '').substring(0, 8);
      const desc = j.description || j.type || '—';
      const isOpen = openJobs.has(j.id);
      const openCls = isOpen ? ' open' : '';
      const inspectRows = [];
      inspectRows.push(`<span class="mji-key">ID</span><span class="mji-val" style="font-family:monospace;">${j.id || '—'}</span>`);
      inspectRows.push(`<span class="mji-key">Type</span><span class="mji-val">${j.type || '—'}</span>`);
      inspectRows.push(`<span class="mji-key">Status</span><span class="mji-val">${st}</span>`);
      inspectRows.push(`<span class="mji-key">Created</span><span class="mji-val">${j.ts || '—'}</span>`);
      if (j.params) {
        const pStr = typeof j.params === 'string' ? j.params : JSON.stringify(j.params, null, 2);
        inspectRows.push(`<span class="mji-key">Params</span><span class="mji-val" style="font-family:monospace;font-size:12px;white-space:pre-wrap;">${escHtml(pStr)}</span>`);
      }
      if (j.tile_size) inspectRows.push(`<span class="mji-key">Tile size</span><span class="mji-val">${j.tile_size}</span>`);
      let previewHtml = '';
      if (j.previews && j.previews.length) {
        previewHtml = `<div class="mji-preview">${j.previews.map(u => `<img src="${u}" width="64" height="64">`).join('')}</div>`;
      } else if (j.preview) {
        previewHtml = `<div class="mji-preview"><img src="${j.preview}" width="128" height="128"></div>`;
      } else if (j.png_url) {
        previewHtml = `<div class="mji-preview"><img src="${j.png_url}" width="128" height="128"></div>`;
      }
      let logHtml = '';
      if (j.error)       logHtml = `<div class="mji-log mji-error">${escHtml(String(j.error))}</div>`;
      else if (j.log)    logHtml = `<div class="mji-log">${escHtml(String(j.log))}</div>`;
      else if (j.result) logHtml = `<div class="mji-log">${escHtml(typeof j.result === 'string' ? j.result : JSON.stringify(j.result, null, 2))}</div>`;
      return `<div class="mcp-job st-${st}${openCls}" data-job-id="${j.id || ''}">
        <div class="mj-row">
          <span class="mj-dot"></span>
          <span class="mj-desc">${escHtml(desc)}</span>
          <span class="mj-id">${idShort}…</span>
          <span class="mj-status">${st}</span>
          <span class="mj-time">${elapsed}</span>
          <span class="mj-chevron">▶</span>
        </div>
        <div class="mj-inspect">
          <div class="mji-grid">${inspectRows.join('')}</div>
          ${previewHtml}
          ${logHtml}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    if (!_mcpLiveConnected) {
      dot.style.background = '#e84d4d';
      cards.innerHTML = '<div style="opacity:.5;font-size:12px;text-align:center;padding:12px;color:#e89f9f;">Server offline. Rode: python server.py</div>';
      countEl.textContent = 'offline';
    }
    lastPoll.textContent = 'erro: ' + e.message;
  }
}

// Toggle inspect banner on click
$('mcpLiveCards')?.addEventListener('click', e => {
  const row = e.target.closest('.mj-row');
  if (!row) return;
  const job = row.closest('.mcp-job');
  if (job) job.classList.toggle('open');
});

function startMcpPolling() {
  if (_mcpPollInterval) return;
  pollMcpStatus();
  _mcpPollInterval = setInterval(pollMcpStatus, 4000);
}

function stopMcpPolling() {
  if (_mcpPollInterval) { clearInterval(_mcpPollInterval); _mcpPollInterval = null; }
}

$('btnMcpLiveRefresh') && ($('btnMcpLiveRefresh').onclick = pollMcpStatus);
$('btnMcpLiveClear')   && ($('btnMcpLiveClear').onclick = async () => {
  try { await Api.mcpClear(); pollMcpStatus(); }
  catch(e) { console.warn('clear failed', e); }
});

// Hook switchTab pra start/stop polling baseado em tab visível.
// Faz lazy lookup: usa setTimeout pra esperar inline definir switchTab.
setTimeout(() => {
  if (typeof switchTab === 'function') {
    const origSwitchTab = switchTab;
    window.switchTab = function(t) {
      origSwitchTab(t);
      if (t === 'detail') startMcpPolling();
      else stopMcpPolling();
    };
  }
  // Se Detail já estiver ativo no load
  if (!document.getElementById('tab-detail').hidden) startMcpPolling();
}, 0);
