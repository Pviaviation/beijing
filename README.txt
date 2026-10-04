BEIJING 2026 — INDEPENDENT PWA

Keep these files unchanged:
- index.html
- manifest.json
- service-worker.js
- icon-180.png
- icon-192.png
- icon-512.png

The only file you replace whenever Claude gives you a new standalone HTML:
- app.html

Workflow:
1. Download/export the latest standalone HTML from Claude.
2. Rename it to app.html.
3. Upload app.html to the GitHub repository and replace the old app.html.
4. Do NOT replace index.html.
5. Open https://pviaviation.github.io/beijing/
6. The Home Screen app remains BEIJING 2026 with the same icon.

The service worker uses network-first for app.html so new versions are preferred.
