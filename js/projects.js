// PixaPro · projects.js — Multi-project support
// Le linkedProjects de window.PIXAPRO_CFG (config.js), expoe API uniforme
// pra tabs (Map, Naming, etc) consumirem.
//
// Cada projeto: { name, server, pages }
//   - server: project_server.py URL local (read+write)
//   - pages:  GitHub Pages URL (read-only via _index.json baked)
//
// fetchWithFallback: tenta server local primeiro (timeout 2s), senao Pages.

(function(){
  // Default minimo se nada no config.js
  const DEFAULT_PROJECTS = {
    'chapada-escapade': {
      name: 'Chapada Escapade',
      server: 'http://localhost:8090',
      pages:  'https://zeroonebit.github.io/chapada-escapade',
    },
  };

  // Le do config.js (window.PIXAPRO_CFG.linkedProjects), fallback pro default
  function loadLinkedProjects() {
    const cfg = window.PIXAPRO_CFG || {};
    const linked = cfg.linkedProjects;
    if (!linked || Object.keys(linked).length === 0) {
      return DEFAULT_PROJECTS;
    }
    // Normaliza schema: aceita "server_url" (legacy) ou "server"
    const out = {};
    for (const [slug, p] of Object.entries(linked)) {
      out[slug] = {
        name: p.name || slug,
        server: p.server || p.server_url || 'http://localhost:8090',
        pages:  p.pages || (p.path ? `https://zeroonebit.github.io/${slug}` : null),
      };
    }
    return out;
  }

  const PROJECTS = loadLinkedProjects();
  const PROJECT_SLUGS = Object.keys(PROJECTS);
  const ACTIVE_PROJECT_KEY = 'pixapro_active_project';

  // Active project: persistido em localStorage
  function getActiveSlug() {
    const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (saved && PROJECTS[saved]) return saved;
    return PROJECT_SLUGS[0];
  }
  function setActiveSlug(slug) {
    if (!PROJECTS[slug]) return;
    localStorage.setItem(ACTIVE_PROJECT_KEY, slug);
  }
  function getActiveCfg() {
    return PROJECTS[getActiveSlug()] || PROJECTS[PROJECT_SLUGS[0]];
  }

  // fetchWithFallback: server local -> Pages (read-only fallback)
  async function fetchWithFallback(serverPath, pagesPath) {
    const cfg = getActiveCfg();
    if (cfg.server) {
      try {
        const r = await fetch(cfg.server + serverPath, {signal: AbortSignal.timeout(2000)});
        if (r.ok) return {data: await r.json(), source: 'server'};
      } catch {}
    }
    if (pagesPath && cfg.pages) {
      try {
        const r = await fetch(cfg.pages + pagesPath);
        if (r.ok) return {data: await r.json(), source: 'pages'};
      } catch {}
    }
    return null;
  }

  // Popula um <select> com os projetos disponiveis
  function populateSelector(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = PROJECT_SLUGS.map(slug => {
      const p = PROJECTS[slug];
      const sel = slug === getActiveSlug() ? 'selected' : '';
      return `<option value="${slug}" ${sel}>${p.name}</option>`;
    }).join('');
    selectEl.addEventListener('change', () => {
      setActiveSlug(selectEl.value);
      // Dispatch evento global pras tabs re-fetcharem
      document.dispatchEvent(new CustomEvent('pixapro:project-changed', {detail: {slug: selectEl.value}}));
    });
  }

  // Expose globalmente
  window.PixaProjects = {
    PROJECTS,
    PROJECT_SLUGS,
    getActiveSlug,
    setActiveSlug,
    getActiveCfg,
    fetchWithFallback,
    populateSelector,
  };

  // Auto-popula todos selects com [data-pixa-projects] no DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('select[data-pixa-projects]').forEach(populateSelector);
  });
})();
