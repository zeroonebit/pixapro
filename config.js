// config.js — defaults estaticos pro PixaPro deployed em Pages.
// Quando rodando local via server.py, esse arquivo e gerado dinamicamente.
// Em Pages, este placeholder define window.PIXAPRO_CFG com defaults sane.
//
// Pra customizar: edite este arquivo no fork OU rode server.py local.

window.PIXAPRO_CFG = {
  server_url: 'http://localhost:8090',  // project_server.py default
  asset_url_base: '',                    // se vazio, usa origin do PixaPro
  // linkedProjects ainda nao consumido pelo frontend (TODO),
  // mas expomos aqui pra futuro
  linkedProjects: {
    'chapada-escapade': {
      name: 'Chapada Escapade',
      server: 'http://localhost:8090',
      pages:  'https://zeroonebit.github.io/chapada-escapade',
    },
  },
};
