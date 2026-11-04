# IMPORTANT — REDOWN / AMEOBO Mascot API: Uploaded Character → Chrome 3D → Motion → Interactions → Games

**Captured:** November 3, 2026  
**Authoritative classification:** Owner's design direction, proposed feature—not current implementation.  
**Scope:** REDOWN Mascot API and future compatible character creators; **not** standalone Click2Cloud (which intentionally excludes the mascot/skin APIs).  
**Status:** Product vision and proposed technical contract. Nothing here implies that a 3D model pipeline, trained motion system, animation editor, or export feature already exists.

## 1. Core idea: anybody's drawing becomes a living mascot

Let people upload **an image, sketch, illustration, or drawing of a character they created**: female, male, nonbinary, robotic, abstract, or fantastical. From that source, make a recognizable **3D rendition in REDOWN's luminous, reflective metallic CHROME aesthetic**—a polished chrome interpretation, not necessarily a literal photorealistic human model. Preserve distinct visible features of the design (shape, clothing silhouette, hair, accessories, expression cues) while presenting a coherent chrome surface. Later, allow carefully bounded aesthetic variants without changing the core mascot compatibility contract.

A still image is only the starting point. **The output must become a character that moves and behaves through the same Mascot API as built-in characters.** The custom character inherits the generic action vocabulary and can interact with AMEOBO and other compatible mascots. No bespoke, hardcoded animation engine per character.

### User story

1. I upload my drawing of a woman, man, or other character.
2. REDOWN produces an appealing **chrome 3D version** and lets me inspect/approve it. As single-view images cannot reveal the back or hidden features, show an editable draft rather than falsely claim perfect reconstruction.
3. The character is adapted to a standard **skeletal joint/rig system**, with suitable proportions, movement limits, and collision/contact anchors.
4. The generic Mascot API gives that character behaviors: idle, walk, wave, point, reach, turn, grab, pull, push, toss, spin, react, dance, communicate, etc., according to capabilities.
5. I can easily **program my own motions**—pose, keyframe, combine, sequence, or describe what should happen—and save/replay/share them as reusable actions.
6. The mascot interacts with other mascots in a physically coherent, charming way.
7. Where technically compatible, I can **export the 3D character, rig, and my animations** for use in a game, animation package, or another application; REDOWN is a creator tool, not a dead-end proprietary format.

## 2. One universal action language, multiple rig profiles

**Central architectural principle:** the Mascot API is a **semantic action layer above the actual skeleton**, not a collection of animation files tied to one character's exact joints.

- Define a canonical, inspectable **Joint & Contact Schema**: root/pelvis, spine, neck/head, shoulders/elbows/wrists/hands, hips/knees/ankles/feet where applicable; gaze, contact surfaces, interaction anchors, and optional secondary appendages.
- Support **rig profiles** rather than forcing humanoid joints onto every mascot: `humanoid`, `blob`, `quadruped`, `winged`, `custom`, etc. A female or male humanoid drawing may use the same core humanoid rig; sex/gender does not determine behavior or access to actions.
- A rig adapter maps canonical actions to each character's skeleton, proportions, constraints, and available joints. Actions missing physical capability must gracefully downgrade or give an honest unsupported indication.
- Joint-based learned motion generation or retargeting is a **future proposed technique**, not a claimed existing trained model. Use deterministic rig validation and constraints even when motions come from generative tools.
- Keep identity/appearance, skeleton, motion clips, action definitions, behavior logic, and theme shaders as **separate, replaceable layers**.
- Standardize world transforms, contact points and collision shapes so two independently uploaded characters can genuinely interact.

## 3. Effortless personal motion programming

The **Mascot Motion Studio** should make custom motion authoring accessible even to a person who cannot code.

