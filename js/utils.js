// PixaPro · utils.js — funções puras genéricas (sem deps de DOM mutável ou state)

// Helper de seleção (atalho global usado em todo lugar)
const $ = id => document.getElementById(id);

// HTML escape — usado em log/error renders
function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ISO timestamp → "5s" / "3min" / "2h"
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's';
  if (diff < 3600) return Math.floor(diff/60) + 'min';
  return Math.floor(diff/3600) + 'h';
}

// Sugere pasta destino baseado no prefixo do nome (pra Promote)
function suggestTargetFolder(name) {
  if (/^bucket_|^milk_|^feed_|^water_trough/.test(name)) return 'objects';
  if (/^gas_can_|^barrel_|^crate_|^radio_tower|^meat_grinder|^windmill|^wrecked_truck|^satellite/.test(name)) return 'objects';
  if (/^palm_|^tree_|^flower_|^bromelia_|^grass_|^burned_|^mesa_/.test(name)) return 'vegetation';
  if (/^rock_|^crop_circle_|^bone_|^alien_|^lantern_|^church_|^hay_/.test(name)) return 'objects';
  if (/^scarecrow/.test(name)) return 'enemies';
  if (/^\[HUD\]/.test(name)) return 'hud';
  return 'objects';
}

// Type detector baseado no path (auto, sem metadata)
function getAssetType(path){
  const m = path.match(/pixel_labs\/(.+)$/);
  if(!m) return 'unknown';
  const parts = m[1].split('/');
  if(parts[0] === 'hud') return 'hud';
  if(parts[0] === 'chars'){
    if(parts[1] === 'nature'){
      const cat = parts[2] || '';
      if(/^cercas/.test(cat)) return 'fences';
      if(/vegeta/i.test(cat)) return 'vegetation';
      if(cat === 'objects') return 'objects';
      if(/pedra|rock/i.test(cat)) return 'rocks';
      if(/plac|sign/i.test(cat)) return 'signs';
      if(cat === 'v2') return 'inbox';
      if(cat === 'outros' || cat === 'misc') return 'misc';
      return cat || 'nature';
    }
    return 'characters';
  }
  return parts[0] || 'unknown';
}

const TYPE_ICONS = {
  characters: '🧍', objects: '📦', vegetation: '🌳', fences: '🪵',
  rocks: '🪨', signs: '🪧', hud: '📺', inbox: '📥', misc: '🔮', unknown: '❓'
};

// URL REAL de um asset do projeto ativo — o fix dos thumbs 404.
// Herança do spinoff: na era embedded a UI era servida pelo próprio
// gallery_server (8090) e paths '../assets/...' resolviam same-origin;
// no standalone (8089) os fetches ganharam API_BASE mas os img.src
// ficaram crus → 404 em massa (Gallery/Audit/Editor).
// Aceita: '../assets/...' (legacy do /list_assets), 'assets/...' limpo,
// absoluto http(s) e data: (passam direto).
// Local (http) prefere o server do projeto; deployed (https/Pages)
// prefere o pages — <img> não precisa de CORS, só de um host que sirva.
function assetUrl(path){
  if(!path) return '';
  if(/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  const rel = path.replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
  const cfg = (window.PixaProjects && window.PixaProjects.getActiveCfg && window.PixaProjects.getActiveCfg()) || {};
  const local = cfg.server || (window.PIXAPRO_CFG && window.PIXAPRO_CFG.server_url) || '';
  const pages = cfg.pages || '';
  const base = (location.protocol === 'https:') ? (pages || local) : (local || pages);
  return base ? `${base}/${rel}` : rel;
}

// PRNG simples (mulberry32) — seed determinística pra terrain test render
function mulberry32(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
