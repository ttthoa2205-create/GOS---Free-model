import http.server, socketserver, os

os.chdir('/tmp/gd')
PORT = 8799

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Avoid stale caching during dev (script tags also use ?v= busters)
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    def log_message(self, *args):
        pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    httpd.serve_forever()