- **Pose the joints directly:** draggable handles on body joints, mirrored editing, reach targets, sensible limits, easy reset and undo.
- **Record and keyframe:** create a pose, advance a timeline, create the next pose; automatically interpolate; loop or change tempo. Add facial/expression/gaze tracks if supported by the character.
- **Action blocks / visual programming:** combine `turn → reach → grab → pull → react`; specify waits, timing, conditions, and events with approachable visual blocks. Let advanced creators use a documented JSON/TypeScript-facing action contract.
- **Natural-language-to-motion (optional future extension):** propose a motion from a description, preview it, and let the user correct joints/timing. Never equate unverified generation with valid, safe rig motion.
- **Reusable named moves:** save a custom wave, bow, dance, hug, jump, or gesture as a user-authored motion; tag, duplicate, tune, test, and share/export subject to permissions.
- **Test alongside other mascots:** preview paired actions and constraints in an isolated stage; detect intersections, unreachable grips, missing rigs, and timing mismatches.
- **Create without code; extend with code:** the same action can be authored in a visual editor and invoked by the Mascot API.

### Example API concept (illustrative, not implemented)

```ts
const mascot = Mascot.load("my-chrome-character");
const wave = MotionStudio.fromKeyframes({
  rigProfile: "humanoid",
  tracks: [/* joint poses and timing */]
});
mascot.registerAction("my-wave", wave);
await mascot.perform("my-wave");
await Mascot.interact(mascot, ameoBo, "high-five");
```

API spelling is a proposal; implementation must determine actual versioned signatures.

## 4. Multi-mascot interaction contract

- The same universal verbs work across built-in AMEOBO and compatible uploaded mascots where feasible: `approach`, `pointAt`, `waveTo`, `pickUp`, `handTo`, `push`, `pull`, `spin`, `highFive`, `reactToContact`, and `lookAt`.
- Support explicit initiator/receiver roles, compatible attachment/contact anchor pairs, maximum movement ranges, collision envelopes, and synchronized timelines.
- Each participant owns its own animation state. A coordinating interaction layer synchronizes actions **without baking the other character's proprietary skeleton into a user's animation**.
- Design for memorable expressive interactions: eye contact, micro-reactions, surprise, recoil, deformation, and theme-specific visuals. AMEOBO's blob rig will use a different adapter from a humanoid chrome mascot.
- Bound interactions so mascots never unexpectedly interfere with critical REDOWN controls, file transfers, permissions, or accessibility.

## 5. Export beyond REDOWN — game-ready where possible

**User request:** “Maybe even export them to do games or whatever.”

Treat portability as a core aspiration:

- Offer **glTF 2.0 / GLB** export of mesh, materials, skeleton, and supported skeletal animation clips as a primary interoperable target.
- Support **FBX** or engine-specific packages only if reliable maintained tooling, license terms, and validated compatibility justify them; do not promise universal compatibility.
- Export character and animation separately or together. Include scale/axes, hierarchy, constraints metadata where representable, contact-anchor metadata in a versioned sidecar, thumbnails, author attribution, and applicable usage rights.
- Explicitly distinguish *standard skeletal animation* that works in other programs from **REDOWN-specific live behaviors**, procedural physics, rig adapters, chrome shaders, and agent logic that may need an optional SDK/plugin to reproduce.
- Validate representative imports to Blender and at least one game engine such as Godot or Unity before claiming game-ready export.
- Make it possible to retain a user's authored motion as a reusable library independent of the initial chrome mesh, through rig-aware retargeting.

## 6. Chrome styling, ownership, and safety

- **Default look is CHROME:** recognizable 3D sculpt in metallic reflective finish; lighting should adapt to REDOWN's themes. Provide optional artistic fidelity controls without accidentally making this a generic photo-realistic human-cloning service.
- Uploaded characters are user content; make input and asset rights clear. For a real person's image, require appropriate rights/consent, particularly when sharing/exporting a recognizable likeness. Avoid covert copying and misleading impersonation.
- Explain image-to-3D ambiguity; let users preview and correct geometry and topology, rig assignment, occluded details, and color/style interpretation.
- Avoid storing unnecessary original images or private data in diagnostic logs. Apply explicit delete/export controls and secure asset handling in future implementation.
- Separate user-authored motions and characters from built-in REDOWN mascot artwork, licensing, and third-party APIs.

## 7. Proposed implementation stages and acceptance

