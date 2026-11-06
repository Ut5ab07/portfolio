# Performance optimisation: production readiness (2026-11-01)

**Goal:** the portfolio should load quickly and run smoothly after deployment, without looking any different.

**Rendering is unchanged.** The scenes keep the same shaders, materials, textures, geometry, lights, shadows, fog, dust, sand, camera work and interactions. Every change below either:
- does the same work at a different time (ahead of the visitor, in small steps, or in the background), or
- skips work whose result would be identical.

The output was compared pixel by pixel against the original build (section 5).

**Measurement setup:** the production build, served with Brotli and long-term caching like a real host. The machine has an Intel UHD integrated GPU (Chrome, Direct3D 11) and 12 CPU threads. Lighthouse is not installed here. Its core numbers (FCP, LCP, TBT, CLS) were measured in the page with the same browser APIs, alongside WebGL instrumentation and CPU profiles. The scripts are described in section 9.

---

## 1. Audit of the original build

| | |
|---|---|
| Stack | Vite 8, React 19, three.js r128 (WebGL 2), simple-icons. No web fonts, no external requests. |
| Renderers | Five, one per section (`hm-gl`, `pz-gl`, `px-gl`, `ms-gl`, `ct-gl`). Each already paused its loop when off screen or when the tab was hidden, and released everything on unmount. No leaks: the JS heap, DOM nodes, listeners and GPU objects were flat over five full tours. |
| Entry JavaScript | 69 kB (main) + 225 kB (React) + 4 kB CSS. Brotli: 27 + 71 + 1.5 kB. |
| Lazy JavaScript | three.js 529 kB (132 kB Brotli) and one chunk per scene (Stack 340 kB, mostly the RectAreaLight lookup tables). |
| Assets | Only Stack has file assets: 12.5 MB raw (9.2 MB Brotli) of CC0 models, textures and an HDRI. The other scenes generate everything in code. |

**Per scene:**

| Scene | Shader programs | Draw calls / frame | Textures (est. GPU MB) | Notes |
|---|---|---|---|---|
| Home (Dune) | 4 | 4 | 7 (11) | Terrain built in 5 workers; instanced sand streaks |
| Profile (Arrival) | 6 | 6 | 3 (0.3) | Raymarched volumetric fog with a 3D noise texture |
| Projects (Ex Machina) | 5 | 153 | 6 (20) | Shadowed corridor; canvas-drawn textures |
| Stack (The Martian) | 21 | 154 | 69 (150) | PBR, HDRI environment, area light, static merged geometry and shadows |
| Contact (Inception) | 26 | **1,084** | 66 (58) | Folding city, bloom post-processing, shadows re-rendered every frame |

**Original loading behaviour:**
- **Home** loaded at once.
- **Profile** loaded immediately as well, because it sits within 300 px of a full-screen Home. It competed with Home.
- **Stack** started loading 300 px before it scrolled into view.
- **Projects and Contact** loaded only once on screen.

## 2. Bottlenecks found

The surprise was that **almost none of the delay was network**: the page needs only 240 kB to show Home. It was **shader compilation**.

three.js r128 compiles each material's program on first draw and immediately waits for the result. On Windows, Chrome translates WebGL shaders to Direct3D, and a physically based shader takes 0.3–1.5 s to compile there. The programs compile one after another, and the page is frozen meanwhile.

| Where | What the visitor got (original build) |
|---|---|
| Home | **10.2 s** until the Home scene appeared; 8.2 s of blocked main thread. Home's own 4 shaders took 6 s; Profile's scene, built at the same time, added a 3.7 s freeze. |
| Projects | A **2.2–2.4 s frozen frame** in the middle of the scroll into the section |
| Stack | **15–28 s of blank section** after arriving, including one 15.5 s freeze of the whole page. 21 programs took 14 s; the build, environment-map shaders and uploads made up the rest. |
| Contact | A **3.1–3.3 s frozen frame** on arrival; 1,084 draw calls per frame (44–47 fps) |
| Adaptive quality | Home, Profile and Stack time their first frames and permanently lower quality if those frames are slow. A scroll transition or first-frame upload could trigger this on fast hardware. On this machine the original build lowered Profile's fog quality (mean 23 ms against a 19 ms limit) and Home was on the edge (18.3 against 18.2). |
| Network | Stack's 9 MB began downloading only when the visitor was 300 px away. Most hosts serve `.bin` and `.hdr` uncompressed: 12.4 MB instead of 9.2 MB. |

