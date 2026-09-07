/**
 * Service Worker - Gemini Nano AI Tools
 * アプリシェル（HTML / CSS / JS）をキャッシュしてオフラインで動作させる
 */

const CACHE_NAME = 'ai-tools-v3';

// キャッシュするファイル一覧
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

// ─── インストール: アセットを事前キャッシュ ─────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // 新しい SW をすぐにアクティブにする
  self.skipWaiting();
});

// ─── アクティベート: 古いキャッシュを削除 ───────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── フェッチ: キャッシュ優先、なければネットワーク ─
self.addEventListener('fetch', (event) => {
  // chrome-extension や非 http スキームは無視
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // 正常なレスポンスのみキャッシュに追加
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
