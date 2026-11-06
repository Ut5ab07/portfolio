import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Home's 3D scene is lazy-loaded (it must not block the first paint of the page), but it is the first thing every visitor
// needs: hint its chunk, three.js and its terrain worker in index.html so they download in parallel with the entry script
// instead of after React has mounted. modulepreload only fetches and parses; nothing runs before the page asks for it.
function preloadHomeScene() {
  let base = '/';
  return {
    name: 'preload-home-scene',
    apply: 'build',
    configResolved(c) { base = c.base; },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle || !/index\.html$/.test(ctx.filename || ctx.path || '')) return html;
        const chunks = Object.values(ctx.bundle);
        const home = chunks.find((c) => c.type === 'chunk' && c.facadeModuleId && /components[\\/]home[\\/]HomeScene\.js$/.test(c.facadeModuleId));
        if (!home) return html;
        const files = new Set(), walk = (c) => { if (!c || files.has(c.fileName)) return; files.add(c.fileName); (c.imports || []).forEach((f) => walk(ctx.bundle[f])); };
        walk(home);
        const tags = [...files].filter((f) => !html.includes(f)).map((f) => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href: base + f }, injectTo: 'head' }));
        const worker = chunks.find((c) => /terrain\.worker-.*\.js$/.test(c.fileName));
        if (worker) tags.push({ tag: 'link', attrs: { rel: 'prefetch', href: base + worker.fileName }, injectTo: 'head' });
        return { html, tags };
      },
    },
  };
}

// The stylesheet goes straight into index.html: the first paint needs no extra request, so nothing blocks rendering. It is small
// (about 10 kB compressed) and every section's styles are in it, so there is only ever this one.
function inlineStylesheet() {
  return {
    name: 'inline-stylesheet',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        return html.replace(/<link rel="stylesheet"[^>]*href="[^"]*\/(assets\/[^"]+\.css)"[^>]*>/, (tag, file) => {
          const css = ctx.bundle[file];
          if (!css) return tag;
          delete ctx.bundle[file];
          return `<style>${css.source}</style>`;
        });
      },
    },
  };
}

// Stack's binary assets (.bin geometry, .hdr environment) compress 1.2-5x, but most static hosts send application/octet-stream
// uncompressed. Publish a gzip copy next to each one (dist/stack-assets/**/*.gz); the scene fetches the .gz and inflates it in
// the browser, and falls back to the plain file (src/components/stack/assets.js). The source files in public/ are untouched.
function gzipStackAssets() {
  let dir = '';
  return {
    name: 'gzip-stack-assets',
    apply: 'build',
    config: () => ({ define: { __STACK_GZ__: 'true' } }),
    configResolved(c) { dir = path.resolve(c.root, c.build.outDir, 'stack-assets'); },
    closeBundle() {
      const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
      for (const f of walk(dir)) if (/\.(bin|hdr)$/.test(f)) fs.writeFileSync(f + '.gz', zlib.gzipSync(fs.readFileSync(f), { level: 9 }));
    },
  };
}

// Two editions share the site. Production (Vercel) picks one per request with the rewrites in vercel.json: /cinematic and
// /mobile directly, and at / the visitor's saved choice or else their device. The cinematic page is published as
// cinematic.html, not index.html, because a host serves an existing index.html for / before it looks at any rewrite.
function publishAsCinematic() {
  let dir = '';
  return {
    name: 'publish-as-cinematic',
    apply: 'build',
    configResolved(c) { dir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const from = path.join(dir, 'index.html');
      if (fs.existsSync(from)) fs.renameSync(from, path.join(dir, 'cinematic.html'));
    },
  };
}

// The mobile edition (vite.mobile.config.js) is built right after this one, so a plain `vite build`, whatever command the
// host runs, always publishes both editions. It is a separate build: the two editions share no chunks.
function buildMobileEdition() {
  let root = '', mode = 'production';
  return {
    name: 'build-mobile-edition',
    apply: 'build',
    configResolved(c) { root = c.root; mode = c.mode; },
    async closeBundle() {
      const { build } = await import('vite');
      await build({ configFile: path.resolve(root, 'vite.mobile.config.js'), mode });
    },
  };
}

// `npm run dev` applies the same vercel.json rewrites, so /, /mobile and /cinematic behave as they will in production.
// (The cinematic page is index.html in the source tree.)
export function editionRoutes() {
  const rules = JSON.parse(fs.readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')).rewrites || [];
  const cookie = (h, k) => { const m = new RegExp(`(?:^|;\\s*)${k}=([^;]*)`).exec(h || ''); return m ? decodeURIComponent(m[1]) : undefined; };
  const full = (re, v) => v !== undefined && new RegExp(`^(?:${re})$`).test(v);
  return {
    name: 'edition-routes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [p, q] = req.url.split('?');
        const rule = rules.find((r) => r.source === p && (r.has || []).every((h) =>
          h.type === 'cookie' ? full(h.value, cookie(req.headers.cookie, h.key)) : full(h.value, req.headers[h.key.toLowerCase()])));
        if (rule) req.url = rule.destination.replace(/^\/cinematic\.html$/, '/index.html') + (q ? `?${q}` : '');
        next();
      });
    },
  };
}

// Vercel Web Analytics, as the previous site had it (@vercel/analytics): the plain-HTML form of the same tracker, added to
// production builds only (the dev server has no /_vercel endpoint). Deferred: it never delays the page.
function vercelAnalytics() {
  return {
    name: 'vercel-analytics',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'script', children: 'window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };', injectTo: 'head' },
      { tag: 'script', attrs: { defer: true, src: '/_vercel/insights/script.js' }, injectTo: 'head' },
    ],
  };
}

export { inlineStylesheet, vercelAnalytics };

export default defineConfig({
  plugins: [react(), preloadHomeScene(), inlineStylesheet(), gzipStackAssets(), vercelAnalytics(), publishAsCinematic(), buildMobileEdition(), editionRoutes()],
  build: {
    // three.js r128 is a single ~510 kB module, lazy-loaded with the first 3D section; it cannot be split further.
    chunkSizeWarningLimit: 600,
    // This build makes the cinematic edition (index.html, published as cinematic.html). The mobile edition is a separate build
    // (vite.mobile.config.js), so neither edition's bundle depends on the other's. home.html, the standalone Home preview,
    // is a development aid served by `npm run dev`.
  },
  worker: { format: 'es' },
});
