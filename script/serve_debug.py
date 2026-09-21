#!/usr/bin/env python
# input: repository directory and TCP port from serve-debug.sh.
# output: no-cache HTTP static file server for Tampermonkey @require URLs.
# pos: local userscript debugging helper behind Local_Debug_Loader.user.js.
import argparse
import functools
import http.server
import socketserver


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description='Serve userscripts for Tampermonkey local debug.')
    parser.add_argument('port', type=int, nargs='?', default=8787)
    parser.add_argument('--directory', default='.')
    args = parser.parse_args()
    handler = functools.partial(NoCacheHandler, directory=args.directory)
    with socketserver.TCPServer(('127.0.0.1', args.port), handler) as httpd:
        httpd.serve_forever()


if __name__ == '__main__':
    main()