## 3. What was changed

### Shaders compile in the background (`src/three/compileAsync.js`)
- **The mechanism.** `compileAsync(renderer, scene, camera)` creates every program a scene needs, while the context briefly answers "no uniforms yet" instead of waiting. The driver therefore compiles in the background, and `KHR_parallel_shader_compile` reports when each program is done. Only then does three read the program's uniform table.
- **No duplicates.** three renders with exactly these programs, so nothing is compiled twice. A stand-in scene with a separate lighting version makes the first real render read the finished tables. Material ids, not random UUIDs, key the work.
- **Pacing.**
  - One material per task.
  - While the scene is off screen, at most two compiles are in flight, which keeps the visible section smooth.
  - Once the visitor is looking at it, everything goes at once.
  - A 20 s safety net falls back to three's normal behaviour, so a section can never get stuck.
- **Other compiles.** `deferCompile` does the same for anything else that compiles shaders: Stack's environment-map (PMREM) shaders now compile while its assets download.
- **Textures.** `uploadTextures` sends textures to the GPU one per task before the first frame.
- **Where it's used:**
  - **Home:** its terrain and sand materials now exist from the start, so all four shaders compile while the workers generate the terrain.
  - **The other scenes:** Profile, Projects and Contact (scene, bloom stages and final gamma pass) use it as well.

### Progressive loading (`src/navigation/sceneQueue.js`)
- **Home** starts at once and nothing competes with it.
- **The other scenes** are then prepared in page order, one at a time, while the browser is idle: Profile → Projects → Stack → Contact. Prepared means built, uploaded and compiled. A prepared scene only renders while it is on screen.
- **Stack's models and textures** download as soon as Home is ready, three requests at a time, through a shared cache in `stack/assets.js`. They're skipped when the visitor has asked to save data.
- **Approaching a section** (staying within one screen of it for 0.4 s) starts it at once, out of turn. A long nav jump that scrolls past several sections doesn't build them all.
- **Revisits** cost nothing. Scenes are kept, not rebuilt; they pause off screen and resume instantly.
- **Calibration is protected.** While a visible scene is calibrating its quality, background preparation waits (`src/three/quiet.js`).

### Builds split into short steps
- **Stack:** room, Mars, each station and the merge each run in their own task.
- **Contact:** its build became a generator, one step per facade texture and building block. The code order, and so the seeded random sequence and the result, are unchanged.
- **Largest single step:** about 0.25 s, down from 23 s.

### Rendering
- **Contact draw calls, 1,084 → about 330.** Each building box drew one group per face. Faces sharing a material are now one group. three already ordered draws by material, so the pixels are identical. The saving applies in both the view and the shadow pass.
- **Contact shadow map.** The shadow casters (folding towers, lifting slabs, the sun) depend only on scroll progress. The 2048 px shadow map is now redrawn only when that changes: 44–47 fps becomes 49–54 fps while the visitor reads.
- **Adaptive quality decides on steady-state speed.** The probes now take the median frame time after skipping the first 12 frames. Same frame counts and thresholds. A slow GPU still steps down; one-off start-up hitches no longer trigger it. All three probes now read 16.6 ms here, so every scene keeps full quality.

### Delivery
- **Earlier download of Home's scene.** A small build plugin hints Home's scene chunk, three.js and the terrain worker in `index.html` (`modulepreload` / `prefetch`). They download in parallel with the entry script without delaying first paint.
- **Compressed binaries.** A second build plugin publishes a gzip copy of each `.bin` and `.hdr`, and the scene inflates it in the browser. It falls back to the plain file where that isn't possible. On a typical host Stack downloads 10.0 MB instead of 12.4 MB.
- **Caching rules** for Netlify, Cloudflare Pages (`public/_headers`) and Vercel (`vercel.json`): immutable for fingerprinted files, a day for Stack's assets, always-revalidate for HTML.