1. **Contract first:** document versioned rig profiles, standardized semantic actions, joint ranges, interaction/contact schema, motion serialization, and asset ownership. No runtime rewrite at this stage.
2. **One chrome humanoid prototype:** convert an authorized sample drawing to an editable chrome 3D character; map to a reusable humanoid rig; validate idle/wave/walk and native animation transitions.
3. **Visual motion authoring:** drag joints, keyframe a new gesture, play/stop/save/reload and trigger the custom action using the same API as a built-in gesture.
4. **Two-character contract:** make the custom character high-five or hand an object to AMEOBO (or another independently rigged character), with synchrony and collision/contact checks.
5. **Portability:** export GLB + animation and verify round-trip in Blender and one actual game engine. Preserve authored motion identity and document intentional gaps.
6. **Robustness:** vary silhouettes, image quality, inaccessible or missing joints, nonhumanoid shapes, slow browsers, invalid imports, and failures. Show a clear fallback instead of misrepresenting a failed model as a successful animated mascot.

### Non-negotiable acceptance demonstrations

- An uploaded user-authored female or male character drawing becomes a **recognizable chrome 3D character** rather than just receiving a chrome filter on the flat image.
- The generated character has an inspected, valid skeleton and can play a standard Mascot API action.
- A newcomer can make and replay an original custom motion **without programming**.
- The same custom motion can be serialized, reopened, and where joint-compatible retargeted.
- Two different mascot rig profiles can perform a specified contact interaction without invisible hardcoded per-character coupling.
- A supported 3D asset and skeletal clip export opens and animates in an external application, with limitations clearly listed.
- Tests distinguish scripted mock preview from real 3D generation, valid skeleton, GPU/browser behavior and externally verified export.

## 8. Dual-mode motion: ordinary characters AND AMEOBO fluid chrome

**Additional owner direction, November 3, 2026:** Transfer AMEOBO's expressive chrome deformation technology into the general Mascot API. A user-created character should not be restricted to its ordinary skeleton. The owner wants a choice between moving **normally**, or moving **the AMEOBO way**: playful jiggling, fluid distortions, elastic squash/stretch, chrome ripples, gleaming reflections, shape-shifting and physically appealing reactions.

### Three interoperable animation modes

1. **NORMAL / RIGGED:** Conventional skeletal, joint-driven poses, actions, motion clips, and interaction anchors. Default for conventional humanoid movements and engine portability.
2. **AMEOBO / FLUID CHROME:** Non-rigid, elastic and procedural motion layered on the character (jiggle, squash/stretch, wobble, melt/reform, waves, soft-body-inspired deformations and transformative morphs). Behaviors are bounded by visual and interaction constraints. They may be implemented using blend shapes, morph targets, bones, shaders, geometry deformation, simulation, or hybrids after benchmarks—not by assuming one technology fits every character.
3. **HYBRID:** Animate with normal joints while adding expressive chrome jiggling/distortion on top; for example, a character waves goodbye and the arm smoothly settles in a metallic ripple. Each layer has independent authoring controls, intensity, timing, quality level and disable/fallback handling.

The user should be able to choose a motion mode per mascot, per named action or on a timeline; do **not** force AMEOBO's blob skeleton into humanoid characters. Retain a recognizable silhouette when intended and allow full transformations only by explicit design. Provide real preview and easy undo in Motion Studio.

### Proposed effect and interchange abstraction

- Define a versioned `DeformationTrack` / `EffectTrack` separate from the base skeleton and semantic action. Describe targets (mesh/region), intensity, timing, shape/constraints, quality hints, and deterministic seed where applicable.
- Provide optional `morph(fromShape, toShape)`, `jiggle(region, amount)`, `ripple(region, amplitude)`, `squashStretch(region, amount)`, and `settle()` semantic verbs; these are **illustrative API concepts**, not existing calls.
- A canonical motion/behavior source must be independent of render implementation. A runtime adapter can use high-quality simulation; a fallback adapter can choose predefined blend shapes, baked animations, lightweight vertex displacement or even a purely skeletal rendition.
- Treat material/shader compatibility separately from motion compatibility. The REDOWN chrome aesthetic should degrade into a standard metallic PBR material or an explicitly documented engine-specific shader where the original renderer is unavailable.
- The combination of skeletal movement, procedural motion and transforms must be governed by stable priorities, layer weights and contact anchoring so a character can shake or stretch **without breaking handshakes, grabs, gaze, hitboxes or accessibility settings**.

