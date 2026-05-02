# Asset Naming Standard

Convenção universal de nomeação/organização de assets pra projetos que usam PixaPro.

PixaPro usa esta convenção pra:
- Auto-classificar assets via scan (`GET /scan_assets`)
- Sugerir renames pra arquivos fora do padrão
- Aplicar renames em batch (`POST /apply_renames`)
- Indexar/buscar assets na UI (filtros por tipo, biome, variante)

Cada projeto pode estender com namespaces próprios — esta é a base mínima.

---

## 1. Estrutura de pastas (root: `assets/`)

```
assets/
├── chars/                     # Personagens com directional sprites + anims
│   └── <char_name>/
│       ├── <DIR>.png          # Static directional (8-dir: N/NE/E/SE/S/SW/W/NW; 4-dir: N/E/S/W)
│       └── anims/
│           └── <anim_name>/
│               └── <DIR>/
│                   └── frame_NNN.png
│
├── items/                     # Pickup-ables, projetis, consumiveis
│   └── <category>/
│       └── <item_name>.png    # ex: items/burger/burger_classic.png
│
├── hud/                       # Interface 2D (boxes, bars, frames, icons)
│   └── <element>_<variant>.png   # ex: hud/score_v2.png, hud/bar_fuel_full.png
│
├── env/                       # Cenário (rocks, vegetation, fences, props)
│   └── <category>/
│       └── <name>_<variant>.png  # ex: env/rocks/boulder_red_cluster.png
│
├── terrain/                   # Tilesets wang (cr31)
│   └── <style_name>/             # ex: terrain/dirt_grass_32/
│       ├── wang_NN.png           # 16 tiles, NN = 00..15 (cr31 bits)
│       └── _tileset.png          # original meta image (opcional)
│
├── fx/                        # VFX overlays, particles, beams (single sprites)
│   └── <fx_name>.png
│
└── ui/                        # Splashes, telas, logos
    └── <name>.png
```

---

## 2. Naming rules

### 2.1 Princípios
- **lowercase + snake_case**: `boulder_red_cluster.png`, NOT `BoulderRedCluster.png`
- **ASCII apenas**: sem acentos. `combustivel`, NOT `combustível`
- **EN preferred** pra novos assets, **PT legacy preservado** se já tem refs no código
- **Nunca espaços ou hífen-como-separador** entre conceitos: `_` separa, `-` reservado pra "esquerda/direita" tipo `low-left`

### 2.2 Versionamento
Quando regenerar/melhorar um asset existente:
- Sufixo `_v2`, `_v3` etc no nome do arquivo
- **Não** apague o original — mova pra `_old_<reason>/` (ex: `_old_4dir/`)
- Update o código pra apontar pro novo

### 2.3 Variantes (mesma identidade, look diferente)
- Sufixo descritivo: `cactus_dead_dry.png`, `cactus_dead_vine.png`
- Cor: `scarecrow_droid_red.png`, `scarecrow_droid_blue.png`
- Tamanho: `_small`, `_medium`, `_large`, `_tall`
- Estado: `_empty`, `_full`, `_open`, `_closed`, `_broken`

### 2.4 Direcionais (chars)
- 8-dir canonical: `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`
- 4-dir: `N`, `E`, `S`, `W`
- Em static: arquivo direto na pasta do char: `chars/cow/south.png` ou `chars/cow/S.png` (escolher 1 padrão)
  - **Recomendado**: nomes longos (`south.png`) pra static, abreviados (`S/`) pra anim subfolders

### 2.5 Animações
- Pasta: `anims/<anim_name>/<DIR>/frame_NNN.png` (3 dígitos sempre)
- Anim names lowercase + snake_case: `walk`, `run`, `idle_head_shake`, `lie_down`, `attack`
- Frame count uniforme dentro do mesmo anim/dir