### Loading indicator (`src/components/SceneLoader.jsx` / `.css`)
- **What it is:** a small "PREPARING SCENE" caption with a thin travelling line, top right, in each section's own ink.
- **When it shows:** only while that section's scene isn't ready, and only after 0.7 s. It never flashes when a scene is already prepared or cached.
- **Accessibility:** CSS only. It's still under reduced motion and hidden from screen readers.

### Considered and not done
- **Shared renderer:** not worth it. The five renderers already pause off screen, and merging them would be a rewrite.
- **Draco, Meshopt, KTX2 and Basis:** their encoders are external tools (`gltfpack`, `basisu`) or new packages. They weren't available offline, and running `gltfpack` through `npx` was blocked earlier.
- **Mesh quantisation:** possible with the existing loader, but it would save only about 0.9 MB (10%) of Stack's download, which now happens in the background, at the cost of small shading changes on the rock scans. Not applied.
- **Smaller textures or fewer details:** ruled out; quality was not to be traded.

## 4. Before and after

Production build. "Before" is the build as it was this morning; "after" is the current one. Times are from the start of navigation.

**Desktop 1440×900, unthrottled**

| | Before | After |
|---|---|---|
| First contentful paint / LCP | 1.65 s | **1.05 s** |
| Home scene ready | 10.2 s | **2.3 s** |
| Total blocking time (to Home ready + 5 s) | 8.2 s | **1.3 s** |
| Data until Home is ready | 236 kB | 242 kB |
| Profile: blank after arriving / longest frame on arrival | 0 / 0.18 s | 0 / 0.22 s |
| Projects: blank / longest frame | 0 / **2.36 s** | 0 / **0.23 s** |
| Stack: blank / longest frame | **17.5 s** / 0.10 s | **0** / 0.08 s |
| Contact: blank / longest frame | 0 / **3.29 s** | 0 / **0.27 s** |
| Contact: fps / draw calls | 44 / 1,084 | 51 / 329 |
| Steady fps (revisit): Profile, Projects, Stack, Contact | 54, 60, 55, 42 | 52, 60, 53, 49 |
| Longest frame on revisits | 0.15 s | 0.10 s |
| JS heap after 1 and 5 tours | 15.0 / 15.1 MB | 15.3 / 15.4 MB |
| Cumulative layout shift (load / full tour) | 0 / 0.0002 | 0 / 0.0002 |
| Errors | 0 | 0 |

**Desktop on a 10 Mbit/s, 40 ms connection, host without binary compression**

| | Before | After |
|---|---|---|
| Home scene ready | 8.1 s | **2.3 s** |
| Total blocking time | 7.4 s | **1.1 s** |
| Total download | 12.8 MB | **10.4 MB** |
| Projects blank / longest frame | 0.5 s / 1.94 s | **0 / 0.22 s** |
| Stack blank on arrival | **27.9 s** | **0** |
| Contact longest frame / fps | 3.34 s / 42 | **0.27 s / 50** |

**Phone 390×844 at 3× (same GPU)**

| | Before | After |
|---|---|---|
| FCP / Home ready | 1.71 s / 8.7 s | **1.08 s / 2.3 s** |
| Total blocking time | 7.4 s | **1.3 s** |
| Projects / Contact longest frame on arrival | 2.21 s / 2.31 s | **0.18 s / 0.22 s** |
| Stack blank on arrival | **14.8 s** | **0** |
| Steady fps, all sections | 60 | 60 |

**Visitor who jumps straight to Stack 1.5 s after Home appears** (the worst case)

| | Before | After |
|---|---|---|
| Stack ready | 19.9 s, page frozen for 15.6 s of it | **11.3–11.4 s** (desktop) / 9.6 s (phone); longest frame 0.5–0.6 s, loader shown |

**Background preparation while sitting on Home** (desktop)
- **When each scene is ready, after Home:** Profile +3.7 s, Projects +5.4 s, Stack +17.3 s, Contact +20 s.
- **Home's frame rate meanwhile:** mostly 52–57 fps, with brief dips to 37–43 fps during the larger build steps. The longest frame was 0.28 s, against the multi-second freezes before.

## 5. Visual comparison

