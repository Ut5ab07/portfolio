# HomeSection — Arrakis (Dune-inspired)

The first screen of the portfolio: a composed, real-time 3D desert planet with the introduction set into it like a title card.
Original environment. No film footage, assets, characters or logos are used.

## Files

    src/components/HomeSection.jsx         React component: canvas, title card, buttons, scroll cue (replaces the old empty slot)
    src/components/HomeSection.css         all styles, scoped to .hm-root (keyframes hm-*)
    src/components/home/duneField.js       the landscape: height function, hero dunes, dune fields, sun + wind directions
    src/components/home/buildTerrain.js    mesh generation, baked light (shadows + AO), crest detection, sand height field
    src/components/home/terrain.worker.js  runs one build job per worker (mesh, height field, or one light cascade)
    src/components/home/shaders.js         GLSL: sky, sand + moving sand, heat shimmer, wind-blown sand streaks, haze, tone mapping
    src/components/home/HomeScene.js       renderer, camera choreography, worker orchestration, lifecycle
    home.html + src/home-preview.jsx       standalone preview route (development only; not part of the production build)
    docs/home/*.png                        screenshots of the rendered result

## Dependencies

**None added.** It uses the project's existing `three@0.128.0` and React. No textures, models, fonts or shader libraries: everything is generated at runtime.

## Use / preview

    <HomeSection id="home" />                  // already mounted as section 01 via src/navigation/sections.js
    npm run dev → http://localhost:5173/home.html         standalone preview
                  http://localhost:5173/home.html?ui=0    landscape only (text hidden) — judge the environment on its own

Primary button EXPLORE MY WORK → Projects, secondary DISCOVER MY WORLD → Profile, scroll cue → Profile. All three use the shared
`scrollToSection`. The shared navbar shows `HOME` active, with a warm Arrakis tint set in `sections.js`.

## Terrain — composed, not noise

`duneField.js#heightAt(x, z)` is the single source of truth. Units are metres; the camera looks down −z.

- **Two authored hero dunes** (crest polylines, Catmull-Rom smoothed, with peaks and saddles along the crest and a slight wobble):
  - *Near dune*: its crest crosses the lower left, and its steep slip face turns to the camera. That shadowed face is the natural dark ground behind the title.
  - *Monumental ridge*: enters high on the left and falls away in a sinuous knife-edge towards the sun and the horizon. It is the leading line.
  Positions are authored in screen terms (azimuth, distance, height), so the composition is deliberate.
- **Compound dune sea** underneath:
  - two crossing transverse fields with real dune profiles: a long concave windward slope, a sharp crest and a ~33° slip face. Domain warping makes the crests sinuous, amplitude modulation breaks them into segments, and a smooth max merges them into star-like junctions instead of parallel waves;
  - megadunes (1.5 km wavelength, up to ~340 m) and a horizon range (2.6 km, up to ~520 m) that form layered silhouettes into the haze;
  - low swells, plus fine wind ridging in the foreground only.
- **Crest level of detail:** crests are rounded by a radius that grows with distance (≈ the mesh spacing), so they stay crisp without stair-stepping.
- **Mesh:** 760 × 300 vertices on desktop (460 × 200 on phones). Rows are spaced geometrically in depth (dense foreground, coarse horizon: a continuous LOD) and columns follow the frustum width.
- **Workers:** generated off the main thread by four parallel workers: the mesh plus three light cascades, about 1 s wall time on desktop.
  A CSS backdrop in the scene's palette holds the frame until then. The section is a fixed 100vh/100svh, so nothing shifts, and the canvas fades in.

Tuning: `HERO_NEAR` / `HERO_RIDGE` crest points, `F_SMALL` / `F_CROSS` / `F_MEGA` / `F_RANGE` (wavelength, amplitude, warp), and the `SUN` / `WIND` angles at the top of `duneField.js`.

## Lighting

- **One low sun**, 8.5° high and 28° right of the view: warm ivory with an amber cast. It is not a filter: the ambient light is a dusty sky-to-ground hemisphere, so shadows stay deep umber rather than black.
- **Baked cast shadows:** because the sun is fixed, shadows are computed once by a horizon sweep along the sun direction on sun-aligned grids. The penumbra widens with distance from the occluder, imitating a dust-diffused ~2° sun. There are three cascades (near 760 m, middle 2.4 km, far 8 km), blended at their edges.
- **Cavity AO** from the same heightfield darkens the troughs.
- **Sand material:**
  - pale ochre on windward slopes; warmer and darker on slip faces;
  - faint large-scale mottling;
  - grain streaks running down avalanche faces;
  - a dry rim glow where crests catch the sun edge-on.
- **Ripples:** wind ripples (0.7 m and 2.2 m) and long wind streaks (15 m) are shading detail perturbing the normal. They are oriented across the wind, sinuous, broken up, and only on gentle slopes, never on slip faces. They fade out before they could alias.
- **No bloom.** Brightness comes from geometry facing the sun. One ACES fit and sRGB conversion per fragment, with dithering against banding.

## Atmosphere

- **Shared haze:** `haze()` and `aerial()` are used by both the sky (at the horizon) and the terrain, so land dissolves into air with no seam. The haze is a desaturated bronze-beige that brightens into a broad forward-scattering glow around the sun.
- **Optical depth:** uniform dust plus exponential ground haze that pools in the troughs, giving atmospheric perspective across distant layers.
- **Ground dust:** slowly drifting patches over the low ground in the middle distance, computed in the terrain shader (no planes, so no intersection artifacts).
- **Sky:** dusty gray-brown at the zenith, mottled dust veils, thin darker dust layers near the horizon, and a pale sun disc dimmed and broken by moving dust, with a wide amber corona.
- **Wind-blown sand:** soft, faint veils lifting off detected crests and settling over the lee side, in intermittent gusts. About 6,000 grains on desktop, 2,600 on phones. They are hidden under reduced motion.

## Camera

- **Lens and height:** a high vantage (41 m) behind the near dune, with a 40° lens on desktop that compresses the dune layers. Wider lenses on tablet (46°) and phone (58°), turned towards the sun and angled down so phones keep the landscape above the text.
- **Movement:** a very slow push-in and return (16 m over four minutes), gentle drift and subtle pointer parallax (about ±1.7° yaw).

## Lifecycle, fallbacks, performance

- **Loading:** Three.js and the scene are lazy-imported. Rendering pauses when the section is off-screen (IntersectionObserver) or the tab is hidden, and resizing follows the canvas (ResizeObserver).
- **Unmount:** cancels the loop, terminates workers, removes listeners and observers, and disposes geometries, materials and textures plus the WebGL context. Safe under React StrictMode: one context, one loop.
- **`prefers-reduced-motion`:** a still frame with no camera motion, dust drift or sand. The text appears without transition.
- **No WebGL** (or a render error): the section keeps its CSS dune backdrop, and the text, buttons and navigation all work.
- **Phones:** a lighter mesh, smaller light cascades and fewer sand grains, with the pixel ratio capped at 1.5 everywhere.
- **Measured** (headless Chrome, Intel UHD, production build): 60–61 fps at 1440×900, 1280×720, 820×1180 and 390×844. Terrain ready in 1.1–2.2 s.

## Visual upgrade (2026-10-31): Arrakis palette, sky, dust

**Palette, built from light and materials, not a filter.** The tone curve is unchanged (ACES fit); only the scene changed, so hue varies by surface and lighting:
- **Sand:** golden ochre on windward slopes, burnt orange-rust on slip faces, and whole low-frequency formations of rust/copper sand (`shaders.js`, TERRAIN_FS: `sand` / `lee` / `rust`).
- **Light:**
  - a warmer, slightly golden sun;
  - a red-brown bounce and a dusty amber sky fill, so shadows go deep reddish-brown and umber rather than grey;
  - a golden glint where faces turn fully to the sun, pushing crest highlights towards yellow.
- **Air:** haze is rust-brown away from the sun and amber towards it, rising into a pale-gold forward-scattering glow. Distance therefore desaturates dunes towards dusty amber, separating the layers.

**Sky.**
- **Gradient:** a deep, desaturated dusty brown overhead, muted amber below, and a burnt-orange / reddish dust band low on the horizon (strongest away from the sun).
- **Sun:** a pale-gold disc broken by moving dust, with an amber corona.
- **Rays:** restrained crepuscular rays, slow radial streaks in the glow around the sun (`sunRays()`), shared by the sky and the aerial perspective so the dust in front of the dunes carries them too.

**Environmental life.**
- **Spindrift:** the crest spindrift is a little stronger and golden.
- **Ground dust:** wisps are now streaked along the wind and drift with it.
- **Suspended dust:** about 700 soft particles at several depths (260 on phones) drift with the wind in a box that travels with the camera. They are visible only where the sun lights them from behind, so they read as air, not glitter. Disabled under reduced motion.

**Performance.**
- The sky now renders after the terrain (`renderOrder`), so the depth test skips sky pixels behind dunes.
- The new noise was kept cheap.
- Result: 61 fps at 1440×900, 1280×720, 820×1180 and 390×844 (headless Chrome, Intel UHD, production build).

## Desert wind (2026-10-31): continuous, terrain-following sand flow

The flying craft are removed (`craft.js` deleted). Two earlier wind passes were replaced:
- soft sprites, a dust devil and amber dust read as smoke;
- sparse short streaks rendered as dots, concentrated on a few crests.

The wind is now two layers that cover the whole landscape. The only atmosphere is the original haze plus the faint heat shimmer.

**1. Flowing sand layer** (`TERRAIN_FS`, "flowing sand"). This is shading in the dune material itself, so it follows every surface:
- **Three scales of wind-stretched noise** advected downwind:
  - fine streaks, about 0.4 m by 6 m, at about 7.5 m/s;
  - medium sheets, about 1.3 m by 20 m, at about 5.4 m/s;
  - broad bands, about 4.5 m by 80 m, at about 4.2 m/s.
  The fine streaks ride in packets of the medium flow, and the lanes meander (a sine warp) so they never look ruled.
- **Continuous coverage:**
  - each scale is weighted by how well it can be resolved at that pixel (its screen-space derivative) and the weights are normalised;
  - whichever scale is valid carries full strength, so coverage runs continuously from the foreground through the central ridge, the lit right-hand slope and the middle-distance dunes;
  - beyond about 1 km it narrows to exposed crests (baked AO) and fades out by 4 km;
  - sheltered slip faces carry less.
- **Lighting:** grains are lit by the same sun and baked shadow: golden on sunlit slopes, about 10% strength in shadow. Gust fronts sweep downwind and modulate the density.

**2. Sand streaks** (`SAND_VS/FS`, `makeSand`). Instanced hairline quads (no point sprites):
- **Count and shape:** about 20k on desktop and 10.7k on phones (8.5k / 4.5k on crests, plus 540 / 280 surface lanes of 22). Each is drawn from where the grain was 0.18 s earlier to where it is now, at least 6 px long and 0.7–1.1 px wide, fading to the tail. Always a streak, never a dot.
- **Following the terrain:** a worker-baked 512² height field (2.2 km square) keeps grains 7–30 cm above the surface, with saltation hops. Crest grains lift at the edge and spill down the lee slope.
- **Lanes:** surface lanes spread over the near and middle ground out to about 1.3 km, with fewer on shadowed faces.
- **Colour:** close to the sand (beige, muted gold, ochre), with a slight golden lift only where the sun catches them; nearly invisible in shadow.
- **Recycling:** fade-in and fade-out envelopes, so nothing pops.
- **Early exit:** grains that are invisible (faded out, outside the field, too near or far, off-screen) skip all lighting work.
- **Adaptive:** if the first ~2 s average slower than ~55 fps, the streak count drops to 60% once. The flow layer is unaffected.

**Reduced motion:** no streaks, a frozen flow pattern: a still frame.

**Measured** (production build, headless Chrome, Intel UHD):
- 61 fps at 1280×720, 820×1180 and 390×844;
- 58–59 fps at 1440×900, where the wind costs about 1.5 ms over the 60.5 fps baseline.

**Screenshots:**
- `docs/home/home-sand-flow-sequence-2x.png`: four frames, 150 ms apart, of the sunlit slope; the flow moves between them.
- `docs/home/home-sand-streams-3x.png`: a crest with its hairline streaks.

**Tuning:**
- Flow strength: the `* 0.72` in the flow `mix`.
- Flow scales and speeds: the three `vnoise` lines.
- Streak counts: `nCrest`, `lanes` and `per`.
- Streak brightness: the `0.12 + 0.85 * ndl` line.
- Streak opacity: `vA`.

## The name at the horizon (2026-10-31): thin cinematic title

**UTSAB RAJ ACHARYA** is a large, thin, widely tracked title set just above the distant dune line. It is layered as sky, then name, then dunes, then hero content.
- **Size:** about 88% of the visible width, recomputed on every resize, centred on the view.
- **Baseline:** sits on the horizon line (`TITLE.base` 30.6% of the screen height; 35.2% in portrait). The big left ridge overlaps the feet of a few letters, and in portrait the distant range touches the lower edge.
- **Clean letterforms:** no distortion, erosion or displacement of any kind.

**How:**
- **Texture:** `makeTitle()` draws the name once into a canvas texture from an available system face, with no font files and no copy of any film logo.
  - **Font:** Bahnschrift (regular weight, slightly above Light) on Windows, a narrow, clean DIN-style face; Avenir Next / Helvetica Neue elsewhere.
  - **Tracking:** 0.3 em, with a 0.8 px softness.
  - **Phones:** one weight heavier, so the hairlines survive the small size.
- **Placement:** `placeTitle()` (from `size()`) puts it on one camera-facing quad about 6 km out. It uses the measured baseline, so the letters' feet, not the box, land on the dune line. Depth-tested against the dunes; never writes depth.

**Look** (`TITLE_FS`):
- **Colour:** muted sandy ivory (0.93, 0.86, 0.73) with 15% of the sky colour mixed in. About 50% peak opacity (56% on phones), breathing ±7% very slowly.
- **Dust:** a faint veil of drifting dust thins it by at most about 15%. The wind does not touch the letterforms.
- **Sun glow:** in front of the bright glow, a letter takes a darker dusty tone instead, so the whole name stays readable.
  - The choice is made once per letter, all-or-nothing, from the sky behind that letter's centre (15 letter centres are passed as `uCx`).
  - Deciding per pixel would split letters and leave a band where the tone crosses the sky's own brightness. That made letters vanish in tests.

**Reduced motion:** a still frame.

**Measured** (production build): 59–61 fps at 1440×900, 1280×720, 820×1180 and 390×844.

**Close-up:** `docs/home/home-horizon-name-2x.png`.

**Tuning:**
- `TITLE` (`span`, `base`, `basePortrait`, `dist`, `tall`: vertical stretch of the letters, 1.4) in `HomeScene.js`.
- Font, weight and tracking in `makeTitle()`.
- `uAlpha` (opacity) in `makeTitle()`.
- The ivory colour, dust veil and switch threshold (`0.66`) in `TITLE_FS`.
