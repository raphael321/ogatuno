"""Servidor local do site O Gatuno (sem cache, para ver alterações na hora)."""
import functools
import http.server
import sys


class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


porta = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
handler = functools.partial(SemCache, directory='site')
http.server.ThreadingHTTPServer(('', porta), handler).serve_forever()
