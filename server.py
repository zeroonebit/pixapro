#!/usr/bin/env python3
"""
gallery_server.py — Servidor estático + endpoint POST /save_decisions

Uso:
  python tools/gallery_server.py [port]

Substitui `python -m http.server 8080` adicionando:
  POST /save_decisions  → grava JSON em tools/saves/decisions.json
                          + cópia timestamped em tools/saves/history/
"""

import json
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CFG_FILE = ROOT / "pixapro_config.json"
CONFIG = json.loads(CFG_FILE.read_text(encoding="utf-8")) if CFG_FILE.exists() else {}
ASSET_ROOT   = Path(CONFIG.get("asset_root",   ROOT / "assets" / "pixel_labs"))
TERRAIN_ROOT = Path(CONFIG.get("terrain_root", ROOT / "assets" / "terrain"))
JS_SCAN_ROOT = Path(CONFIG.get("js_scan_root", ROOT / "js"))
ASSET_URL_BASE = CONFIG.get("asset_url_base", "")  # ex: "http://localhost:8091" pra servir assets do projeto-pai
SERVER_URL   = CONFIG.get("server_url", "http://localhost:8090")
SAVES_DIR = ROOT / "saves"
HISTORY_DIR = SAVES_DIR / "history"
_mcp_jobs = {}  # in-memory: {id: {id, type, description, status, result, ts}}
_balance_cache = {"data": None, "ts": 0}  # populado pelo bookmarklet via POST /pixellab_balance

