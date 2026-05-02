# PixaPro · Handoff — DONE (histórico)

> ⚠️ **Este doc é histórico.** O spinoff de `H:/Projects/ChapadaEscapade/tools/asset_gallery.html` pra repo standalone foi completado em 2026-05-02.

## Status

✅ **Spinoff completo.** Todos os TODOs originais foram executados:
- ✅ Imports do HTML ajustados (sem prefixo `pixapro/`)
- ✅ `server.py` standalone (ROOT, ASSET_ROOT via config)
- ✅ `pixapro_config.json` + `pixapro_config.example.json`
- ✅ `.gitignore` configurado
- ✅ `README.md` reescrito
- ✅ Smoke tests passaram
- ✅ Git inicializado e pushado
- ✅ Cópia stale em `Chapada/tools/pixapro/` deletada (audit cleanup 2026-05-02)
- ✅ `gallery_server.py` no Chapada renomeado pra `project_server.py` (refletir papel real)

## Próximos passos vivem em outros docs

- 📘 **[PROJECT_INTEGRATION.md](PROJECT_INTEGRATION.md)** — como conectar projetos novos ao PixaPro (arquitetura, endpoints, schema do map JSON, storage layout, exemplo JS, princípios, roadmap)
- 📋 **[ASSET_NAMING_STANDARD.md](ASSET_NAMING_STANDARD.md)** — convenção universal de assets (chars/items/hud/env/terrain/fx/ui), naming rules, direcionais, anims, tilesets cr31, auto-classify regex, migration checklist
- 📝 **[README.md](README.md)** — quick start + lista de tabs + endpoints

## Convenção de portas (final)

| Porta | Quem |
|---|---|
| 8080 | Game canvas |
| 8089 | PixaPro UI (este server) |
| 8090 | Project server do projeto-alvo |

---

*Migration completa em 2026-05-02. Mantido pra histórico — não tem TODO ativo aqui.*
