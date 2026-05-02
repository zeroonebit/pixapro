# PixaPro · Project Integration Guide

Como conectar PixaPro como **ferramenta editora externa** a um projeto de jogo (game, simulador, qualquer coisa que precise de tilesets, animações ou map presets gerados por IA).

PixaPro vive como repo separado e fala com cada projeto via **HTTP API REST** servida pelo `server.py` do projeto-host. Cada projeto tem o próprio server (default port `8090`) — PixaPro só é uma UI que lê/escreve assets via fetch.

---

## Arquitetura

```
┌─────────────────────┐         HTTP fetch          ┌─────────────────────┐
│  PixaPro UI (web)   │ ────────────────────────►   │  Project server.py  │
│  http://localhost   │  GET  /maps?project=slug    │  (cada projeto roda │
│  /pixapro/index.html│  POST /maps/<name>          │   sua própria copia │
│                     │  GET  /list_assets          │   na porta 8090)    │
│                     │  POST /save_decisions       │                     │
└─────────────────────┘                             └──────────┬──────────┘
                                                               │
                                                               ▼
                                                    ┌─────────────────────┐
                                                    │   Project disk      │
                                                    │  assets/pixel_labs/ │
                                                    │  assets/terrain/    │
                                                    │  tools/saves/       │
                                                    │   projects/<slug>/  │
                                                    │     maps/*.json     │
                                                    └─────────────────────┘
```

PixaPro não tem disk próprio (além do config). Tudo é persistido no projeto.

---

## Conectando um projeto novo

### 1. No projeto, copia o `server.py` base

Estrutura mínima que cada projeto precisa servir (referência: `H:/Projects/ChapadaEscapade/tools/gallery_server.py`):

```python
# tools/gallery_server.py
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class Handler(SimpleHTTPRequestHandler):
    # CORS headers (PixaPro roda em outro origin)
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/maps"):
            self.handle_maps_get()
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/maps/"):
            self.handle_maps_post()
            return
        # ... outros endpoints (decisions, configs, etc)
```

**Endpoints obrigatórios pra integração com PixaPro:**

| Method | Path | Descrição |
|--------|------|-----------|
| `GET`  | `/maps?project=<slug>` | Lista maps salvos pra projeto. Retorna `{maps: [{name, bias, seed, tileStyle}]}`. |
| `GET`  | `/maps/<name>?project=<slug>` | Detalhe de 1 map. Retorna o JSON completo. |
| `POST` | `/maps/<name>?project=<slug>` | Salva/sobrescreve um map. Body = JSON do map config. |

**Endpoints opcionais (úteis pra UI completa):**

| Method | Path | Descrição |
|--------|------|-----------|
| `GET`  | `/list_assets` | Lista PNGs do projeto (pra gallery view). |
| `POST` | `/save_decisions` | Persiste anotações/correções de tiles. |
| `GET`  | `/scan_in_game_assets` | Scan dos `.js` pra ver quais assets estão wireados in-game. |

### 2. Storage layout no projeto

```
<project>/
├── tools/
│   ├── gallery_server.py
│   └── saves/
│       └── projects/
│           └── <slug>/        ← slug = nome unique do projeto (ex: "chapada-escapade")
│               └── maps/
│                   ├── tutorial.json
│                   ├── ilha_tropical.json
│                   └── continentes.json
├── assets/
│   ├── pixel_labs/        ← assets gerados (sprites, items, etc)
│   └── terrain/           ← tilesets wang slicedso
└── ...
```

### 3. Schema do map JSON

Tudo opcional, com defaults sane no consumer (game). Cada projeto pode estender com campos próprios.

```json
{
  "name": "tutorial",
  "_saved_at": "2026-05-02T18:00:00",
  "seed": 42,
  "bias": "ca-3",
  "threshold": 0.50,
  "gridW": 100,
  "gridH": 75,
  "tileStyle": "dirt_grass_32",

  "vertThreshold": 0.50,
  "vertCaPasses": 4,
  "seedWater": 0.10,
  "seedSand": 0.18,
  "seedGrass": 0.40,
  "caPasses": 3,

  "_extra": {}
}
```

**Convenção wang:** cr31 corner-2-edge — `bits = NW + NE*2 + SE*4 + SW*8`.

### 4. Adiciona o projeto em `pixapro_config.json`

```json
{
  "linkedProjects": {
    "chapada-escapade": {
      "name": "Chapada Escapade",
      "path": "H:/Projects/ChapadaEscapade",
      "server_url": "http://localhost:8090",
      "maps_endpoint": "/maps",
      "asset_root": "H:/Projects/ChapadaEscapade/assets/pixel_labs",
      "terrain_root": "H:/Projects/ChapadaEscapade/assets/terrain"
    },

    "meu-novo-projeto": {
      "name": "Meu Novo Projeto",
      "path": "H:/Projects/MeuJogo",
      "server_url": "http://localhost:8091",
      "maps_endpoint": "/maps",
      "asset_root": "H:/Projects/MeuJogo/assets",
      "terrain_root": "H:/Projects/MeuJogo/assets/tilesets"
    }
  }
}
```

PixaPro usa o `server_url` por projeto pra fetch — então cada projeto pode rodar em porta diferente sem conflito.

### 5. No game, faz o fetch