### 2.6 Tilesets (terrain)
- Folder name = style ID: `<biome>_<sub_biome>_<size>` ex: `dirt_grass_32`, `mapa1_ocean_sand`
- Files: `wang_NN.png` onde NN = `00..15`
- Bits cr31: `NW=1, NE=2, SE=4, SW=8`
- `wang_00.png` = all-lower, `wang_15.png` = all-upper
- Opcional: `_tileset.png` (montagem original do PixelLab) + `_montage.png` (preview grid)

---

## 3. Categorias canonicais

PixaPro classifica cada asset em **1 dessas categorias** baseado no path. Categorias = top-level folders (`chars`, `items`, etc).

### 3.1 `chars/`
**O que vai aqui:** entidades vivas/animadas do mundo (cow, ox, farmer, ufo, scarecrow, npc, boss). Tudo que tem direção + idle/walk/anims.

**Não vai aqui:** props parados (vão em `env/`), pickups (vão em `items/`).

Subfolder por personagem. Cada char tem `<DIR>.png` (static) + `anims/`.

### 3.2 `items/`
**O que vai aqui:** burger, gas_can, ammo, key, coin, bucket — coisas que o player pega/usa.

Subfolder por categoria (`burger/`, `currency/`, `consumable/`).

Naming: `<category>_<variant>.png` — ex: `burger_classic.png`, `burger_cheese.png`.

### 3.3 `hud/`
**O que vai aqui:** elementos da interface — score box, bars (fuel/health/mana), minimap frame, score icons, status icons.

Naming pattern (livre escolha por projeto):
- `<element>_<state>.png` — `bar_fuel_empty.png`, `bar_fuel_full.png`
- `<element>_<variant>.png` — `box_score_v2.png`
- Combinados: `combined_hud_empty_nameless.png`

### 3.4 `env/`
**O que vai aqui:** cenário estático. Rocks, vegetação, cercas, placas, prédios, props decorativos.

Subfolder por categoria:
- `rocks/`, `vegetation/`, `fences/`, `signs/`, `objects/` (props grandes), `misc/`

### 3.5 `terrain/`
**O que vai aqui:** tilesets wang sliceados, prontos pra renderização com `wang_NN.png`.

Cada style = uma subfolder. Diferentes biomes/temáticas = diferentes styles.

### 3.6 `fx/`
**O que vai aqui:** sprites de efeito visual — beam, halo, glow, smoke, particle base, sparkle.

Sem subfolders (geralmente single-frame). Anims de FX podem ir em `fx/anims/<name>/frame_NNN.png` se necessário.

### 3.7 `ui/`
**O que vai aqui:** telas (splash, game over, vitória), logos, ícones de marca.

Sem subfolders.

---

## 4. Metadata: `_meta.json` por asset (opcional)

Pra assets críticos ou difíceis de auto-classificar, criar arquivo paralelo `<name>.meta.json`:

```json
{
  "category": "env/objects",
  "tags": ["building", "rural", "wooden"],
  "biome": "cerrado-verde",
  "scale_hint": 1.5,
  "in_game": true,
  "source": "pixellab",
  "source_id": "abc123def456",
  "notes": "Spawn em clusters de 1-3 unidades"
}
```

PixaPro lê esses meta files no scan e enriquece a tag list. Se não existir, cai pro auto-classify por path.

---

## 5. Auto-classify rules (PixaPro)

PixaPro usa regex contra o path pra inferir categoria:

| Path pattern | Categoria | Tags inferidas |
|---|---|---|
| `chars/<X>/<DIR>.png` | char_static | char=X, dir=DIR |
| `chars/<X>/anims/<A>/<DIR>/frame_NNN.png` | char_anim_frame | char=X, anim=A, dir=DIR, frame=NNN |
| `chars/nature/<sub>/...` | env_<sub> | (nature reclassificado pra env) |
| `items/<cat>/<X>.png` | item | category=cat, name=X |
| `hud/...` | hud | (variant/state extraídos do nome) |
| `terrain/<style>/wang_NN.png` | wang_tile | style=style, bits=NN |
| `fx/...` | fx | |
| `ui/...` | ui | |

