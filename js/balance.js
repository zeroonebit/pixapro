// PixaPro · balance.js — header badge mostrando saldo PixelLab
// Lê do gallery_server (cache populado pelo bookmarklet rodando em pixellab.ai/account).
//
// Bookmarklet: o user adiciona um bookmark com este código JS, clica enquanto
// estiver na página /account, e o saldo é POSTado no localhost:8090.
// Pega o JS via botão "📋 Bookmarklet" — copia compactado pra clipboard.

const PIXAPRO_BOOKMARKLET = (() => {
  // ATENÇÃO: este source roda DENTRO de pixellab.ai/account quando o user
  // clicar no bookmark. Tem que ser autocontido — sem deps de PixaPro.
  // Compactado pra javascript: URL no final. SERVER_URL é injetado em build-time
  // a partir de window.PIXAPRO_CFG (servido por /config.js).
  const SERVER = (window.PIXAPRO_CFG && window.PIXAPRO_CFG.server_url) || 'http://localhost:8090';
  const src = `(async()=>{
    const t=document.body.innerText;
    const g=t.match(/Generations[\\s\\S]*?(\\d[\\d,]*)\\s*\\/\\s*(\\d[\\d,]*)/);
    const r=t.match(/Resets\\s+([A-Za-z]+\\s+\\d+)/);
    const p=t.match(/Subscription\\s*\\n\\s*([^\\n]+?)(?:\\s+Active)?\\n/);
    const c=t.match(/Credits\\s*\\n\\s*\\$(\\d+\\.\\d+)/);
    if(!g){alert('PixaPro: não achei "Generations X/Y" na página. Abra https://www.pixellab.ai/account primeiro.');return;}
    const d={used:parseInt(g[1].replace(/,/g,'')),total:parseInt(g[2].replace(/,/g,'')),resets:r?r[1]:null,plan:p?p[1].trim():null,credits_usd:c?parseFloat(c[1]):null};
    try{
      const res=await fetch('${SERVER}/pixellab_balance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
      if(res.ok)alert('PixaPro: saldo atualizado · '+d.used+'/'+d.total+' · resets '+d.resets);
      else alert('PixaPro: server respondeu '+res.status);
    }catch(e){alert('PixaPro: server offline (${SERVER}). Rode python server.py');}
  })();`;
  // Single-line + javascript: prefix
  return 'javascript:' + encodeURIComponent(src.replace(/\s+/g, ' ').trim());
})();

async function refreshBalanceBadge() {
  const txtEl = document.getElementById('balanceText');
  const metaEl = document.getElementById('balanceMeta');
  const badge = document.getElementById('pixellabBalanceBadge');
  if (!txtEl) return;
  try {
    const data = await Api.pixellabBalance();
    if (data.error) {
      txtEl.textContent = 'PixelLab: —';
      metaEl.textContent = data.msg || 'sem dados (use bookmarklet)';
      badge.classList.remove('low');
      return;
    }
    const remaining = data.total - data.used;
    txtEl.textContent = `PixelLab: ${data.used}/${data.total}`;
    const pct = Math.round((data.used / data.total) * 100);
    metaEl.textContent = `${remaining} restantes (${pct}% usado) · ${data.plan || '?'} · resets ${data.resets || '?'}`;
    badge.classList.toggle('low', remaining < 200);
  } catch (e) {
    txtEl.textContent = 'PixelLab: server offline';
    metaEl.textContent = '';
  }
}

// Botão "Refresh"
document.getElementById('btnBalanceRefresh')?.addEventListener('click', refreshBalanceBadge);

// Botão "📋 Bookmarklet" — copia o code pra clipboard
document.getElementById('btnBalanceBookmarklet')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(PIXAPRO_BOOKMARKLET);
    const btn = document.getElementById('btnBalanceBookmarklet');
    const orig = btn.textContent;
    btn.textContent = '✅ Copiado! Cole na barra de bookmarks';
    setTimeout(() => { btn.textContent = orig; }, 2500);
  } catch (e) {
    prompt('Copia este URL e cola num bookmark novo:', PIXAPRO_BOOKMARKLET);
  }
});

// Initial fetch + auto-refresh a cada 60s (silencioso se server offline)
refreshBalanceBadge();
setInterval(refreshBalanceBadge, 60000);