JS exemplo (Chapada Escapade `js/15_debug_menu.js`):

```js
const PROJECT_SLUG = 'chapada-escapade';
const PIXAPRO_URL  = 'http://localhost:8090';

async function refreshMapList() {
    const r = await fetch(`${PIXAPRO_URL}/maps?project=${PROJECT_SLUG}`);
    const data = await r.json();
    return data.maps;  // [{name, bias, seed, tileStyle}, ...]
}

async function loadMapPreset(name) {
    const r = await fetch(`${PIXAPRO_URL}/maps/${name}?project=${PROJECT_SLUG}`);
    return await r.json();  // {seed, threshold, bias, ...}
}
```

---

## Workflow típico

1. Dev abre PixaPro (`http://localhost:8089/`)
2. Seleciona projeto-alvo no header (futuro: dropdown)
3. Vai pra aba **🗺️ Map**
4. Ajusta seed/threshold/bias/tileStyle, vê o preview no canvas
5. Clica **💾 Save as preset...** → escolhe nome → POST `/maps/<name>` no project server
6. No game, abre CONFIGS → MAP → clica "↻ Refresh from PixaPro"
7. Seleciona o preset no dropdown → game re-renderiza com aquele config

---

## Modo Pages-only (sem servers locais)

PixaPro pode rodar **só com GitHub Pages**, sem precisar de servers locais. Funciona pra **read-only** (browse, audit, load preset). Write (Save, Apply renames) ainda precisa do project server local.

### Setup

Cada projeto deve:

1. Ter `tools/bake_indexes.py` (script que walka assets/ e maps/ pra gerar JSONs estáticos)
2. Commitar `data/maps/<name>.json` (presets viram arquivos estáticos)
3. Workflow GitHub Actions auto-roda `bake_indexes.py` em pushes pra main que tocam `assets/`, `data/maps/`, ou o script — atualiza `data/_assets_index.json` + `data/maps/_index.json` e commita de volta
4. Habilitar GitHub Pages servindo da root da branch main

### Fluxo de fetch fallback

PixaPro tab-map e tab-naming usam `fetchWithFallback(serverPath, pagesPath)`:

```js
const PROJECTS = {
  'chapada-escapade': {
    server: 'http://localhost:8090',                          // local · read+write
    pages:  'https://zeroonebit.github.io/chapada-escapade',  // Pages · read-only
  },
};

async function fetchWithFallback(serverPath, pagesPath) {
  // Tenta server local primeiro (timeout 2s)
  try {
    const r = await fetch(cfg.server + serverPath, {signal: AbortSignal.timeout(2000)});
    if (r.ok) return {data: await r.json(), source: 'server'};
  } catch {}
  // Fallback Pages
  try {
    const r = await fetch(cfg.pages + pagesPath);
    if (r.ok) return {data: await r.json(), source: 'pages'};
  } catch {}
  return null;
}
```

UI mostra qual fonte tá ativa (`local · read+write` vs `Pages · read-only`) e desabilita botões de write quando estiver no modo Pages.

### Mapeamento server → Pages

| Endpoint local (project_server) | Equivalente estático no Pages |
|---|---|
| `GET /maps?project=<slug>` | `GET /data/maps/_index.json` |
| `GET /maps/<name>?project=<slug>` | `GET /data/maps/<name>.json` |
| `GET /scan_assets` | `GET /data/_assets_index.json` |
| `POST /maps/<name>` | ❌ requer server local |
| `POST /apply_renames` | ❌ requer server local |
| `POST /check_refs` | ❌ requer server local |

### Para writes em modo "near-Pages"

Quando salvar um preset no PixaPro com server local rodando:
1. POST salva em `tools/saves/projects/<slug>/maps/<name>.json` (privado do dev)
2. Dev copia pra `data/maps/<name>.json` (commitado)
3. Roda `python tools/bake_indexes.py` (atualiza `_index.json`)
4. `git add data/ && git commit && git push`
5. GitHub Action confirma o bake e Pages atualiza em ~30s

Workflow possivelmente futuro: Save direto pelo PixaPro via **GitHub API** (PUT /repos/{owner}/{repo}/contents/{path}) usando PAT/OAuth. Elimina servers locais por completo.

---

## Princípios

- **Project-agnostic**: PixaPro nunca embute lógica específica de um jogo. Tudo passa pelo server do projeto.
- **CORS aberto**: cada server precisa expor `Access-Control-Allow-Origin: *` (dev local; em prod restringir).
- **Slug-based**: cada projeto tem identifier único (kebab-case). Path do disk usa o slug.
- **Append-only safe**: PixaPro não deleta maps sem confirmação UI. Histórico opcional via `tools/saves/projects/<slug>/maps/_history/`.
- **Assets via project URL**: pra preview de tiles no PixaPro, fetch da URL do projeto (`http://localhost:8090/assets/...`). Não copia nem cacheia.

---

## Roadmap

- [ ] PixaPro UI: dropdown de projeto ativo (lê `linkedProjects`)
- [ ] Aba Map dedicada com Save as preset / Load / Delete
- [ ] Histórico de versões por map (timeline)
- [ ] Import/export ZIP de presets entre projetos
- [ ] Validação de schema (jsonschema) no save

---

*Última atualização: 2026-05-02*