Caso ambíguo (ex: `chars/nature/objects/`), o path tem PESO maior que conteúdo do arquivo. Resolver via mover pra `env/objects/`.

---

## 6. Migration checklist (projetos legacy)

Pra projetos que já têm assets sem seguir esta convenção:

### Passo 1: Audit
```
GET http://localhost:8090/scan_assets
```

Retorna:
```json
{
  "total": 1234,
  "classified": 987,
  "unclassified": 247,
  "suggestions": [
    {"from": "assets/old/cow.png", "to": "assets/chars/cow/south.png", "confidence": 0.85},
    ...
  ]
}
```

### Passo 2: Review na UI
Aba **Audit** do PixaPro mostra os 247 sem classificação + sugestões. Cada item: aceitar/editar/ignorar.

### Passo 3: Apply
```
POST http://localhost:8090/apply_renames
  body: [{"from": "...", "to": "..."}, ...]
```

Server move arquivos no disk + cria backup em `tools/saves/asset_rename_backup_<ts>/`.

### Passo 4: Update code refs
Server roda `scan_in_game_assets` pra detectar quais JS files referenciam paths antigos. Lista pra dev fazer search/replace manual.

---

## 7. Naming examples (Chapada Escapade reference)

**Bom:**
```
chars/cow/south.png                         ← static directional, claro
chars/cow/anims/walk/S/frame_000.png        ← anim frame, hierarquia limpa
chars/farmer/anims/running/E/frame_002.png  ← consistente
items/burger/burger_classic.png             ← items/<cat>/<variant>
items/burger/burger_cheese.png
hud/bar_fuel_empty.png                      ← hud/<elemento>_<estado>
hud/box_score_v2.png                        ← versão explicitada
env/rocks/boulder_red_cluster.png           ← env/<cat>/<descricao>
env/vegetation/cactus_dead_dry.png
env/fences/fence_curved_long.png
terrain/dirt_grass_32/wang_05.png           ← terrain/<style>/wang_NN
fx/beam_halo.png                            ← single fx sprite
ui/splash_v3.png                            ← tela
```

**Ruim:**
```
chars/cow/Cow_S.PNG                         ← caps + extensão maiúscula
chars/vaca/sul.png                          ← PT no path (legacy ok, novo não)
hud/SCORE BOX.png                           ← espaços
items/burgers.png                           ← muito vago
chars/cow_animation_walk_south_0.png        ← anim flat ao invés de hierárquico
env/stuff/thing1.png                        ← sem categoria clara
```

---

## 8. Project-specific extensions

Cada projeto pode adicionar regras próprias em `<project>/asset_naming.json`:

```json
{
  "extends": "PixaPro/ASSET_NAMING_STANDARD.md",
  "additional_categories": {
    "vehicles": "chars/vehicles/<name>/...",
    "music": "audio/music/<track>.ogg",
    "sfx": "audio/sfx/<category>/<name>.ogg"
  },
  "biome_tags": ["cerrado-verde", "cerrado-seco", "ocean"],
  "season_tags": ["chuva", "seca", "universal"]
}
```

PixaPro lê esse JSON via `GET /asset_naming` no project server e usa pra extender a UI de filtros.

---

## 9. Roadmap

- [x] Estrutura base de pastas
- [x] Naming rules
- [ ] Endpoint `/scan_assets` no project_server.py
- [ ] Endpoint `/apply_renames` com backup automático
- [ ] PixaPro UI: aba **Audit** mostrando unclassified + sugestões
- [ ] PixaPro UI: aba **Browse** com filtros por categoria/tag/biome
- [ ] Validation no commit hook (pre-commit) que rejeita PNGs fora do padrão

---

*Última atualização: 2026-05-02*
