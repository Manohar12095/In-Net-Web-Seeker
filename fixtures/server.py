# fixtures/server.py   ·   python fixtures/server.py 9001
import sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HTML = b"""<!doctype html><title>Fixture</title><link rel=stylesheet href="/app.css">
<script src="/app.js"></script><img src="/logo.svg"><a href="/about">about</a>
<a href="/redir">redir</a><a href="/loop">loop</a><a href="/big.bin">big</a>
<a href="/limited">429</a><a href="/to-metadata">metadata</a>"""
ROUTES = {
    "/": ("text/html", HTML),
    "/about": ("text/html", b"<title>About</title><a href='/'>home</a>"),
    "/app.css": ("text/css", b"@import '/extra.css'; body{background:url(/logo.svg)}"),
    "/extra.css": ("text/css", b"h1{color:red}"),
    "/app.js": ("text/javascript", b"console.log('hi')"),
    "/logo.svg": ("image/svg+xml", b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"),
}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, code, ctype, body, headers=()):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in headers:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        p = self.path.split("?")[0]
        if p in ROUTES:       return self._send(200, *ROUTES[p])
        if p == "/redir":     return self._send(302, "text/plain", b"", [("Location", "/about")])
        if p == "/loop":      return self._send(302, "text/plain", b"", [("Location", "/loop")])
        if p == "/to-metadata": return self._send(302, "text/plain", b"", [("Location", "http://169.254.169.254/latest/meta-data/")])
        if p == "/limited":   return self._send(429, "text/plain", b"slow down", [("Retry-After", "1")])
        if p == "/slow":      time.sleep(20); return self._send(200, "text/plain", b"late")
        if p == "/big.bin":   return self._send(200, "application/octet-stream", b"0" * 30_000_000)
        self._send(404, "text/plain", b"nope")


ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 9001), H).serve_forever()
