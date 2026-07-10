/* MBTI 站 Service Worker —— 离线优先的静态缓存
 * 策略：
 *  - 导航请求（HTML）：网络优先，失败回退到已缓存的首页（离线可测/看档案）
 *  - 静态资源（js/css/img）：缓存优先，首次访问后离线可用
 * 部署新版本时只需修改 CACHE 版本号即可清旧缓存。
 */
const CACHE = 'mbti-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/type.html',
  'assets/css/style.css',
  'assets/js/data.js',
  'assets/js/app.js',
  'assets/js/type.js',
  'assets/js/personality-3d.js',
  'assets/js/personality-compare.js',
  'assets/js/lib/three.min.js',
  'assets/img/cover.svg',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png',
  'manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 不拦截外部请求（如 cover.svg 当 og 图时由平台处理）

  // 导航：网络优先 + 缓存回退
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return r;
        })
        .catch(() => caches.match('/index.html').then((m) => m || caches.match('/')))
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // 后台静默更新
        fetch(req).then((r) => {
          if (r && (r.ok) && (r.type === 'basic' || r.type === 'cors')) {
            caches.open(CACHE).then((c) => c.put(req, r.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((r) => {
        if (r && r.ok && (r.type === 'basic' || r.type === 'cors')) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return r;
      }).catch(() => cached);
    })
  );
});
