# PixaPro

Asset curation tool pra projetos com PixelLab MCP. Spinoff standalone do `tools/asset_gallery.html` do projeto Chapada Escapade.

## Setup

1. Copia o template de config e edita pros paths do projeto-pai:

   ```bash
   cp pixapro_config.example.json pixapro_config.json
   ```

   `pixapro_config.json`:
   ```json
   {
     "asset_root":   "H:/Projects/ChapadaEscapade/assets/pixel_labs",
     "terrain_root": "H:/Projects/ChapadaEscapade/assets/terrain",
     "js_scan_root": "H:/Projects/ChapadaEscapade/js",
     "asset_url_base": "",
     "server_url":   "http://localhost:8090"
   }
   ```

   Os paths apontam pro projeto que tem os assets. O `server.py` proxia
   `/assets/pixel_labs/*` e `/assets/terrain/*` direto desses diretórios — sem
   precisar de symlink.

2. Sobe o server:

   ```bash
   python server.py
   ```

3. Abre `http://localhost:8090` no browser.

## Features

- **Manager** — curadoria one-by-one (P/D/R/C)
- **Audit** — scan in-game assets via regex em `<js_scan_root>/**/*.js`
- **Editor** — visualizer 8-dir + queue MCP
- **Tiles** — Wang cr31 + auto-sort + compare biomes
- **Detail** — dashboard + MCP live polling

## Endpoints

- `GET  /` — UI (index.html)
- `GET  /config.js` — injeta `window.PIXAPRO_CFG` (lido pelo frontend)
- `GET  /list_assets` — varre o `asset_root`
- `GET  /scan_in_game_assets` — extrai refs `assets/pixel_labs/...` do `js_scan_root`
- `GET  /assets/pixel_labs/*` — proxy estático do `asset_root`
- `GET  /assets/terrain/*` — proxy estático do `terrain_root`
- `GET|POST /mcp_status`
- `GET|POST /pixellab_balance`
- `POST /save_decisions /save_configs /save_mcp_queue /save_wang_corrections /save_asset_tags`

Saves persistidos em `saves/` (gitignored).
