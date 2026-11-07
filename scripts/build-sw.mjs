import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export function precache(dir, basePath) {
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(dir, join(e.parentPath, e.name)).split(sep).join("/"))
    .filter((f) => f !== "sw.js")
    .sort();
  const hash = createHash("sha256");
  for (const f of files) hash.update(f).update(readFileSync(join(dir, f)));
  return { version: hash.digest("hex").slice(0, 12), urls: files.map((f) => encodeURI(`${basePath}/${f}`)) };
}

export function serviceWorker({ version, urls }, basePath) {
  return `const CACHE = "startklar-${version}";
const URLS = ${JSON.stringify(urls)};
const INDEX = ${JSON.stringify(`${basePath}/index.html`)};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(URLS.map((u) => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("startklar-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const key = req.mode === "navigate" ? INDEX : req;
  e.respondWith(
    caches
      .open(CACHE)
      .then((c) => c.match(key, { ignoreSearch: true }))
      .then((hit) => hit ?? fetch(req)),
  );
});
`;
}

if (import.meta.main) {
  const basePath = process.env.PAGES_BASE_PATH ?? "";
  const list = precache("out", basePath);
  writeFileSync("out/sw.js", serviceWorker(list, basePath));
  console.log(`sw.js: version ${list.version}, ${list.urls.length} files`);
}
