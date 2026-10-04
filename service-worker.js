const SHELL_CACHE = 'beijing-2026-shell-v5';
const PHOTO_CACHE = 'beijing-2026-photos-v2';

const SUPABASE_URL = 'https://kwtprdxdoofblazaqcgc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FO6Hi9QrGuVQ2UAfeqiFLw_76T7IoCp';
const TRIP_ID = 'beijing-2026';
const STATE_KEY = '__github_state__';

const SHELL = [
  './index.html',
  './app.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async cache => {
      // Don't fail installation if one large asset is temporarily unavailable.
      for (const u of SHELL) {
        try { await cache.add(u); } catch (_) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k =>
          (k.startsWith('beijing-2026-shell-') && k !== SHELL_CACHE) ||
          (k.startsWith('beijing-2026-photos-') && k !== PHOTO_CACHE)
        ).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function sbHeaders(extra) {
  return Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY
  }, extra || {});
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function utf8ToB64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function b64ToUtf8(b64) {
  const bin = atob(String(b64 || '').replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function b64ToBytes(b64) {
  const bin = atob(String(b64 || '').replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getStateRow() {
  const u = SUPABASE_URL +
    '/rest/v1/trip_notes?trip_id=eq.' + encodeURIComponent(TRIP_ID) +
    '&place_id=eq.' + encodeURIComponent(STATE_KEY) +
    '&select=id,note,updated_at&order=updated_at.desc&limit=1';

  const r = await fetch(u, { headers: sbHeaders(), cache: 'no-store' });
  if (!r.ok) throw new Error('State read ' + r.status);
  const rows = await r.json();
  return rows && rows[0] ? rows[0] : null;
}

async function saveState(jsonText, expectedSha) {
  const current = await getStateRow();

  if (expectedSha && current && expectedSha !== current.updated_at) {
    return { conflict: true };
  }

  const del = SUPABASE_URL +
    '/rest/v1/trip_notes?trip_id=eq.' + encodeURIComponent(TRIP_ID) +
    '&place_id=eq.' + encodeURIComponent(STATE_KEY);

  const dr = await fetch(del, {
    method: 'DELETE',
    headers: sbHeaders({ Prefer: 'return=minimal' })
  });
  if (!dr.ok) throw new Error('State delete ' + dr.status);

  const now = new Date().toISOString();
  const ir = await fetch(SUPABASE_URL + '/rest/v1/trip_notes', {
    method: 'POST',
    headers: sbHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify({
      trip_id: TRIP_ID,
      day: 0,
      place_id: STATE_KEY,
      note: jsonText,
      updated_at: now
    })
  });

  if (!ir.ok) throw new Error('State write ' + ir.status);
  const rows = await ir.json();
  return {
    conflict: false,
    sha: (rows && rows[0] && rows[0].updated_at) || now
  };
}

async function uploadPhoto(path, content) {
  const bytes = b64ToBytes(content);
  const storagePath = path.split('/').map(encodeURIComponent).join('/');
  const u = SUPABASE_URL + '/storage/v1/object/trip-photos/' + storagePath;

  const r = await fetch(u, {
    method: 'POST',
    headers: sbHeaders({
      'Content-Type': 'image/jpeg',
      'x-upsert': 'false'
    }),
    body: bytes
  });

  if (!r.ok) throw new Error('Photo upload ' + r.status);

  try {
    const publicUrl =
      SUPABASE_URL + '/storage/v1/object/public/trip-photos/' + storagePath;

    const slotMatch = path.match(/^data\/photos\/(.+?)-\d+\.jpg$/);
    const slot = slotMatch ? slotMatch[1] : 'shared';

    await fetch(SUPABASE_URL + '/rest/v1/trip_photos', {
      method: 'POST',
      headers: sbHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      }),
      body: JSON.stringify({
        trip_id: TRIP_ID,
        day: 0,
        place_id: slot,
        photo_url: publicUrl,
        file_path: path,
        uploaded_at: new Date().toISOString()
      })
    });
  } catch (_) {}
}

async function handleGithubCompat(req, url) {
  const m = url.pathname.match(
    /^\/repos\/Pviaviation\/beijing\/contents\/(.+)$/
  );
  if (!m) return null;

  const path = decodeURIComponent(m[1]);
  const method = req.method.toUpperCase();

  if (path === 'data/state.json' && method === 'GET') {
    const row = await getStateRow();
    if (!row) return jsonResponse({ message: 'Not Found' }, 404);
    return jsonResponse({
      sha: row.updated_at,
      content: utf8ToB64(row.note || '{}')
    });
  }

  if (path === 'data/state.json' && method === 'PUT') {
    const body = await req.clone().json();
    const saved = await saveState(b64ToUtf8(body.content || ''), body.sha || null);
    if (saved.conflict) return jsonResponse({ message: 'Conflict' }, 409);
    return jsonResponse({ content: { sha: saved.sha } }, 200);
  }

  if (path.startsWith('data/photos/') && method === 'PUT') {
    const body = await req.clone().json();
    await uploadPhoto(path, body.content || '');
    return jsonResponse({
      content: { sha: new Date().toISOString(), path }
    }, 201);
  }

  return jsonResponse({ message: 'Not Found' }, 404);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Redirect the app's legacy GitHub sync API to Supabase.
  if (url.origin === 'https://api.github.com') {
    event.respondWith(
      handleGithubCompat(req, url)
        .then(r => r || fetch(req))
        .catch(err => {
          console.warn('[BEIJING bridge]', err);
          return jsonResponse({ message: 'Offline' }, 503);
        })
    );
    return;
  }

  // Existing app renders uploaded photos from /beijing/data/photos/...
  // Transparently serve those files from Supabase Storage.
  if (
    url.origin === self.location.origin &&
    url.pathname.includes('/beijing/data/photos/')
  ) {
    event.respondWith((async () => {
      const pc = await caches.open(PHOTO_CACHE);
      const cached = await pc.match(req);
      const rel = 'data/photos/' +
        url.pathname.split('/beijing/data/photos/')[1];
      const remote = SUPABASE_URL +
        '/storage/v1/object/public/trip-photos/' + rel;

      try {
        const r = await fetch(remote, { cache: 'no-store' });
        if (r.ok) {
          pc.put(req, r.clone());
          return r;
        }
      } catch (_) {}

      return cached || new Response('', { status: 404 });
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // app.html: always prefer the newest version online; use last cached copy offline.
  if (url.pathname.endsWith('/app.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(r => {
          if (r.ok) caches.open(SHELL_CACHE).then(c => c.put('./app.html', r.clone()));
          return r;
        })
        .catch(() => caches.match('./app.html'))
    );
    return;
  }

  // index.html also prefers network, so deployments are picked up quickly.
  if (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/beijing/')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(r => {
          if (r.ok) caches.open(SHELL_CACHE).then(c => c.put('./index.html', r.clone()));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
