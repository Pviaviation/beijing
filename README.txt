BEIJING 2026 — FIXED PWA/SUPABASE SHELL

UPLOAD ONCE AND KEEP:
- index.html
- manifest.json
- service-worker.js
- icon-180.png
- icon-192.png
- icon-512.png

THE ONLY FILE YOU NORMALLY REPLACE LATER:
- app.html

How it works:
1. index.html loads the latest app.html.
2. Before app.html executes, index.html injects a compatibility bridge.
3. The existing app may continue to call the old GitHub sync functions, but those calls are redirected to Supabase.
4. Shared state is stored in Supabase; no GitHub token is required on any phone.
5. Photo uploads are redirected to the Supabase Storage bucket trip-photos.
6. The service worker maps the app's old /data/photos/... image URLs to Supabase automatically.
7. app.html remains the editable content file.

Important compatibility note:
This lets you replace app.html without manually adding Supabase code, PROVIDED future versions remain based on the same BEIJING app structure and continue using the current shared-state/photo functions. If a future generator completely rewrites the app architecture or removes those functions/local state conventions, the fixed shell may need one compatibility update.

Offline:
- Last successfully loaded app.html is cached.
- Notes/choices still save locally in the app when offline and retry cloud sync later.
- Previously viewed shared photos can be cached.
- New photo upload requires internet.

Xiaohongshu/RedNote:
Supabase does not repair expired or invalid Xiaohongshu share links. That is a separate deep-link issue.