**Method:**
- **Deterministic capture.** Every section was captured from both builds with a frame-locked virtual clock, seeded randomness and CSS animations frozen. Two captures of the same build are pixel-identical, so any difference is real.
- **Sizes:** 1440×900 and 390×844 at 2×.
- **Shots:** Contact at three scroll positions, and Stack with a station open.
- **Stack:** captured with real randomness, because its dust positions are random on every load.

| Section | Result |
|---|---|
| Home | Identical (0 pixels differ), both sizes |
| Profile | Identical at 1440. At 390, some captures show ±1–2/255 dither noise from capture timing; another capture of the same build is identical to the original. |
| Projects | 3D scene identical. Only the animated 2D graphs inside the project panels differ, because their animation clock differs between runs (code unchanged). |
| Stack | Identical apart from 0.03–0.05% of pixels: the blowing dust, which is random on every load |
| Contact (start, 45%, 85% folded) | Identical; one capture has 0.001% of pixels (a few shadow-edge pixels) off by ≤ 9/255 |

Each image in `docs/performance/` shows before, after and the amplified difference: `home`, `profile`, `projects`, `stack`, `stack-open`, `contact`, `contact-45`, `contact-85`, each as `-1440` and `-390`.

**Interactions re-tested** on the production build at 1440×900, at 390×844 and with reduced motion, all passing:
- the Home buttons;
- Profile's tabs (click and arrow keys; the section height doesn't change);
- a Projects detail panel (opens, closes with Escape, focus returns);
- all three Stack stations, labels, rail, switcher, Close and Escape;
- the Contact links and locations;
- the navbar and the site-wide layout audit (68 checks).

## 6. Remaining limitations

- **Shader compilation is still the biggest cost on Windows and integrated GPUs.** It's now hidden behind the visitor's time on earlier sections. Someone who jumps straight to Stack sees "PREPARING SCENE" for about 10 s while it compiles (the page stays responsive). On a second visit Chrome's own shader cache makes this much faster.
- **Brief dips while preparing in the background.** While scenes prepare during the first ~20 s, the visible section can dip briefly to about 37–43 fps. The longest frame was 0.28 s.
- **Phones use slightly more GPU memory up front.** Stack's whole scene is uploaded and compiled ahead of time, including parts the narrow phone view hasn't shown yet, so a later station change never stalls. That's about 13 MB more GPU memory on phones.
- **The gzip copies cost 0.8 MB on hosts that Brotli-compress binaries.** On those rare hosts the copies are 0.8 MB larger than Brotli would have been.
- **Texture compression (KTX2) is not done.** It would cut Stack's GPU texture memory (about 150 MB estimated) several-fold, but needs the Basis encoder (`basisu` or `gltf-transform`), which isn't installed. If you allow that tool, run it as a separate, reversible step on the source assets.
- **Contact peaks around 49–51 fps on this integrated GPU while scrolling**, held back by bloom and its shadow map.

## 7. Production build verification

- **Build:** `npm run build` builds without warnings.
- **`dist/` contents:** fingerprinted JavaScript and CSS, Stack's assets with `.gz` copies, and `_headers`. The total is 20 MB; the visitor downloads about 10.4 MB, and only 240 kB before Home is ready.
- **Served like a real host:** every test above ran against `dist/` served with compression and caching, and against a server mimicking Netlify or Vercel (binaries uncompressed).
- **Errors:** none in any run.
- **Asset paths:** they follow Vite's `base`, so the site also works from a sub-path.

## 8. Deploying

1. **Build:** `npm ci`, then `npm run build`. The site is the `dist/` folder.
2. **Host it:**
   - **Netlify or Cloudflare Pages:** build command `npm run build`, publish directory `dist`. `dist/_headers` sets caching.
   - **Vercel:** framework "Vite", output `dist`. `vercel.json` sets caching.
   - **GitHub Pages or any static server:** upload `dist/`. If the site lives under a sub-path, build with `npx vite build --base=/your-path/`.
   - **nginx or Apache:**
     - **Caching:** mirror `_headers` (`Cache-Control: public, max-age=31536000, immutable` for `/assets/`).
     - **Compression:** enable gzip or Brotli for `js`, `css`, `html`, `json` and `gltf`.
     - **`.gz` files:** don't add `Content-Encoding` to them; the page inflates them itself.