## 9. First flagship demonstration — AMEOBO's grand transformation

**Owner-directed demo sequence** (storyboard/acceptance target; not implemented):

1. **A beautiful chrome entrance.** AMEOBO emerges as fluid, luminous, reflective metallic chrome. The surface feels alive rather than like a stiff primitive.
2. **The cool arrow.** AMEOBO stretches, sculpts and resolves into an elegant, unmistakable **arrow** to guide attention; it can point at an intended UI element with precise, controllable direction.
3. **Expressive fluidity.** The arrow ripples, jiggles, twists, or playfully changes form without losing the intended visual rhythm. Each effect should feel polished instead of arbitrary.
4. **The reveal.** Toward the end, AMEOBO transforms with a graceful, coherent morph into a **beautiful adult woman rendered in chrome**, with a stable humanoid rig and recognizable facial/hand shape.
5. **Farewell.** She makes eye contact and **waves goodbye**, using normal articulated joint motion enriched (when enabled) by subtle AMEOBO-style chrome settling effects.
6. **End gracefully.** The demonstration closes cleanly; no stuck GPU resources, perpetual simulation, surprise overlays, or interruptions to REDOWN file workflows.

The demo deliberately demonstrates fluid shape morphing followed by a recognizable, articulated humanoid wave. This is a conceptual sequence, not a claim that a single image or shader can already execute it.

### What the demo must prove

- An AMEOBO-style non-humanoid/deformable shape can become an ordinary humanoid character **within one cohesive experience**.
- The arrow can point meaningfully, not merely resemble an arrow in a static screenshot.
- The transformed humanoid can be animated through the shared rig/action contract, rather than needing a new bespoke animation runtime.
- Chrome material fidelity, expressive distortion, and action semantics remain separable.
- The demo has low-resource and reduced-motion alternatives instead of only a luxurious hardware showcase.

## 10. Portability as a first-class API property, not just export of the mesh

**Owner's target:** the Mascot API itself should be **exportable and compatible with any game development system** to the greatest practical degree. REDOWN should be the place where users make characters, motions and behaviors they can genuinely reuse elsewhere.

Distinguish two export capabilities, and verify them separately:

- **Portable baseline asset:** standard mesh, PBR-like chrome material, skeleton, keyframed animations, and supported morph targets in `glTF/GLB`. Bake procedural motion into standard clips, blend shapes or supported animated geometry when feasible, so even a game engine with no REDOWN runtime can play an approximation.
- **Behavior-preserving integration:** a documented, versioned **Mascot Runtime / Adapter SDK** and machine-readable action/deformation schema that compatible game engine plugins can interpret, preserving jiggle, interactions, procedural rules and quality scaling. Ship concrete adapters only after actual engine tests.
- **No vendor lock-in by default:** creator-owned motion definitions should be human-readable, versioned, migratable and independently reusable; don't silently require a REDOWN server to run a legitimately exported offline asset.
- **Compatibility matrix:** target and independently verify common workflows (e.g., Blender, Godot, Unity, Unreal) as engineering milestones, logging which layers import: mesh, bone rig, keyframes, morphs, shader, live behaviors, interaction physics.
- **Honest boundary:** no file format or SDK can automatically guarantee identical dynamic shaders, real-time simulation and procedural code in *every* engine. Declare what is **portable**, **baked with visual approximation**, **adapter-dependent**, and **unsupported**.
- **Round-trip tests:** reimport a project-exported character and a user-built action; check joints, motion timing, scale, hand contacts, appearance and fallback quality. Use actual game engine rendering, not solely JSON validation.

## 11. Performance ladder — elegant on 4 GB RAM, spectacular on powerful hardware

**Owner's aspiration:** AMEOBO's chrome distortions and morphing should already look **beautiful on a computer with 4 GB of system RAM**, and become dramatically richer when more memory and capable graphics hardware are available. This is a **design target**, not measured performance or a guaranteed hardware minimum. System RAM, VRAM, GPU capability, CPU, browser memory limits, device thermals, and concurrent tabs all matter.

