// PixaPro · popup.js — Floating popup global (compartilhado por todas as tabs)
// Position:fixed → nunca clipa overflow:auto dos painéis.
// Click handler que liga popup → tab Detail fica no inline (depende de
// approvedAssets/detailSelected/renderDetailMain).

let _popupHideTimer = null;

function showFloatingPopup(wrap, html, opts={}){
  const popup = document.getElementById('floatingPopup');
  popup.innerHTML = html;
  popup.dataset.context = opts.context || '';
  popup.classList.add('show');
  // Posicionar orientado pro centro da viewport
  const r = wrap.getBoundingClientRect();
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  // Medir após render
  requestAnimationFrame(() => {
    const pr = popup.getBoundingClientRect();
    const margin = 6;
    let left, top;
    if(r.left + r.width/2 < cx){ left = r.right + margin; }
    else { left = r.left - pr.width - margin; }
    if(r.top + r.height/2 > cy){ top = r.bottom - pr.height; }
    else { top = r.top; }
    // Clamp pra não sair da viewport
    left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
    top  = Math.max(8, Math.min(top,  window.innerHeight - pr.height - 8));
    popup.style.left = left + 'px';
    popup.style.top  = top + 'px';
  });
}

function hideFloatingPopup(){
  document.getElementById('floatingPopup').classList.remove('show');
}

function attachPopupOrient(wrap, htmlFn, opts={}){
  wrap.addEventListener('mouseenter', () => {
    if(_popupHideTimer){ clearTimeout(_popupHideTimer); _popupHideTimer = null; }
    showFloatingPopup(wrap, htmlFn(), opts);
  });
  wrap.addEventListener('mouseleave', () => {
    _popupHideTimer = setTimeout(hideFloatingPopup, 180);
  });
}

// Manter popup aberto enquanto mouse está nele
document.getElementById('floatingPopup')?.addEventListener('mouseenter', () => {
  if(_popupHideTimer){ clearTimeout(_popupHideTimer); _popupHideTimer = null; }
});
document.getElementById('floatingPopup')?.addEventListener('mouseleave', () => {
  _popupHideTimer = setTimeout(hideFloatingPopup, 180);
});
