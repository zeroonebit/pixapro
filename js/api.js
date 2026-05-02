// PixaPro · api.js — HTTP wrappers pro gallery_server.py + PixelLab API
// Centraliza fetch calls. Cada função retorna Promise.
// API_BASE = same-origin se servido pelo gallery_server.py (8090), senão aponta cross-origin.
// MCP_SERVER = endpoint de status em tempo real (sempre 8090, fixo).

const PIXAPRO_SERVER_URL = (window.PIXAPRO_CFG && window.PIXAPRO_CFG.server_url) || 'http://localhost:8090';
const API_BASE   = (window.location.origin === PIXAPRO_SERVER_URL) ? '' : PIXAPRO_SERVER_URL;
const MCP_SERVER = PIXAPRO_SERVER_URL;
const PIXELLAB_DOWNLOAD = id => `https://api.pixellab.ai/mcp/map-objects/${id}/download`;

const Api = {
  // === Decisions (manager) ===
  saveDecisions(decisions) {
    return fetch(API_BASE + '/save_decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decisions, null, 2),
    });
  },

  // === Asset tags ===
  loadTags() {
    return fetch(API_BASE + '/tools/saves/asset_tags.json?t=' + Date.now())
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
  },
  saveTags(tags) {
    return fetch(API_BASE + '/save_asset_tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tags),
    }).catch(() => {});
  },

  // === Filesystem scan ===
  async listAssets() {
    try {
      const res = await fetch(API_BASE + '/list_assets');
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  // === MCP Queue persistence ===
  saveMcpQueue(queue) {
    return fetch(API_BASE + '/save_mcp_queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queue),
    }).catch(() => {});
  },

  // === Wang corrections ===
  loadWangCorrections() {
    return fetch(API_BASE + '/tools/saves/wang_corrections.json?t=' + Date.now())
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
  },
  saveWangCorrections(registry) {
    return fetch(API_BASE + '/save_wang_corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registry),
    });
  },

  // === Generic external metadata fetch (PixelLab) ===
  async fetchMetadata(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  // === MCP Live Status (real-time job tracker) ===
  mcpStatus() {
    return fetch(MCP_SERVER + '/mcp_status', { signal: AbortSignal.timeout(3000) })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  },
  mcpClear() {
    return fetch(MCP_SERVER + '/mcp_clear', { method: 'POST' });
  },

  // === PixelLab balance (populado via bookmarklet, lido aqui) ===
  pixellabBalance() {
    return fetch(API_BASE + '/pixellab_balance', { signal: AbortSignal.timeout(3000) })
      .then(r => r.json());
  },

  // === Scan in-game assets (regex em js/*.js pra detectar refs reais) ===
  scanInGameAssets() {
    return fetch(API_BASE + '/scan_in_game_assets', { signal: AbortSignal.timeout(8000) })
      .then(r => r.json());
  },
};
