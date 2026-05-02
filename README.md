# PixaPro

UI web standalone para gerenciar **assets, tilesets, animações, mapas** de qualquer projeto de jogo. Project-agnostic — conecta a múltiplos projetos via HTTP API.

> **Documentação principal:**
> - 📘 **[PROJECT_INTEGRATION.md](PROJECT_INTEGRATION.md)** — como conectar projetos novos (arquitetura, endpoints, schema)
> - 📋 **[ASSET_NAMING_STANDARD.md](ASSET_NAMING_STANDARD.md)** — convenção universal de naming/organização de assets

---

## Quick start

```bash
# 1. PixaPro UI (porta 8089)
python server.py

# 2. Project server do projeto-alvo (porta 8090, em outro repo)
cd H:/Projects/ChapadaEscapade
python tools/project_server.py
```

Abre **http://localhost:8089/** no browser.

---

## Tabs

| Aba | Função |
|---|---|
| 📊 **Gallery** | Browse all assets · filtros · refresh |
| ✏️ **Editor** | Visualizer 8-dir + tools MCP (queue PixelLab) |
| 🔍 **Audit** | Scan in-game refs via regex (P/D/R/C) |
| 🔧 **Detail (queue)** | Dashboard + MCP live polling |
| 🧩 **Tiles** | Wang cr31 editor + auto-sort visual |
| 🗺️ **Map** | Test render terreno procedural + Save/Load presets por projeto |
| 📋 **Naming** | Audit asset naming convention + apply renames com backup |

---

## Convenção de portas

PixaPro NÃO faz lógica de dados — fala com o **project server** de cada projeto via HTTP. Cada projeto roda o próprio server.

| Porta | Quem | O que serve |
|---|---|---|
| 8080 | Game canvas | static |
| **8089** | **PixaPro UI** (`H:/Projects/PixaPro/server.py`) | UI estática + alguns endpoints próprios |
| 8090 | Project server (`<project>/tools/project_server.py`) | static do projeto + API REST de maps/assets |

---

## Endpoints próprios do PixaPro server

```
GET  /                          → UI (index.html)
GET  /config.js                 → injeta window.PIXAPRO_CFG (frontend reads)
GET  /list_assets               → walks asset_root (legacy do spinoff)
GET  /scan_in_game_assets       → regex extract de assets/pixel_labs/* nos .js
GET  /assets/pixel_labs/*       → proxy estático do asset_root
GET  /assets/terrain/*          → proxy estático do terrain_root
GET|POST /mcp_status
GET|POST /pixellab_balance
POST /save_decisions, /save_configs, /save_mcp_queue, /save_wang_corrections, /save_asset_tags
```

⚠️ Vários desses são heritage do spinoff inicial e **se sobrepõem** aos endpoints do project server. Ver `PROJECT_INTEGRATION.md` pra divisão correta de responsabilidades — em projetos novos, prefira que o project server exponha tudo, deixando o PixaPro server só como UI server.

---

## Endpoints consumidos do project server

PixaPro fetcha estes do project server (default `http://localhost:8090`):

```
GET  /scan_assets                           → audit (Naming tab)
POST /apply_renames                         → batch rename (Naming tab)
POST /check_refs                            → preview refs antes de rename
GET  /asset_naming                          → config do projeto
GET  /maps?project=<slug>                   → lista presets (Map tab)
POST /maps/<name>?project=<slug>            → salva preset (Map tab)
```

---

## Configuração

`pixapro_config.json` (copia de `pixapro_config.example.json`):

```json
{
  "asset_root": "H:/Projects/ChapadaEscapade/assets/pixel_labs",
  "terrain_root": "H:/Projects/ChapadaEscapade/assets/terrain",
  "js_scan_root": "H:/Projects/ChapadaEscapade/js",
  "asset_url_base": "",
  "server_url": "http://localhost:8090",
  "linkedProjects": {
    "chapada-escapade": {
      "name": "Chapada Escapade",
      "path": "H:/Projects/ChapadaEscapade",
      "server_url": "http://localhost:8090",
      "maps_endpoint": "/maps",
      "asset_root": "H:/Projects/ChapadaEscapade/assets/pixel_labs",
      "terrain_root": "H:/Projects/ChapadaEscapade/assets/terrain"
    }
  }
}
```

`linkedProjects` permite múltiplos projetos com server URLs distintos.

Saves persistidos em `saves/` (gitignored).

---

## Status

PixaPro foi spinoff'ado de `H:/Projects/ChapadaEscapade/tools/pixapro/` em 2026-05-02. Cópia antiga deletada. Este é o **canonical**.

Roadmap em `PROJECT_INTEGRATION.md`.
