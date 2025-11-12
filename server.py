#!/usr/bin/env python3
"""
Simple HTTP server for MDP Simulator
Run this script and open http://localhost:8000 in your browser
"""

import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"")
    print(f"╔══════════════════════════════════════════════════════════╗")
    print(f"║     MDP Simulator Server Running                         ║")
    print(f"╚══════════════════════════════════════════════════════════╝")
    print(f"")
    print(f"  🌐 Open your browser and navigate to:")
    print(f"")
    print(f"     http://localhost:{PORT}")
    print(f"")
    print(f"  Press Ctrl+C to stop the server")
    print(f"")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n\n  Server stopped.")