3. **Check after deploying:**
   - DevTools → Network: `/assets/*` should say `immutable`.
   - Stack's `.bin.gz` and `.hdr.gz` should load with status 200.
   - The console should be clean.

## 9. Where things are

| File | Purpose |
|---|---|
| `src/three/compileAsync.js` | Background shader compilation, texture pre-upload |
| `src/three/quiet.js` | Pacing (`nextTask`), quiet periods while a scene calibrates |
| `src/three/adaptive.js` | Measured render resolution, partial-frame clipping, device capability (Phase 2) |
| `src/navigation/sceneQueue.js` | Progressive loading order, prefetch, approach trigger |
| `src/components/SceneLoader.jsx` / `.css` | The loading mark |
| `vite.config.js` | Home preload hints; gzip copies of Stack's binary assets |
| `public/_headers`, `vercel.json` | HTTP caching for common hosts |
| `docs/performance/` | Before / after / difference screenshots |
| `docs/responsive/` | Phase 2: phone and tablet screenshots, before / after |

**The measuring scripts** (Playwright, run outside the project) cover:
- a visitor tour with web vitals, WebGL counters, frame pacing, network and memory;
- deterministic screenshots and pixel diffs;
- CPU profiles;
- interaction tests.

They aren't part of the site.

---

# Phase 2: mobile responsiveness and rendering (2026-11-02)

**Test setup:**
- **Build:** the production build (`npm run build`), served with compression and caching like a static host.
- **Browser:** Chrome on this machine, with Intel UHD integrated graphics through ANGLE / Direct3D 11.
- **Phones and tablets:** emulated in the same Chrome (viewport, pixel density, touch). Their numbers show layout and *relative* cost, not a real phone GPU.
- **GPU time per frame:** read from `EXT_disjoint_timer_query_webgl2`.

## 10. Audit

### Responsive

Tested at nine viewports: 360×800, 375×812, 390×844, 414×896, 430×932, 768×1024, 1024×768, 1366×768 and 1920×1080.

There was no horizontal overflow at any size. Every section already had a portrait camera framing except Projects, whose corridor works at any aspect ratio. The problems found:

- **Navbar on phones.** The five links didn't fit: the bar scrolled sideways, and Stack and Contact were off screen.
- **Stack on phones.** The portrait camera can only show the middle workstation. Stations 01 and 03 were reachable only through small edge labels and a two-line rail of 9.5 px text.
- **Small touch targets:**
  - Profile's tabs (33 px) and next-section link (24 px);
  - Stack's labels, rail and panel switch (22–30 px);
  - Contact's skip link (25 px);
  - Home's scroll cue (a 1 px line).
- **Quality cut by screen size, not by device.** A capable phone still got the reduced scenes:
  - **Contact** dropped its shadows, its light shafts, two of its seven towers, half its skyline and half its texture resolution.
  - **Profile** marched fewer fog steps on a coarser terrain.
  - **Home** used a coarser terrain and half the sand streaks.

### Performance

All five scenes are limited by the GPU, not the CPU (3–10 ms of script per frame).

GPU time per frame, before:

| Viewport | Home | Profile | Projects | Stack | Contact |
|---|---|---|---|---|---|
| 1920×1080 | 23.4 ms | 23.5 ms\* | 10.4 ms | 24.2 ms | 25.9 ms |
| 768×1024 tablet (1.5× density) | 19.0 ms | 20.3 ms | 10.5 ms | 18.0 ms | 28.6 ms |

\* After its old fallback had already cut the fog steps.

At 60 Hz a frame has 16.7 ms. At full HD, four scenes therefore missed every other frame and ran at 30 fps; Profile ran at 19 fps. At 1366×768 everything held 60 fps.

## 11. Bottlenecks

1. **Pixel cost at high resolutions.** This was the main cause of lag.
   - **Profile** marches about 19 fog samples, roughly 40 3D-noise reads, for every pixel.
   - **Home's sand, Stack's physically based lighting and Contact's bloom chain** also scale with the number of pixels.
   - **Result:** most scenes were 20–60% over budget at full HD.
