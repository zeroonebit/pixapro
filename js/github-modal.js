// PixaPro · github-modal.js — UI handler do modal de PAT setup

(function(){
  function $(id) { return document.getElementById(id); }

  function openModal() {
    const modal = $('githubModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const inp = $('ghPatInput');
    if (inp) {
      inp.value = window.PixaGithubApi?.getPat() || '';
    }
    updateBadge();
  }
  function closeModal() {
    const modal = $('githubModal');
    if (modal) modal.style.display = 'none';
  }
  function setStatus(msg, ok=true) {
    const el = $('ghPatStatus');
    if (el) {
      el.textContent = msg;
      el.style.color = ok ? '#88cc66' : '#cc6644';
    }
  }
  function updateBadge() {
    const btn = $('btnGithubAuth');
    if (!btn || !window.PixaGithubApi) return;
    btn.textContent = window.PixaGithubApi.hasPat() ? '🔑 GitHub ✓' : '🔑 GitHub';
  }

  async function testPat() {
    const inp = $('ghPatInput');
    const pat = inp?.value?.trim();
    if (!pat) { setStatus('Cola um PAT primeiro.', false); return; }
    setStatus('🔄 testing...');
    const res = await window.PixaGithubApi.validatePat(pat);
    if (!res.ok) { setStatus(`✗ ${res.error}`, false); return; }
    if (res.warning) { setStatus(`⚠ ${res.user} · ${res.warning}`, false); return; }
    setStatus(`✓ ${res.user} · scopes: ${res.scopes}`);
  }

  function savePat() {
    const inp = $('ghPatInput');
    const pat = inp?.value?.trim();
    if (!pat) { setStatus('Vazio. Cola um PAT.', false); return; }
    window.PixaGithubApi.setPat(pat);
    setStatus('✓ PAT salvo em localStorage');
    updateBadge();
    setTimeout(closeModal, 800);
  }

  function removePat() {
    if (!confirm('Remover PAT salvo do localStorage?')) return;
    window.PixaGithubApi.setPat('');
    const inp = $('ghPatInput');
    if (inp) inp.value = '';
    setStatus('✓ PAT removido');
    updateBadge();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btnOpen = $('btnGithubAuth');
    if (btnOpen) btnOpen.addEventListener('click', openModal);
    const btnClose = $('btnGhPatClose');
    if (btnClose) btnClose.addEventListener('click', closeModal);
    const btnTest = $('btnGhPatTest');
    if (btnTest) btnTest.addEventListener('click', testPat);
    const btnSave = $('btnGhPatSave');
    if (btnSave) btnSave.addEventListener('click', savePat);
    const btnRemove = $('btnGhPatRemove');
    if (btnRemove) btnRemove.addEventListener('click', removePat);
    // Close on backdrop click
    const modal = $('githubModal');
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    updateBadge();
  });
})();