- **Baseline / light:** low-poly or efficiently compressed geometry, simple PBR chrome environment reflections, limited active bones/blend shapes, cheaper jiggle approximations, low particle count, lower simulation update rate, conservative textures and memory budget. Preserve pleasing silhouette, timing and intentional movement.
- **Balanced:** additional dynamic reflections, smoother deformation, more secondary motion, finer animation interpolation, more expressive material transitions and improved collision fidelity when profiled.
- **Cinematic / high:** richer fluid/soft-body-like effects, finely resolved morphs, detailed chrome reflections, higher temporal smoothness, simulated interactions and optional extra effects when actual headroom supports them.
- **Quality auto-selection:** probe capabilities conservatively, monitor performance and memory pressure, allow manual override, pause/suspend offscreen mascots and favor responsive REDOWN controls over spectacle. Never mistake advertised RAM for available GPU memory.
- **Accessibility:** full motion disable, reduced-motion mode, no flashing/flicker, and a still or gentle arrow-and-wave representation when device budgets or user preferences demand it.
- **Acceptance must measure, not assert:** test 4 GB-class systems and representative stronger systems in supported browsers, with defined load times, smoothness, responsiveness, peak memory and no transfer interference. Keep the animation quality ladder deterministic and independently testable.

## Additive acceptance demonstrations for the new vision

- A user-imported humanoid mascot can perform a familiar skeletal wave in NORMAL mode, an elastic chrome jiggle in AMEOBO mode, and a mixed wave-with-jiggle in HYBRID mode—all without manually rewriting its rig.
- The scripted AMEOBO **chrome → cool pointing arrow → chrome adult woman → goodbye wave** flagship demo plays end-to-end and returns controls cleanly.
- The same author-defined wave exported as a standard clip works in an external game engine. A fluid effect is either baked faithfully enough for a documented approximation or reproduced through a verified adapter, with no claim of native universal procedural compatibility.
- A 4 GB RAM-class test device presents a satisfying version of the demo without excessive memory use or blocking core REDOWN operations, while higher-capability hardware demonstrably enables more detailed effects. Performance claims must cite actual benchmark hardware and recordings.
- Switching from advanced to baseline quality or reduced-motion in the middle of an action must be safe and visually coherent.

## Owner's guiding principle

> **Upload the character you imagine. REDOWN turns it into a chrome 3D mascot. The Mascot API gives it motion and a social life. Motion Studio lets you invent its moves. Export lets you take your creation into games and other worlds.**

The feature should feel effortless to creators, while the engineering contract remains composable, testable, portable, and honest about the considerable image-to-3D/rigging challenge.

## 12. Physical slapstick, pick-up interactions, and recurring comedy callbacks

**Additional owner direction:** Mascots should feel like little physical performers with a sense of comedic history, not untouchable floating UI badges. They can **trip, stumble, fall, be picked up, carried, gently put down, recover, react to another mascot and later call back to a previous mishap**.

The desired comic ambition is **absurd, sharply timed, cutaway-like animated-sitcom humor** (the owner referenced *Family Guy* as a level of comic energy), expressed through *original* character writing, movement, timing and situational jokes—not copying any show's characters, dialogue or specific gags.

### Core user and mascot interactions

| Action / event | Physical behavior | Comedy beat or follow-up |
|---|---|---|
| `stumble` or `trip` | Contact foot/edge, lose balance, flail briefly, recover or tumble; fluid characters squash and wobble instead of using humanoid legs | Incongruously dignified recovery, offended stare at harmless object |
| `fall` | Safe bounded ragdoll/pose blend with impact timing and recoverable grounded state | Comically long pause, looking at camera, tiny theatrical reaction |
| `pickUp` | User can click/drag or choose Pick Up; another mascot can use compatible grasp/attachment anchors | Mascot dangles, stiffens, waves or reacts to being carried |
| `carry` / `putDown` / `dropSafely` | Attached mascot tracks holder without teleporting or clipping; releases to safe ground/contact pose | Extra careful landing followed by overconfident tiny bow |
| `helpUp` | Second mascot approaches and offers assistance with synced contact; may succeed or fail amusingly | Helper also stumbles, then both pretend nothing happened |
| `recover` | From trip/fall/carried state, smoothly reconstitute idle/walk/fly | Delayed side-eye or mock indignation |
| `callbackGag` | Context-sensitive recurrence references a previously observed interaction via bounded scene memory | Later, mascot approaches the same obstacle wearing absurd protective gear, or solemnly avoids the harmless tile |