2. **Old fallbacks removed detail.** Home and Profile cut detail whenever their first frames looked slow, which on this laptop at full HD they always did:
   - Home thinned its sand streaks by 40%;
   - Profile cut fog steps.
3. **Stutter while scrolling between sections.** At full HD, scrolling averaged 28 fps, with frames up to 183 ms. Causes:
   - shadow-pass shaders compiled synchronously the first time Projects and Contact appeared (about 185 ms of compiling on the main thread);
   - two full-screen scenes rendering at once at every section boundary;
   - Contact redrew its 2048 px shadow map every frame while the city folds;
   - Projects wrote a style on the section root and read the layout of each motif canvas on every frame.
4. **Projects' shadow map** was redrawn every frame, although its light only moves when the visitor scrolls.

## 12. What was changed

### Measured render resolution (`src/three/adaptive.js`)

- **Start:** each scene starts at the screen's own density, capped at 1.5–1.75 as before, with every effect on.
- **Measure:** while on screen, it measures its real GPU time per frame. Where the GPU timer isn't available (most phones), it uses frame intervals instead.
- **Adjust:** only if it's over budget does it lower the internal resolution, in small steps. The floor is 80% of 1× on standard screens and 60% of the starting density on high-density ones. With spare headroom it climbs back up.
- **Unchanged:** the canvas keeps its size and the camera keeps its framing.
- **No effect is ever removed any more.** This replaces the three old fallbacks.
- **Shared starting point:** a scene starts where the previous one settled, so entering a section doesn't reallocate its buffers mid-scroll.

### Detail by capability, not screen size

- **Who gets the full scenes:** Contact, Profile and Home now build their full scenes on every device, except one that reports at most 2 GB of memory, at most 2 CPU cores, or a small GPU texture limit.
- **What phones now get:**
  - Contact's shadows, light shafts, all towers and the full skyline;
  - Profile's full fog;
  - Home's full terrain and every sand streak.

### Partial frames at section boundaries

- **What happens:** while a canvas is only partly on screen, its scene draws only the visible band, using a scissor test.
- **Margin:** the band includes an extra 30% of the screen height.
- **Pixels:** inside the band they're exactly those of a full render.
- **Excluded:** Contact, because its bloom spreads light across the whole frame.

### Shadows

- **Compiled ahead:** the shadow pass's own shaders now compile in the background with the rest of the scene, by running one shadow pass with its draw calls stubbed out. No section compiles anything when it appears.
- **Projects caches its shadow map** until the camera moves, as Contact already did.
- **While Projects or Contact is moving,** the shadow map is redrawn every other frame. The moment the scene comes to rest, the pending update lands on the next frame, so a still image is exact.

### Projects' DOM effects

- **Parallax variables** are written only when they change.
- **Motif canvas sizes** come from a ResizeObserver.
- **Motifs scrolled out of view** are not drawn.

### Navbar on phones (≤ 600 px)

- All five numbers stay on screen, and the active section spells out its name.
- Each link is a 44×44 px target and keeps its full name for screen readers.

### Stack on phones (≤ 760 px)

- The station rail becomes a three-part console bar along the bottom, in the facility's instrument style.
- Each part is a finger-sized key with the number above the name. The open station is marked in amber.
- The 3D stations and their labels still work.

### Touch targets (`pointer: coarse`)

- **Profile's tabs** grow to 44 px.
- **Stack's labels, rail, panel switch and Close** grow to 40–44 px, with a pressed state in place of hover.
- **The next-section link, Contact's skip link and Home's scroll cue** gain invisible, finger-sized hit areas without changing how they look.

### Considered and not done

- **Half-resolution fog for Profile:** a large restructure of its shaders, with a risk of halos at the structure's edges.
- **Removing Projects' backdrop blurs:** the change would be visible.
- **Giving Contact's fading text its own compositor layer:** it changed the text's anti-aliasing, so it was reverted.

## 13. Before and after

Frames per second while each section is on screen (steady state), and while scrolling the whole page with the mouse wheel:

