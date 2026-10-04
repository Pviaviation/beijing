BEIJING 2026 — FIXED SHELL v2

This version fixes the blank-page issue in the previous shell.
The prior version loaded the 16+ MB standalone app through iframe srcdoc.
This version loads app.html normally by URL and moves the Supabase compatibility
bridge into the service worker.

UPLOAD ALL FILES ONCE:
- index.html
- service-worker.js
- manifest.json
- icon-180.png
- icon-192.png
- icon-512.png
- app.html

LATER:
Normally replace only app.html.

Important:
After uploading this v2 package, hard-refresh the site.
If the previous blank shell is still cached, open:
https://pviaviation.github.io/beijing/?v=4
and refresh once. The new service worker will activate and then normal URL works.
