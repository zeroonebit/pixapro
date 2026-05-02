// PixaPro · tabs.js — orquestração de tabs (último módulo carregado antes de inline)
//
// Define `activeTab` global (lido por tab-manager keyboard handler) e
// `switchTab(name)` global (chamado pelos tab buttons).
// Cada tab module hookea seu próprio init via overriding switchTab (ex: tab-detail
// adiciona startMcpPolling/stopMcpPolling).
//
// Globals expostos: activeTab, switchTab, API_URL
// Dependências: hideFloatingPopup (popup.js), renderGallery/renderEditorList/
//               renderDetailDashboard/renderTiles (tab-*.js)

const API_URL = PIXELLAB_DOWNLOAD; // alias compat (pixellab map-objects download)

let activeTab = 'manager';
function switchTab(name){
  activeTab = name;
  hideFloatingPopup(); // Bug fix: fecha popup ao trocar tab
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.hidden = (c.id !== 'tab-' + name));
  if(name === 'gallery') renderGallery();
  else if(name === 'editor') renderEditorList();
  else if(name === 'detail') renderDetailDashboard();
  else if(name === 'tiles') renderTiles();
  else if(name === 'manager' && typeof renderInGamePanel === 'function') renderInGamePanel();
}

// Bug fix: fecha popup ao scrollar qualquer painel
window.addEventListener('scroll', () => hideFloatingPopup(), {passive:true});
document.addEventListener('scroll', () => hideFloatingPopup(), {capture:true, passive:true});

// Wire tab buttons
document.querySelectorAll('.tab').forEach(t => {
  t.onclick = () => switchTab(t.dataset.tab);
});
