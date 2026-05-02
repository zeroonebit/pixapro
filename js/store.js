// PixaPro · store.js — wrappers de localStorage com keys centralizadas
// Não tenta gerir state em memória — só I/O do localStorage.
// As variáveis de estado (decisions, mcpQueue, assetTags) continuam globals
// no inline script; este módulo só padroniza load/save.

const STORE_KEYS = {
  DECISIONS:    'chapEscapadeAssetDecisions',
  TAGS:         'chapEscapadeAssetTags',
  QUEUE:        'chapEscapadeMcpQueue',
  EDITOR_ORDER: 'chapEscapadeEditorSectionOrder',
};

const Store = {
  // Decisões: { [assetId]: { action: 'promote'|'discard'|'rename', ... } }
  loadDecisions() {
    try { return JSON.parse(localStorage.getItem(STORE_KEYS.DECISIONS) || '{}'); }
    catch(e) { return {}; }
  },
  saveDecisions(d) {
    localStorage.setItem(STORE_KEYS.DECISIONS, JSON.stringify(d));
  },

  // Tags por asset path: { [path]: ['tag1', 'tag2'] }
  loadTags() {
    try { return JSON.parse(localStorage.getItem(STORE_KEYS.TAGS) || '{}'); }
    catch(e) { return {}; }
  },
  saveTags(t) {
    localStorage.setItem(STORE_KEYS.TAGS, JSON.stringify(t));
  },

  // Queue MCP: array de { tool, args, asset, ts, done?, failed?, running? }
  loadQueue() {
    try { return JSON.parse(localStorage.getItem(STORE_KEYS.QUEUE) || '[]'); }
    catch(e) { return []; }
  },
  saveQueue(q) {
    localStorage.setItem(STORE_KEYS.QUEUE, JSON.stringify(q));
  },

  // Ordem das sections no Editor: array de cat ids
  loadEditorOrder() {
    try { return JSON.parse(localStorage.getItem(STORE_KEYS.EDITOR_ORDER) || 'null'); }
    catch(e) { return null; }
  },
  saveEditorOrder(o) {
    localStorage.setItem(STORE_KEYS.EDITOR_ORDER, JSON.stringify(o));
  },
};
