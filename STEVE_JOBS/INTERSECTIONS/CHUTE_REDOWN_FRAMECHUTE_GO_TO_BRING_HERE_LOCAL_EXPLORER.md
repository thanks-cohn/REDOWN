# INTERSECTIONS — GO TO / Bring Here: Chute × REDOWN × FrameChute
**Status:** Concept proposal, not implemented  
**Date:** 2026-11-02  
**Principle:** Apps should meet the user where their files already are. Do not confuse navigation with transfer.

## Vision
Replace or supplement Chute's ordinary attachment affordance with two expressive, clearly explained directions:
- **GO TO** (together): go to a file's location in REDOWN. Visually emphasize an italic, racing-cursive *GO* with tasteful motorsport-inspired speed and motion, while keeping the full control legible and accessible. Explore the playful Dale Earnhardt / race-car-lettering feeling without copying trademarked logos or impairing readability.
- **Bring Here:** summon REDOWN's Explorer or relevant picker *into the user's current workflow*, ideally in an adjacent pane, so users can browse the file and bring a selected item to Chute. The action is explicit; merely opening Explorer never silently uploads or attaches a file.

## Distinguish the two directions
**GO TO** takes the user to the file's actual location, selecting or highlighting it when permitted; it does not move the bytes. **Bring Here** brings a browsing or selection experience toward Chute, then requires an explicit user selection and attachment/import action. Tooltip examples:
- GO TO: “Open this file's location in REDOWN.”
- Bring Here: “Open REDOWN beside Chute and choose a file to bring here.”
If no valid location exists, explain why and provide Open Explorer as a fallback instead of fabricating a file path.

## Shared app-to-app intersection contract
Introduce a bounded cross-app navigation interface (eventually shared among Chute, REDOWN and FrameChute) with semantic requests such as:
- `openLocation({ provider, directoryIdOrPath, fileId, reveal: true, sourceApp })`
- `bringExplorer({ targetApp, preferredSide: 'left'|'right', mode: 'select', sourceApp })`
- `selectFileForTarget({ targetApp, fileRef, explicitUserAction: true })`
The interface must distinguish cloud location, local filesystem path, and REDOWN's own virtual Explorer location. Do not pass private web-source URLs or browsing provenance to cloud providers. Validate sender identity, permissions, destination, file identity, and user intent before acting.

## REDOWN native desktop app / LOCAL directories
Longer-term, the REDOWN native desktop app can open the **real local directory**, with the target file revealed, and show a local file browser on the configured **left or right** of Chute or FrameChute. The browser extension cannot freely inspect arbitrary local filesystem paths or reposition native windows by itself. Native access needs a separately installed, authorized desktop companion and a constrained handshake (for example, explicitly registered native messaging), with safe file/path scopes. Handle missing desktop app, inaccessible location and permission denials gracefully. No blanket disk scanning.

## Chute and FrameChute intersections
- Chute: discover or attach a file through Bring Here; GO TO opens its location instead of suggesting the file is inside Chute.
- FrameChute: **Open** can call REDOWN to reveal/browse the local file's directory, optionally beside the editor, while a separate explicit action opens the document for editing. Do not redefine an existing Open command without testing whether users expect to open the document itself; label “Open location” where needed.
- Later settings: enable/disable integration, choose default left/right pane, choose browser vs desktop REDOWN when both are installed, preserve existing attachments and independent workflows.
- Reuse a currently open Explorer instance if suitable; avoid spawning redundant tabs/windows.

## Mascot handoff moments
Through the **generic multi-mascot API**, compatible mascots can acknowledge app handoffs. AMEOBO and the Chute / FrameChute mascots might race toward the opened pane, point together, wave, exchange a file-shaped visual token, or celebrate a completed explicit attachment. Their adapters decide personality, physics and animation, and shared events never carry document bytes. Nonblocking, opt-in, reduced-motion-compatible; no interruption of real file operations.

