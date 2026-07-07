#!/usr/bin/env python3
"""
server.py — PixaPro UI server (static).

Serve a UI HTML/CSS/JS de PixaPro localmente. Pra dados (assets, maps, etc)
o frontend fala com o project_server.py de cada projeto-alvo (default 8090).

Uso:
  python server.py [port]    # default 8089

Endpoints (apenas):
  GET  /                  -> index.html (PixaPro UI)
  GET  /config.js         -> JS dinamico que injeta window.PIXAPRO_CFG
                              (lido do pixapro_config.json local)
  GET  /<qualquer arquivo> -> static (CSS, JS, imagens, docs)

Nada mais. Endpoints de dados (decisions, mcp_status, list_assets, etc)
viviam aqui no fork antigo do gallery_server.py mas foram removidos no
audit cleanup de 2026-05-02 — agora vivem no project_server.py de cada
projeto-alvo (responsabilidade clara).

Convencao de portas:
  8080 = projetos jogo (game canvas)
  8089 = PixaPro UI (este script)
  8090 = project server de cada projeto-alvo
"""

import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CFG_FILE = ROOT / "pixapro_config.json"
CONFIG = json.loads(CFG_FILE.read_text(encoding="utf-8")) if CFG_FILE.exists() else {}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # serve SEMPRE da pasta do PixaPro, não do cwd — senão rodar
        # `python H:/Projects/PixaPro/server.py` de outro projeto servia
        # os arquivos DESSE projeto (bug real: preview abriu o jogo)
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # CORS aberto pra dev local (PixaPro UI fala com project_server cross-origin)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        # Ferramenta de DEV: browser revalida sempre (304 barato em
        # localhost). Sem isso o Chrome cacheava js/ por heurística e
        # fixes novos não chegavam sem Ctrl+Shift+R ("não tá funcionando")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/config.js":
            self._serve_config_js()
            return
        super().do_GET()

    def _serve_config_js(self):
        """Gera config.js dinamico from pixapro_config.json.
        Em deploys static (Pages), o arquivo config.js committed substitui."""
        body = f"window.PIXAPRO_CFG = {json.dumps(CONFIG, ensure_ascii=False, indent=2)};\n"
        encoded = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/javascript")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8089
    if port == 8080:
        print("ERRO: porta 8080 reservada pra games. Use outra (default 8089).")
        sys.exit(1)
    if port == 8090:
        print("AVISO: porta 8090 e o padrao do project_server de cada projeto.")
        print("       Pode conflitar se algum projeto-alvo estiver rodando.")
    print(f"PixaPro UI at http://localhost:{port}/")
    print(f"  Config loaded from: {CFG_FILE}" if CFG_FILE.exists() else f"  No config file ({CFG_FILE.name}) -- using defaults")
    print(f"  Frontend faz fetch pro project server (default http://localhost:8090)")
    print(f"  Audit cleanup 2026-05-02: endpoints de dados removidos daqui.")
    server = ThreadingHTTPServer(("", port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