| Viewport | Home | Profile | Projects | Stack | Contact | Scrolling |
|---|---|---|---|---|---|---|
| 1920×1080 | 38 → **54** | 19 → **51** | 38 → **60** | 37 → **54** | 32 → **56** | 28 → **39** |
| 1366×768 | 60 → 60 | 60 → 60 | 60 → 60 | 60 → 60 | 60 → 60 | 40 → 41 (45 on a second pass) |
| 1024×768 tablet | 47 → **60** | 45 → **60** | 60 → 59 | 49 → **60** | 32 → **60** | 32 → **52** |
| 768×1024 tablet | 50 → **56** | 47 → **56** | 60 → 59 | 53 → **60** | 33 → **60** | 36 → **52** |
| 430×932 phone | 60 → 60 | 60 → 60 | 60 → 60 | 60 → 60 | 42 → **60** | 35 → **57** |
| 360–414 phones | 60 → 60 | 60 → 60 | 60 → 60 | 60 → 60 | 60 → 60 | 56–60 → 56–58 |

On phones, the "after" figures are for the full scenes: shadows, light shafts, full fog and full terrain. The "before" figures were for the reduced ones.

- **Scrolling at full HD:**
  - frames over 50 ms fell from 27 to 5;
  - the longest frame fell from 183 ms to 100 ms;
  - on the first pass, no main-thread task over 50 ms remains.
- **GPU time after, at full HD (0.8× resolution on this GPU):**
  - Home 16.5 ms, Profile 17.1 ms, Stack 16.5 ms, Contact 15.8 ms;
  - Projects 9.0 ms, at full resolution.
- **GPU time after, 768×1024 tablet:** Home 14.2 ms, Profile 13.1 ms, Projects 8.4 ms, Stack 13.3 ms, Contact 10.8 ms.
- **Unchanged:** there are no new requests or assets, so these stay as before:
  - time until Home is ready;
  - download size;
  - memory;
  - layout shift;
  - the time for Stack to get ready after jumping straight to it (11.1 s after, against 10.6–11.4 s before).

## 14. Visual comparison

- **Same resolution, identical pixels.** I held the resolution at its original value and took deterministic screenshots of every section: 8 frames at 1440×900 and 8 at 1920×1080. All are pixel-identical to the previous build, with a maximum difference of 0. Shadow caching, partial frames, the early shadow compilation and the DOM changes alter nothing on screen.
- **Where resolution drops** (here, full HD on integrated graphics), the image is slightly softer at 0.8×. Terrain, sand ripples, crest streaks, workstation detail, shadows and screens are all still present. See `docs/responsive/desktop-1920-*-crop-before-after.jpg`.
- **Phones and tablets** now show the full scenes. See:
  - `docs/responsive/phone-*-before-after.jpg`;
  - `phone-390-all-sections.jpg`;
  - `tablet-*.jpg`.

## 15. Remaining limitations

- **No real phones were tested.**
  - Phone and tablet results come from emulation in desktop Chrome, and real phone GPUs are slower. The resolution governor is what absorbs that, but here it was exercised only through its frame-interval path.
  - Firefox and Safari weren't available on this machine. The code uses only standard WebGL 2, and it falls back gracefully where the GPU timer or `sessionStorage` is missing.
- **Full HD on integrated graphics runs at about 54 fps, not a locked 60.**
  - Home, Profile and Stack sit at the 0.8× floor, right at the frame budget.
  - Going lower would visibly soften the image, so the floor stays.
  - Profile's fog could be made cheaper by computing it at half resolution (see "Considered and not done").
- **Section boundaries still dip:** frames run about 34–50 ms during a transition at full HD. There are two reasons:
  - two scenes share the screen;
  - the browser rasterises page content the first time it scrolls into view.
- **Phones now build the full scenes,** so the first build on a low-memory phone takes a little longer. Devices that report at most 2 GB of memory or at most 2 cores keep the lighter build.

## 16. Verification

On the production build:
- the nine-viewport audit above;
- deterministic pixel comparisons;
- interaction tests for every section on desktop, on a phone and with reduced motion;
- the 68-check layout audit at desktop and phone sizes;
- the Stack tests (hover, clicks, pinned labels, outside click, keyboard) at desktop and phone sizes;
- a touch test that opens and closes all five project dialogs at 360 and 390 px. Each dialog fits the screen, and Close is 99×44 px.

All pass with no console errors.