## Sound is part of the identity, not an afterthought
- **Memorable, funny sound effects are a must.** Build a distinct sound language for mascot encounters, handoffs, bounces, bumps, stretching, falls, fusions and playful slapstick surprises. Keep the sounds expressive and recognizable, so people remember the ecosystem's little moments.
- **Theme/skin-driven sound palettes.** Depending on the active theme or compatible skin, the same abstract interaction may use comic boings, squeaks, pops and typewriter clacks, or futuristic sci-fi chirps, zaps, holographic sweeps and synthetic percussion. A skin should be able to declare supported sound cues and licensed audio assets. Chute should eventually support its own skins, not just REDOWN.
- **Timing matters.** Sync sound to actual contacts, animation beats and completion states; vary sounds subtly without relentless repetition. Offer mute, volume and reduced-sensory settings, respect autoplay/browser limitations and never play surprise sounds during quiet mode.

## Advanced creator-facing Mascot API: pose, geometry and contact
- **Generic semantic capabilities, mascot-specific adapters.** Extend the open contract with optional capabilities such as `pose`, `turn`, `face`, `reach`, `touch`, `push`, `tap`, `hug`, `kick`, `react`, and `playSound`. Commands require feature negotiation; a mascot that lacks a particular rig/animation must gracefully fall back rather than malfunction. Do not force every mascot to have human limbs.
- **Perceived planes and surfaces.** Define a shared *interaction geometry* abstraction: visible local 2D planes/surfaces and contact regions, transform matrices, facing angle, scale, z-order, collision footprint and reachability. A character might expose contact anchors called `leftHand`, `rightFoot`, `bodyEdge`, `head` or arbitrary named zones. These are semantic hit areas attached to animated frames/rigs, not an assumption of real 3D physics or a humanoid body.
- **Pose-aware mascot-to-mascot encounters.** Given two consenting/active mascot instances, the interaction coordinator requests a pose/facing/angle or a named animation from one mascot, calculates an appropriate contact point, and allows the other's compatible hand, foot, appendage or surface to connect at the correct visual position. Contact events can trigger sound, deformation, particle effects and follow-up reactions. The participating adapters own their artwork and motions; the coordinator owns sequencing, spatial alignment and safe fallbacks.
- **Animation availability is explicit.** Creator-authored compatibility manifests describe available clips, target poses, anchors, contact surfaces, transition timings, sound cues, material response and limits. Advanced interactions are enabled *only when* the required assets/capabilities exist. Otherwise use simpler universal interactions such as proximity, waving, nudging or speech bubbles.
- **Extensible skins and creator freedom.** A future Chute/REDOWN/FrameChute Skin API can customize appearance, materials, sounds, animations, contact maps and interaction recipes in a bounded declarative format. Creators may implement entirely different mascot anatomies and slapstick choreography while staying compatible with the generic API. Validate manifests and asset types, sandbox untrusted content, budget CPU/GPU/audio use and prohibit arbitrary privileged code or access to file contents, user paths or cloud tokens.
- **Cross-product behavior remains user-controlled.** Explicit enablement for cross-app interactions, proximity/collision constraints, no blocking Explorer controls, and a global quiet/off switch. Sound, skin and mascot choices must not change actual file actions.

## UX / engineering constraints
- Always visibly distinguish **navigation** from **copying, attaching, downloading, moving or uploading**.
- Preserve V3 right-click authority, BOOT reliability, provider privacy boundaries and existing save routes. No unreviewed engine rewrites.
- Respect browser UI/security restrictions. Side-by-side native windows, browser split view and embedded Explorer views are different capabilities and require separate feasibility tests.
- Keyboard accessible, tooltips plus visible labels, and readable racing-inspired *GO* typography.
- Every transition is optional, cancelable, and truthful about which app and which location will open.

## Phased exploration
1. Design mockups and usability test: GO TO vs Bring Here, italicized *GO*, tooltip wording, iconography and attachment affordance.
2. Document a generic inter-app request contract and entitlement/permission boundaries; test Chute ↔ REDOWN browser navigation.
3. Add optional FrameChute handoff and configurable pane placement where supported.
4. Native desktop directory handoff with installation checks, native messaging and path security.
5. Mascot-to-mascot cooperative transition animations through generic API adapters.

**Acceptance principle:** The user can see where their files really are, call REDOWN when they need it, and return to their work without ambiguity or accidental transfers. The interaction should feel playful and fast, never deceptive.
