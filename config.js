// config.js — defaults estaticos pro PixaPro deployed em Pages.
// Quando rodando local via server.py, esse arquivo e gerado dinamicamente
// from pixapro_config.json. Em Pages, este placeholder define
// window.PIXAPRO_CFG com defaults sane.
//
// Pra ADICIONAR um projeto novo: edita linkedProjects, commita, push.
// Pages serve este arquivo + o dropdown de projetos popula automatico.

window.PIXAPRO_CFG = {
  server_url: 'http://localhost:8090',  // legacy, usado por api.js (fallback)
  asset_url_base: '',

  // Multi-project support (consumido por js/projects.js).
  // Cada entry: { name, server, pages }
  //   - server: project_server.py URL local (read+write)
  //   - pages:  GitHub Pages URL (read-only via _index.json baked)
  linkedProjects: {
    'chapada-escapade': {
      name: 'Chapada Escapade',
      server: 'http://localhost:8090',
      pages:  'https://zeroonebit.github.io/chapada-escapade',
    },
    // Exemplo de adicionar projeto novo:
    // 'meu-novo-jogo': {
    //   name: 'Meu Novo Jogo',
    //   server: 'http://localhost:8091',
    //   pages:  'https://username.github.io/meu-novo-jogo',
    // },
  },
};