**Two meanings of “callback” should both be supported:**

1. **Comedy callback:** a recurring joke that remembers an earlier physical mishap and pays it off much later with a surprising, coherent reaction. Use bounded per-session event history and cooldowns rather than repeating the same gag on every click.
2. **Programmatic callback:** a safe event interface for action authors, such as `onTrip`, `onFall`, `onPickedUp`, `onReleased`, `onRecovered`, and `onGagBeat`. These are proposed semantic event names, **not implemented APIs**. Return observable action/rig IDs, state, outcome and timing, not user secrets.

### Standardized motion state and rig compatibility

- Reuse the existing generic actor/action vocabulary across **AMEOBO/AMEBOE (owner pronunciation: MEBO)** and future uploaded mascots. Preserve source naming until a separate naming decision is applied throughout the codebase.
- Maintain explicit states such as `idle`, `moving`, `stumbling`, `falling`, `grounded`, `carried`, `recovering`, plus cancellable gesture overlays and safe interruptions. Transitions are deterministic and validated.
- Interactions use compatible skeletal/rig/soft-body anchors, contact constraints, stage boundaries and ownership arbitration. Some blob characters can be lifted by a chrome droplet/core rather than imaginary limbs; humanoids may use actual hands, joints and ragdoll blending.
- Contact, release and collision cannot trap a mascot inside an active button, hide an essential toolbar/Shelf element, steal input focus or interrupt file saves; user can dismiss, reset, move or disable any animation.
- A mascot may react to *visible authorized UI state*, but comedy memory should be strictly bounded, local by default, privacy-conscious and unrelated to collecting browsing provenance.
- Comedy timing is part of the animation contract: **setup → mishap → reaction/awkward pause → delayed callback → return to normal**. Support randomized but seeded and reproducible performances, not continuous disruptive noise.

### Original sample running gag

1. MEBO glides confidently toward a menu item, bumps an invisible edge, and collapses into a glittering chrome puddle.
2. A second mascot pulls MEBO up. MEBO rigidly straightens, behaves as if everything was intentional, and points at the user's intended destination.
3. Minutes later, MEBO returns with an enormous miniature traffic cone, places it carefully beside the offending edge, salutes it ceremoniously—and then trips over the cone.

This is an **original illustrative gag**, not a shipping asset or a copied television bit. Deliver such moments sparingly so their surprise and personality survive repeated use.

### Acceptance and accessibility

- A test harness can invoke `trip → fall → pickUp → carry → putDown → recover` through the actual Mascot API and observe every state and event without opening the animation UI.
- Two different compatible rigs can interact without invalid attachment, lost actors, ghost collisions or duplicated animation ownership.
- A deterministic seed reproduces a comedy callback later in the same permitted session. The same gag is suppressed by cooldown/variety rules when inappropriate.
- Reduced-motion, pause, disable and keyboard input provide graceful alternatives; no forced sound, frightening injury, excessive flashing or occlusion of productive UI.
- On 4 GB-class hardware, a low-cost keyframe/rig fallback can perform the same *comic intent* without full ragdoll physics or expensive fluid simulation. Profile timing and responsiveness rather than assuming parity.
- The behavior API and its fixtures can eventually join the Universal Agentic Test Corpus as a fourth **mascot-interaction** domain through an adapter, sharing scenario generation, state-transition checks, reproducible failures and regression records. Mascot behavior must **never** become a prerequisite for BOOT, RIGHT-CLICK or UNIVERSAL FILE API correctness.
- These are future **REDOWN Mascot API** requirements. As already planned, the first standalone Click2Cloud release excludes the public SKIN and Mask/MASCOT extensibility APIs, even if REDOWN retains some built-in decorative character animations.