# Carrega saldo persistido do disk (sobrevive restart)
_balance_path = SAVES_DIR / "pixellab_balance.json"
if _balance_path.exists():
    try:
        _balance_cache["data"] = json.loads(_balance_path.read_text(encoding="utf-8"))
    except Exception:
        pass

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    SAVE_ENDPOINTS = {
        "/save_decisions": "decisions",
        "/save_configs": "configs",
        "/save_mcp_queue": "mcp_queue",
        "/save_wang_corrections": "wang_corrections",
        "/save_asset_tags": "asset_tags",
    }

    def do_GET(self):
        if self.path == "/list_assets":
            self.handle_list_assets()
            return
        if self.path == "/mcp_status":
            self.handle_get_mcp_status()
            return
        if self.path == "/pixellab_balance":
            self.handle_pixellab_balance()
            return
        if self.path == "/scan_in_game_assets":
            self.handle_scan_in_game_assets()
            return
        if self.path == "/config":
            self.handle_get_config()
            return
        if self.path == "/config.js":
            self.handle_get_config_js()
            return
        # Proxy estático: /assets/pixel_labs/* → ASSET_ROOT, /assets/terrain/* → TERRAIN_ROOT
        if self.path.startswith("/assets/pixel_labs/"):
            self._serve_external(ASSET_ROOT, self.path[len("/assets/pixel_labs/"):])
            return
        if self.path.startswith("/assets/terrain/"):
            self._serve_external(TERRAIN_ROOT, self.path[len("/assets/terrain/"):])
            return
        super().do_GET()

    def _serve_external(self, root, sub):
        from urllib.parse import unquote
        sub = unquote(sub.split("?", 1)[0].split("#", 1)[0])
        # Bloqueia path traversal
        target = (root / sub).resolve()
        try:
            target.relative_to(root.resolve())
        except ValueError:
            self.send_error(403, "Forbidden")
            return
        if not target.exists() or not target.is_file():
            self.send_error(404, "Not found")
            return
        try:
            data = target.read_bytes()
        except Exception as e:
            self.send_error(500, str(e))
            return
        ctype = "image/png" if target.suffix.lower() == ".png" else "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def handle_get_config(self):
        """Expõe config pública pro frontend (server_url, asset_url_base)."""
        self._send_json({
            "server_url": SERVER_URL,
            "asset_url_base": ASSET_URL_BASE,
        })

    def handle_get_config_js(self):
        """Mesma config como módulo JS — populado em window.PIXAPRO_CFG antes dos outros scripts."""
        payload = json.dumps({
            "server_url": SERVER_URL,
            "asset_url_base": ASSET_URL_BASE,
        })
        body = (f"window.PIXAPRO_CFG = {payload};").encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/javascript")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_scan_in_game_assets(self):
        """Verifica COM CONFIANÇA quais PNGs em assets/pixel_labs/ são realmente
        carregados pelo código js/. Lê todos os .js, extrai strings que apontam
        pra assets/pixel_labs/... (literal ou template), e pra cada PNG em disk
        retorna {path: bool} onde true = referenciado.

        Templates como `assets/pixel_labs/chars/${char}/${dir}.png` são tratados
        como prefix matchers — qualquer PNG sob esse prefixo (com qualquer subpath)
        conta como referenciado. Por isso a precisão é melhor que grep simples.
        """
        import re
        js_dir = JS_SCAN_ROOT
        if not js_dir.exists():
            self._send_json({"error": "no_js_dir"}, status=500)
            return

        # Concatena todos os .js
        all_js = ""
        js_files = list(js_dir.rglob("*.js"))
        for jf in js_files:
            try:
                all_js += "\n" + jf.read_text(encoding="utf-8")
            except Exception:
                pass

        # Padrões pra extrair paths assets/pixel_labs/...
        # Literais simples ou compostos com ${...}
        # Capture até o primeiro caractere fechador ou interpolação
        # Regex: assets/pixel_labs/<anything not quote/backtick/parens/space>
        # Pra templates, vamos extrair tanto literal quanto prefix-with-vars
        pat_literal  = re.compile(r"['\"`](assets/pixel_labs/[^'\"`]+\.png)['\"`]")
        pat_template = re.compile(r"['\"`](assets/pixel_labs/[^'\"`]*\$\{[^}]+\}[^'\"`]*\.png)['\"`]")

        literal_paths = set(m.group(1) for m in pat_literal.finditer(all_js))
        templates = set(m.group(1) for m in pat_template.finditer(all_js))

        # Converte cada template em regex específica:
        # 'assets/pixel_labs/chars/${char}/${dir}.png' →
        # '^assets/pixel_labs/chars/[^/]+/[^/]+\.png$'
        # ${var} é tratado como [^/]+ (path component, não cruza /).
        template_regexes = []
        for tpl in templates:
            esc = re.escape(tpl)
            # \$\{...\} → [^/]+
            rgx = re.sub(r'\\\$\\\{[^}]+\\\}', r'[^/]+', esc)
            try:
                template_regexes.append(re.compile('^' + rgx + '$'))
            except re.error:
                pass

        # Lista PNGs em disco
        base = ASSET_ROOT
        result = {}
        if base.exists():
            for p in base.rglob("*.png"):
                rel = "assets/pixel_labs/" + p.relative_to(ASSET_ROOT).as_posix()
                in_game = False
                if rel in literal_paths:
                    in_game = True
                else:
                    for rgx in template_regexes:
                        if rgx.match(rel):
                            in_game = True
                            break
                result[rel] = in_game

        total = len(result)
        in_game_count = sum(1 for v in result.values() if v)
        self._send_json({
            "total": total,
            "in_game": in_game_count,
            "not_in_game": total - in_game_count,
            "paths": result,
            "stats": {
                "literal_paths": len(literal_paths),
                "templates": len(templates),
                "js_files_scanned": len(js_files),
            }
        })

    def handle_pixellab_balance(self):
        """Retorna o último saldo postado via POST /pixellab_balance (bookmarklet).
        Saldo é populado pelo bookmarklet rodando na página pixellab.ai/account
        (usa session cookies do user, nada de tokens armazenados no servidor)."""
        if not _balance_cache["data"]:
            self._send_json({
                "error": "no_data",
                "msg": "Saldo ainda não foi capturado. Vá em pixellab.ai/account e use o bookmarklet PixaPro Balance.",
            }, status=404)
            return
        self._send_json(_balance_cache["data"])

    def handle_post_pixellab_balance(self):
        """Recebe saldo postado pelo bookmarklet rodando em pixellab.ai/account.
        Body esperado: { used: 812, total: 2000, plan: "Tier 1: Pixel Apprentice",
                         resets: "May 26", credits_usd: 0.0 }"""
        import time
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            self.send_error(400, f"JSON invalido: {e}")
            return
        data["fetched_at"] = datetime.now().isoformat()
        _balance_cache["data"] = data
        _balance_cache["ts"] = time.time()
        # Persistir pra sobreviver restart do server
        try:
            SAVES_DIR.mkdir(parents=True, exist_ok=True)
            with open(SAVES_DIR / "pixellab_balance.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[balance] warn: persist falhou: {e}")
        self._send_json({"ok": True, "saved": data})
        used = data.get("used", "?")
        total = data.get("total", "?")
        print(f"[balance] {used}/{total} ({data.get('plan', '?')})")

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def handle_get_mcp_status(self):
        jobs = list(_mcp_jobs.values())
        jobs.sort(key=lambda j: j.get("ts", ""), reverse=True)
        msg = json.dumps(jobs)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(msg.encode("utf-8"))

    def handle_list_assets(self):
        base = ASSET_ROOT
        result = {"filesystem": [], "orphans": []}
        if base.exists():
            for p in base.rglob("*.png"):
                rel = "assets/pixel_labs/" + p.relative_to(ASSET_ROOT).as_posix()
                # path servido pelo PixaPro server (proxy estático em /assets/pixel_labs/*)
                webpath = rel
                result["filesystem"].append({"path": webpath, "abs": rel})
        msg = json.dumps(result)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(msg.encode("utf-8"))

    def handle_post_mcp_status(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            self.send_error(400, f"JSON invalido: {e}")
            return
        job_id = data.get("id")
        if not job_id:
            self.send_error(400, "Campo 'id' obrigatorio")
            return
        data.setdefault("ts", datetime.now().isoformat())
        _mcp_jobs[job_id] = data
        SAVES_DIR.mkdir(parents=True, exist_ok=True)
        mcp_path = SAVES_DIR / "mcp_live.json"
        with open(mcp_path, "w", encoding="utf-8") as f:
            json.dump(list(_mcp_jobs.values()), f, indent=2, ensure_ascii=False)
        msg = json.dumps({"ok": True, "job_id": job_id, "status": data.get("status", "unknown")})
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(msg.encode("utf-8"))
        st = data.get("status", "?")
        desc = data.get("description", "")
        print(f"[mcp] {st.upper()} {job_id[:8]}... {desc}")

    def do_POST(self):
        if self.path == "/mcp_status":
            self.handle_post_mcp_status()
            return
        if self.path == "/pixellab_balance":
            self.handle_post_pixellab_balance()
            return
        if self.path == "/mcp_clear":
            _mcp_jobs.clear()
            mcp_path = SAVES_DIR / "mcp_live.json"
            if mcp_path.exists():
                mcp_path.write_text("[]", encoding="utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true,"cleared":true}')
            print("[mcp] CLEARED all jobs")
            return
        if self.path not in self.SAVE_ENDPOINTS:
            self.send_error(404, "Not found")
            return
        kind = self.SAVE_ENDPOINTS[self.path]

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            self.send_error(400, f"JSON invalido: {e}")
            return

        SAVES_DIR.mkdir(parents=True, exist_ok=True)
        HISTORY_DIR.mkdir(parents=True, exist_ok=True)

        main_path = SAVES_DIR / f"{kind}.json"
        with open(main_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        history_path = HISTORY_DIR / f"{kind}_{ts}.json"
        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        count = len(data) if isinstance(data, (dict, list)) else 0
        msg = json.dumps({"ok": True, "count": count, "saved_to": str(main_path.relative_to(ROOT)).replace("\\", "/"), "history": str(history_path.relative_to(ROOT)).replace("\\", "/")})
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(msg.encode("utf-8"))
        print(f"[save] {kind}: {count} keys → {main_path.relative_to(ROOT)} (+ history)")


def main():
    # 8080 = projetos jogo. 8090 = project server (gallery_server.py do projeto host).
    # PixaPro UI roda em 8089 por default. Override com [port] se precisar.
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8089
    if port == 8080:
        print("ERRO: porta 8080 reservada pra games. Use outra (default 8089).")
        sys.exit(1)
    if port == 8090:
        print("AVISO: porta 8090 e o padrao do project server (gallery_server.py).")
        print("       Pode conflitar se Chapada Escapade tambem estiver rodando.")
    print(f"Serving {ROOT} at http://localhost:{port}")
    print(f"  PixaPro: http://localhost:{port}/")
    print(f"  Assets:  {ASSET_ROOT}")
    print(f"  Terrain: {TERRAIN_ROOT}")
    print(f"  JS scan: {JS_SCAN_ROOT}")
    print(f"  Endpoints: GET /config, GET /list_assets, GET /scan_in_game_assets,")
    print(f"             POST /save_decisions /save_configs /save_mcp_queue,")
    print(f"             GET|POST /mcp_status, GET|POST /pixellab_balance")
    print(f"  Saves:   {SAVES_DIR.relative_to(ROOT)}/")
    server = ThreadingHTTPServer(("", port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")

if __name__ == "__main__":
    main()
