# PixaPro · Handoff de Migração (em progresso)

> Este arquivo é o **ponto de entrada da próxima sessão Claude Code**. Aponta este path quando abrir o projeto pra Claude pegar o contexto.

---

## Status atual

✅ **Fase 1 completa** (spinoff cópia simples) — feita em 2026-05-01 a partir do projeto-pai `H:/Projects/ChapadaEscapade`.

**Arquivos copiados:**
- `index.html` (renomeado de `tools/asset_gallery.html`, 22kb)
- `server.py` (renomeado de `tools/gallery_server.py`, 12kb) — **AINDA precisa adjustar paths internos**
- `styles/` — 7 arquivos: `base.css, components.css, detail.css, editor.css, gallery.css, manager.css, tiles.css`
- `js/` — 14 arquivos: `api.js, balance.js, classify.js, constants.js, popup.js, store.js, tab-detail.js, tab-editor.js, tab-gallery.js, tab-manager.js, tab-tiles.js, tabs.js, thumb.js, utils.js`

**O que ESTÁ funcional sem mudanças:**
- HTML carrega CSS de `styles/...` e JS de `js/...` (sem prefixo `pixapro/`)? **NÃO** — o HTML ainda referencia `pixapro/styles/...` e `pixapro/js/...`. Precisa rename ou ajuste no HTML.

🚧 **Fase 2 pendente** — ajustes pra ficar standalone:

---

## TODO list pra Sessão B (próxima Claude session no PixaPro)

### 1. Ajustar paths nos imports do HTML
Hoje `index.html` carrega:
```html
<link rel="stylesheet" href="pixapro/styles/base.css">
<script src="pixapro/js/constants.js"></script>
```
Precisa virar:
```html
<link rel="stylesheet" href="styles/base.css">
<script src="js/constants.js"></script>
```

**Como fazer rápido:**
```bash
sed -i 's|pixapro/styles/|styles/|g; s|pixapro/js/|js/|g' index.html
```

### 2. Ajustar `server.py` ROOT
Atualmente:
```python
ROOT = Path(__file__).resolve().parent.parent  # ← era /tools/, sobe pra projeto-pai
```
Precisa virar:
```python
ROOT = Path(__file__).resolve().parent  # ← agora é /PixaPro/ direto
```

### 3. Configurar asset_root externo
Hoje `server.py` faz `ROOT / "assets" / "pixel_labs"` (assume estrutura interna). Como standalone precisa apontar pro projeto-pai:

**Opção recomendada:** criar `pixapro_config.json` no root:
```json
{
  "asset_root": "H:/Projects/ChapadaEscapade/assets/pixel_labs",
  "terrain_root": "H:/Projects/ChapadaEscapade/assets/terrain",
  "js_scan_root": "H:/Projects/ChapadaEscapade/js"
}
```

Atualizar `server.py`:
```python
import json
CFG_FILE = ROOT / "pixapro_config.json"
CONFIG = json.loads(CFG_FILE.read_text()) if CFG_FILE.exists() else {}
ASSET_ROOT  = Path(CONFIG.get("asset_root", ROOT / "assets" / "pixel_labs"))
TERRAIN_ROOT = Path(CONFIG.get("terrain_root", ROOT / "assets" / "terrain"))
JS_SCAN_ROOT = Path(CONFIG.get("js_scan_root", ROOT / "js"))
```

Trocar referências:
- `handle_list_assets()`: `base = ROOT / "assets" / "pixel_labs"` → `base = ASSET_ROOT`
- `handle_scan_in_game_assets()`: `js_dir = ROOT / "js"` → `js_dir = JS_SCAN_ROOT`
- Web paths nos response: ajustar pra serem relativos OU absolutos do projeto-pai

⚠️ **Cuidado**: o frontend espera paths estilo `assets/pixel_labs/foo.png`. Se asset_root é externo, precisa decidir:
- (a) Ajustar URLs de imagem no frontend pra apontar pro projeto-pai (HTTP)
- (b) Manter paths idênticos e usar symlink: `ln -s H:/Projects/ChapadaEscapade/assets H:/Projects/PixaPro/assets`

**Recomendado:** **opção (b)** — symlink mantém compatibilidade total sem mudar 1 linha de frontend.

### 4. Criar `.gitignore`
```
__pycache__/
*.pyc
*.pyo
saves/
pixellab_secret.txt
.DS_Store
Thumbs.db
.vscode/
.idea/
node_modules/
pixapro_config.json
```

### 5. Criar `README.md` com instruções
```markdown
# PixaPro

Asset curation tool pra projetos com PixelLab MCP.

## Setup
1. `cp pixapro_config.example.json pixapro_config.json`
2. Edita `pixapro_config.json` apontando pros paths do projeto pai
3. `python server.py`
4. Abre http://localhost:8090 no browser

## Features
- Manager: curadoria one-by-one (P/D/R/C)
- Audit: scan in-game assets via regex em js/*.js
- Editor: visualizer 8-dir + queue MCP
- Tiles: Wang cr31 + auto-sort + compare biomes
- Detail: dashboard + MCP live polling
```

### 6. Smoke test
- `python server.py` sobe sem erro
- http://localhost:8090 abre PixaPro
- Audit tab mostra contagem correta
- Click thumb carrega no stage
- Decisões P/D/R salvam em `saves/decisions.json`
- Tiles tab mostra os 13 presets

### 7. Git init
```bash
git init
git add .
git commit -m "Initial spinoff from Chapada Escapade tools/"
# Criar repo no GitHub manualmente, depois:
git remote add origin git@github.com:zeroonebit/pixapro.git
git push -u origin main
```

---

## Decisões pendentes (input do user antes de Fase 3)

1. **Repo público ou privado?** Influencia se commitar config local vs example apenas.
2. **Multi-projeto?** Hoje single (Chapada). Pra multi:
   - `projects.json` com lista
   - Dropdown no header pra trocar contexto
   - Store keys scoped por projeto (`chapada_decisions`, `outroproj_decisions`)
3. **MANIFEST hardcoded ou dinâmico?** Hoje hardcoded em `js/constants.js`. Pra multi:
   - Endpoint `/manifest` lê `<project>/manifest.json` no asset_root
4. **Bookmarklet localhost?** Hardcoded `localhost:8090`. Pra deploy:
   - Configurável via config.json `server_url`
5. **Symlink vs HTTP?** Vide TODO #3.

---

## Arquivos a apontar na próxima sessão

Quando abrir Claude Code dentro de `H:/Projects/PixaPro/`, aponta esse arquivo:

```
@HANDOFF.md
```

Também útil:
- `index.html` — entrada do app, paths de import a corrigir
- `server.py` — endpoints a ajustar (`ROOT`, `ASSET_ROOT`, etc)
- `js/constants.js` — MANIFEST hardcoded (tem 68 entries do Chapada)
- `js/api.js` — `API_BASE` detection lógica
- `js/balance.js` — bookmarklet code (procura por `'http://localhost:8090'`)

---

## Refs externas (projeto-pai)

- **Repo origem:** https://github.com/zeroonebit/chapada-escapade
- **Doc original migração:** `H:/Projects/ChapadaEscapade/docs/PIXAPRO_HANDOFF.md` (251 linhas, contexto completo)
- **Skill handoff queue:** `~/.claude/skills/handoff-queue/SKILL.md`

---

*Doc criado: 2026-05-01. Atualize ao completar cada TODO.*
