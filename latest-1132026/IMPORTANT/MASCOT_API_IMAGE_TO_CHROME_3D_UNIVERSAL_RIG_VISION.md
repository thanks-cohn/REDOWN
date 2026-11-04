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

## Owner's guiding principle

> **Upload the character you imagine. REDOWN turns it into a chrome 3D mascot. The Mascot API gives it motion and a social life. Motion Studio lets you invent its moves. Export lets you take your creation into games and other worlds.**

The feature should feel effortless to creators, while the engineering contract remains composable, testable, portable, and honest about the considerable image-to-3D/rigging challenge.
