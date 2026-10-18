# Legends Road --- Visual, Gameplay and Experience Redesign Specification

**Purpose:** Implementation-ready redesign brief for Claude Code\
**Audience:** Claude Code / development team\
**Product target:** A polished, mobile-friendly 3D street-racing story
game\
**Status:** Proposed specification --- inspect the existing repository
before implementation

------------------------------------------------------------------------

## 0. Non-negotiable implementation rules

1.  **Audit before changing.** Inspect the current repository,
    framework, renderer, scene setup, assets, controls, progression data
    and save system. Report the actual architecture and identify what
    already works before editing.
2.  **Preserve working features.** Do not replace the entire game or
    remove existing features simply because they are not mentioned here.
    Map every current feature to `keep`, `improve`, `simplify`, or
    `remove`, and explain any destructive change.
3.  **No fake functionality.** Every visible button must work. If a
    feature is not implemented, do not display it as if it is complete.
    Do not use placeholder buttons that do nothing.
4.  **Build incrementally.** Implement in small, testable phases. After
    each phase, run the app, check browser console/runtime errors, and
    test desktop and mobile layouts.
5.  **Respect performance.** A visually impressive game must remain
    playable on mid-range Android phones and ordinary laptops. Use
    scalable quality settings, asset budgets, level-of-detail (LOD),
    instancing, texture compression where supported, and lazy loading.
6.  **Do not invent asset paths or libraries.** Confirm installed
    dependencies and actual asset paths before using them. Prefer
    existing assets if suitable; create a clear asset manifest for
    anything missing.
7.  **No one-file rewrite.** Keep rendering, gameplay, UI, data,
    progression and persistence separated in the project's existing
    architectural style.
8.  **Deliver evidence.** At the end of each phase, report changed
    files, behaviour added, tests performed, known limitations and the
    next recommended task.
9.  **Avoid giant HUDs.** The racing experience and world must dominate
    the screen. Secondary information should appear only when useful.
10. **Use the actual project as the source of truth.** This
    specification describes the target experience; it does not prove
    that any particular feature or engine already exists.

------------------------------------------------------------------------

## 1. Product vision

Create a cinematic, character-driven 3D racing game in which every race
feels different, the cars look desirable, each city has its own
identity, and the player's decisions affect money, vehicles,
relationships and the story.

The player fantasy: - "I am driving a beautiful, powerful car through a
believable city." - "My rivals recognise me and react to what I do." -
"My choices have consequences." - "My garage and cars visibly improve
because of my progress." - "I want to play one more race to discover
what happens next."

The game should feel premium, lively and emotionally engaging---not like
a dashboard with a race attached.

### Core design pillars

1.  **Driving first:** responsive handling, readable roads, convincing
    speed and satisfying feedback.
2.  **A world with identity:** cities must differ in architecture, road
    design, vegetation, lighting, atmosphere and traffic.
3.  **Cars worth collecting:** attractive silhouettes, detailed
    materials, meaningful upgrades and clear visual customisation.
4.  **Story with consequences:** memorable rivals, meaningful choices
    and episode-ending hooks.
5.  **Progress that feels earned:** race rewards, reputation, garage
    improvements and unlocks that visibly change the experience.
6.  **Clarity over clutter:** one primary objective at a time and a
    restrained HUD.

------------------------------------------------------------------------

## 2. First task: repository audit and baseline

Before implementation, Claude Code must:

-   Identify the framework, language, rendering engine (if any), entry
    points and build/test commands.
-   Identify whether the game uses a true 3D engine, a 2D/canvas
    approximation, pre-rendered visuals or a hybrid.
-   Inventory current screens, cities, cars, race modes, story/episode
    systems, economy, settings, sound, input methods and saved data.
-   Identify the actual visual assets and their licenses/source notes.
-   Test the current game at a minimum of:
    -   360--390 px mobile viewport
    -   768 px tablet viewport
    -   1366 × 768 desktop viewport
-   Record current performance issues, console errors, broken controls
    and layout problems.
-   Create a short `REDESIGN_AUDIT.md` with:
    -   Current architecture
    -   Existing features and their state
    -   Main visual/gameplay problems
    -   Performance risks
    -   Recommended implementation sequence
    -   Any feature in this document that is blocked by the current
        technology

**Do not start a large refactor until this audit is complete.**

------------------------------------------------------------------------

## 3. Visual direction

### Target aesthetic

A modern, cinematic, stylised-realistic racing game. Aim for strong
visual design and coherent art direction rather than noisy,
over-detailed photorealism.

-   Clear car silhouettes and attractive paintwork.
-   Warm, atmospheric lighting with controlled highlights.
-   Rich but restrained colour grading.
-   Cities with layered depth: foreground road, street-level activity,
    midground buildings and a distant skyline.
-   Realistic proportions, consistent scale and grounded shadows.
-   Clean typography and minimal overlays.
-   Cinematic moments at race starts, finishes and story beats.

Avoid: - Flat, empty roads with scattered generic boxes as buildings. -
Repeated identical buildings, trees, lamp posts or cars in obvious
patterns. - Plastic-looking car paint, floating wheels, cars without
visible contact shadows, or wheels that do not align with the road. -
Excessive bloom, oversaturated neon everywhere, extreme motion blur or
unreadable dark scenes. - Low-resolution stretched textures, visible
seams, texture flicker and z-fighting. - Random decorative objects that
obstruct the road or have no purpose. - Tiny text, crowded panels and
multiple competing accent colours.

### Suggested visual system

Use a small, consistent palette: - Deep charcoal / midnight blue for
menus and dark surfaces. - Warm ivory for primary text. - One vivid
racing accent such as amber, electric cyan or red-orange. - Green only
for positive financial/progression feedback where appropriate. - Use
city-specific colours as environmental accents, not as a different UI
design on every screen.

Typography: - One display face for major titles and one highly legible
sans-serif for UI. - Use short labels, strong hierarchy and consistent
spacing. - Avoid long text blocks during active racing.

------------------------------------------------------------------------

## 4. Car visual overhaul

Cars are the player's most important visual asset. Prioritise them
before adding more minor UI features.

### 4.1 Exterior model and proportions

Each playable car should have: - A recognisable silhouette and distinct
front, side and rear profiles. - Correctly proportioned body, cabin,
bonnet, bumpers and wheel arches. - Four correctly placed wheels with
tyres, rims and visible sidewalls. - Front and rear lights; mirrors;
windows; door seams; grille/intake details; handles; exhausts where
appropriate. - A believable underbody clearance and wheel-to-road
contact. - Consistent scale across all vehicles. - No visible clipping
between wheels and body during steering or suspension movement.

Do not use real manufacturer badges or exact trademarked vehicle designs
unless the project has the necessary rights. Create original vehicle
designs inspired by broad vehicle classes.

### 4.2 Materials and paint

Use physically based materials if supported by the renderer: - Car
paint: glossy clear coat with controlled reflections, not mirror-like
chrome. - Glass: subtle tint and reflections while preserving
visibility. - Tyres: matte rubber with sidewall detail and tread where
visible. - Rims: metallic finish with readable spoke geometry. - Lights:
emissive lenses that look bright without washing out the body. - Plastic
trim: less reflective than body paint. - Windows should not appear as
opaque black holes unless that is an intentional art style.

Offer paint finishes such as gloss, metallic and matte only if they can
be rendered distinctly and consistently.

### 4.3 Lighting and reflections

-   Use a coherent environment-lighting approach.
-   Provide visible highlights that follow the body curvature.
-   Add contact shadows beneath tyres and the chassis.
-   Ensure the car remains readable in bright daylight, overcast
    weather, dusk and night.
-   If real-time reflections are too expensive, use an appropriate
    environment map or reflection approximation rather than expensive
    full-scene reflections on every device.
-   Avoid excessive bloom and blown-out headlights.

### 4.4 Wheel and suspension behaviour

-   Wheels must rotate with speed and steer with the front axle.
-   Wheel rotation must match the car's travel direction and speed.
-   Keep tyres aligned with the road surface as far as the physics model
    allows.
-   Add subtle body roll, pitch under braking/acceleration and
    suspension response if supported.
-   Do not exaggerate suspension motion enough to make the car feel
    unstable or toy-like.

### 4.5 Damage and driving feedback

If the current physics/asset setup supports it: - Show lightweight,
staged damage: scuffs, dents or cracked lights after hard collisions. -
Use brief sparks or dust only when appropriate. - Trigger a restrained
camera shake and impact sound on significant collisions. - Damage must
not obscure essential driving visibility. - Repairs should restore the
car visually and have a clear, understandable cost. - Avoid expensive
real-time mesh deformation unless the project can support it.

### 4.6 Customisation

Build a garage customisation screen that lets players preview changes
before spending currency: - Paint colour and finish - Rim style and
colour - Window tint - Optional decals/livery - Front/rear visual
accessories only where supported - Performance upgrades displayed
separately from cosmetics

Every choice should update the car preview immediately. Show the price
and resulting change before confirmation. Provide **Apply**, **Cancel**
and **Reset** behaviour. Do not charge currency until the player
confirms.

### 4.7 Car camera and presentation

-   Provide a smooth orbit camera in the garage, with sensible rotation
    limits and zoom.
-   Use a three-quarter front view as the default showcase angle.
-   Include a rear/side view without clipping the camera through the
    car.
-   Use a slow presentation turn or subtle lighting sweep only if
    performance permits.
-   Keep the camera motion comfortable and avoid constant spinning.
-   During races, prioritise road visibility and stable framing over
    cinematic movement.

### Car acceptance criteria

-   All available cars have consistent scale and grounded wheels.
-   No missing materials, obvious placeholder geometry or broken
    textures in the main garage view.
-   Car paint and glass respond plausibly to the lighting.
-   The car is readable on a small phone screen.
-   Customisation previews work and currency is only deducted after
    confirmation.
-   Vehicle presentation does not cause unacceptable frame-rate drops.

------------------------------------------------------------------------

## 5. City and environment overhaul

Every city must feel like a distinct place, not the same road with a
different background colour.

### 5.1 Build each city in layers

1.  **Road layer:** readable lane markings, road edges, junctions,
    curbs, drainage, barriers and surface variation.
2.  **Street layer:** sidewalks, shopfronts, bus stops, streetlights,
    signs, parked vehicles and safe decorative activity.
3.  **Architecture layer:** varied building heights, setbacks,
    materials, balconies, roof shapes and façade details.
4.  **Vegetation layer:** locally appropriate trees, shrubs, planters
    and grass, placed with believable density.
5.  **Atmosphere layer:** skyline, distant hills or coast where
    appropriate, clouds/haze, ambient lighting and a coherent colour
    grade.
6.  **Life layer:** traffic, pedestrians in safe areas, moving lights,
    flags, vendors or other city-appropriate activity where supported.

Use the layer system to create depth. The road and immediate driving
space must remain visually clear.

### 5.2 Architecture and repetition

-   Create a small library of modular building families for each city.
-   Vary building height, façade, roof, colour, window pattern and
    placement.
-   Use deliberate repetition only where it makes sense, such as a
    planned residential block.
-   Avoid copying one building across the entire skyline.
-   Use signs and storefronts to make neighbourhoods recognisable.
-   Use original fictional business names and avoid garbled pseudo-text
    on important signs.
-   Keep distant buildings simpler than near-road buildings to protect
    performance.

### 5.3 Roads that look and drive well

-   Use clear lane markings with correct scale and perspective.
-   Vary road widths only when the route design calls for it.
-   Add curbs, barriers, drains, road patches and surface changes
    sparingly.
-   Make corners readable early enough for the player to react.
-   Ensure road geometry and collision geometry agree.
-   Do not place decorative props inside the drivable path unless they
    are intended obstacles.
-   Add unique route landmarks so players can remember where they are.
-   Avoid long empty straights unless they serve a gameplay purpose.

### 5.4 Lighting, sky and weather

Each city/route should have a deliberate time-of-day and lighting
plan: - Day: readable shadows, natural sky and controlled contrast. -
Sunset: warm key light, longer shadows and clear road visibility. -
Night: legible road edges, functional street lighting, controlled signs
and headlights. - Rain: wet-road reflections, lower grip only if the
handling system supports it, visible droplets/spray if affordable. -
Fog/haze: use sparingly and never conceal upcoming hazards unfairly.

Weather must affect gameplay only when its effect is communicated to the
player. Do not silently change vehicle handling.

### 5.5 Ambient motion

Add subtle world movement where affordable: - Traffic moving in the
correct direction. - Animated signals or signage. - Tree/flag movement
in wind. - Water movement near waterfront areas. - Distant aircraft,
boats or skyline motion only when appropriate. - People standing or
moving in safe pedestrian areas.

Do not add crowds of complex animated characters as a first step. A few
well-placed moving elements are better than a busy but poorly performing
scene.

------------------------------------------------------------------------

## 6. Proposed city identities

These are art-direction examples. Match them to the actual city list in
the repository; do not silently replace existing cities. If the game
uses fictional cities, preserve their names and adapt the visual
principles.

### Lagos-inspired route --- dense, energetic and unpredictable

**Visual identity:** tropical coastal megacity, dense mixed-use streets,
modern towers in the distance, local commercial frontages, bus stops,
overhead cables where appropriate, roadside vegetation and lively
traffic.

**Palette and atmosphere:** warm sunlight, concrete neutrals, saturated
shop accents, humid distance haze and vibrant dusk.

**Route design:** traffic-heavy boulevard, tight commercial street,
flyover or elevated road, sharp but readable shortcuts.

**Signature moments:** skyline reveal, waterfront view, a busy junction,
dramatic sunset finish.

**Avoid:** reducing the city to generic huts, copying real brands
carelessly, placing traffic or pedestrians where collision rules are
unclear, or filling every surface with clutter.

### Abuja-inspired route --- planned, broad and prestigious

**Visual identity:** wide boulevards, landscaped medians, modern civic
architecture, organised districts, clean road furniture and distant
rocky hills where suitable.

**Palette and atmosphere:** warm stone, muted green landscaping, clear
blue sky and golden-hour lighting.

**Route design:** high-speed boulevard, sweeping corners, roundabouts
and technical sections that reward smooth driving.

**Signature moments:** monumental skyline or civic-plaza view,
landscaped median and a long championship approach.

**Avoid:** making every road a straight highway or using identical
buildings throughout the route.

### Coastal route --- humid, scenic and weather-sensitive

**Visual identity:** ocean or lagoon views, coastal barriers, palms and
tropical greenery, varied low-rise buildings and selected modern
waterfront structures.

**Palette and atmosphere:** blue-green water, warm pavement, humid haze
and bright skies that can transition into rain.

**Route design:** flowing coastal road, exposed bridge, sharper bends
and a rain-capable section if weather handling is supported.

**Signature moments:** water glinting in the distance, bridge crossing,
changing weather and a dramatic finish near the waterfront.

**Avoid:** overusing water reflections, blocking road visibility with
vegetation, or using rain solely as a visual filter with no communicated
gameplay purpose.

### Additional city template

For each other city in the game, define these fields before creating
assets: - City name and narrative purpose - Three signature landmarks -
Architecture and street layout - Local vegetation and terrain - Time of
day and weather - Road types and signature race mechanic - Main and
secondary environmental colours - Unique audio/ambient cues - Asset
reuse plan - Performance budget

No two cities should share all of their landmarks, lighting, road design
and palette.

------------------------------------------------------------------------

## 7. Race experience and controls

### 7.1 Race readability

The player must always understand: - Where to drive - How far remains -
Current position - The immediate objective - Whether a boost or special
ability is ready - Why a penalty, collision or reward occurred

Use a compact HUD: - Position and lap/checkpoint information - A small
route/minimap only if it genuinely helps navigation - Speed only if it
supports the driving experience - One primary objective prompt -
Nitro/boost indicator only if that mechanic exists

Hide garage, story, economy and advanced settings panels during active
racing.

### 7.2 Controls

-   Test keyboard and touch controls separately.
-   On mobile, use large, comfortably spaced controls with clear pressed
    states.
-   Avoid covering the road apex or important hazards with touch
    controls.
-   Support pause/resume and restart with confirmation where progress
    can be lost.
-   Make steering input responsive and consistent.
-   If tilt steering is offered, make it optional and explain how to
    enable it.
-   Never make the core game dependent on a control method unavailable
    on the target device.

### 7.3 Driving feel

Prioritise: - Predictable steering response - Braking that feels
distinct from coasting - Readable acceleration - Stable camera follow -
Appropriate sense of speed - Fair collision response - Clear recovery
after leaving the road

If a fully realistic vehicle simulation is beyond the existing engine,
aim for satisfying arcade handling rather than half-implemented realism.

### 7.4 Race variety

Each episode should use a defined race objective, such as: - Standard
circuit or point-to-point race - Time trial - Rival duel - Checkpoint
challenge - Clean-driving challenge - Limited-boost challenge - Weather
challenge - Comeback race after a story setback - Optional side
objective such as collecting a safe route token

Do not introduce all modes at once. Implement a small set well and reuse
them with different route design and story context.

------------------------------------------------------------------------

## 8. Story, rivals and player choices

### 8.1 Character identity

For each major character, define: - Motivation - Strength - Flaw -
Driving style - Relationship to the player - Visual signature -
Voice/text style - What changes their opinion of the player

Avoid making all rivals interchangeable. Give each rival a distinct
driving pattern and a recognisable car silhouette/colour.

### 8.2 Meaningful decisions

Decisions should change at least one meaningful state: - Money or repair
cost - Reputation - Rival relationship - Garage or car access - A later
race condition - An episode scene or ending

Avoid false choices where every option produces the same outcome without
an intentional narrative reason.

Example: **A rival is stranded before a qualifying race.** - Help: spend
time or money, gain relationship/reputation, possibly unlock a later
favour. - Continue: protect your race preparation, but the rival
remembers your choice. - Negotiate: spend money or use a reputation
check if the existing game supports such a system.

Show concise consequences where appropriate, but preserve uncertainty
when it is part of the drama.

### 8.3 Episode structure

Each episode should have: 1. A short setup that establishes the stakes.
2. A clear race objective. 3. One distinctive race event or mechanic. 4.
A reward and consequence. 5. A brief rival/character reaction. 6. A hook
for the next episode.

Avoid long exposition before the player can drive. Deliver story through
short dialogue, race events and post-race scenes.

### 8.4 Multiple endings

Only add branching endings after the core story state system is
reliable. Endings may depend on championship performance, garage
finances and key relationships. Track choices explicitly rather than
inferring them from loosely related values.

------------------------------------------------------------------------

## 9. Economy, garage and rewards

### Keep the economy understandable

Every currency type must have a clear purpose. Avoid adding several
currencies that all buy essentially the same things.

Suggested loop: - Race rewards provide money and reputation. - Repairs
consume money after significant damage. - Upgrades improve handling,
acceleration, braking or boost only if these attributes exist in the
game. - Cosmetics change appearance without secretly changing
performance. - Garage upgrades unlock practical benefits or visual
changes. - Episode completion unlocks new routes, cars or story content.

### Reward presentation

After a race, use one concise results scene: - Final position and
objective result - Base reward plus clearly named bonuses - Repair cost
or penalty, if any - Reputation/story change - Newly unlocked item, if
applicable - One obvious next action

Do not stack multiple full-screen dashboards. Let players inspect
details optionally.

### Fairness rules

-   Explain upgrade effects in plain language.
-   Preview prices and outcomes before confirmation.
-   Never deduct currency twice on repeated clicks.
-   Save successful purchases reliably.
-   Avoid random rewards that make progression feel unfair or
    pay-to-win.
-   If a random reward wheel already exists, make it optional and
    supplementary rather than the main progression system.

------------------------------------------------------------------------

## 10. Sound and sensory feedback

Sound is part of the visual polish because it makes the world feel
present.

Priorities: - Engine sound changes with acceleration and speed where
feasible. - Tyre/skid audio for appropriate grip loss. - Clear collision
sound without excessive volume. - Subtle ambience that identifies each
city. - UI sounds that confirm selection, purchase, unlock and error. -
Distinct start, checkpoint and finish cues. - Music that supports
tension but does not drown out driving feedback.

Provide independent master, music, effects and ambience controls if the
existing audio architecture supports them. Respect mute settings and
avoid autoplay behaviour that violates browser restrictions.

------------------------------------------------------------------------

## 11. Interface and screen redesign

### Main menu

Show: - A striking car/city background or live scene if affordable. -
One dominant **Continue / Start Race** action based on save state. -
Secondary access to Garage, Episodes, Settings and other existing
features. - A small, readable indication of current episode/progress.

Do not show every statistic, currency counter and mode at equal visual
prominence.

### Garage

Prioritise: - Large car preview - Car name/class and current performance
summary - Clear tabs for Drive, Customise and Upgrade - Visible price
and effect of changes - An obvious return/back control

### Episode selection

-   Show episode number, city identity, objective and unlock state.
-   Use artwork or a city preview that is distinct per episode.
-   Lock future content clearly without pretending it is playable.
-   Keep descriptions short and readable on mobile.

### Results screen

-   Strong result headline
-   Position and reward
-   Important story consequence
-   Unlock/upgrade notification
-   One primary **Next** action and one secondary **Garage** action

### Accessibility and comfort

-   Readable contrast and font sizes
-   Avoid flashing effects that are not necessary
-   Allow reduced camera shake and reduced motion if practical
-   Do not communicate important information through colour alone
-   Keep touch targets large enough for phones

------------------------------------------------------------------------

## 12. Technical art and performance

### Scene performance

-   Reuse meshes and materials when appropriate.
-   Instance repeated street furniture and vegetation where supported.
-   Use LOD or simpler geometry for distant objects.
-   Cull objects outside the camera view.
-   Keep shadow-casting lights under control.
-   Avoid a unique high-resolution texture for every building.
-   Load episode assets when needed rather than loading the whole game
    at startup.
-   Compress and size textures appropriately.
-   Avoid expensive post-processing on low-quality settings.
-   Use a consistent frame-time budget; target smooth performance before
    adding extra effects.

### Quality settings

Provide at least: - **Low:** reduced shadows, simpler distant scenery,
limited effects. - **Medium:** balanced shadows and scenery. - **High:**
improved shadows/reflections/effects where supported.

Quality changes should not alter game rules or make a race unfair.
Remember the selected setting if persistence is already supported.

### Loading and failures

-   Show a useful loading state for large scenes.
-   Handle missing assets gracefully with a logged error and safe
    fallback.
-   Avoid a blank screen while a city or car loads.
-   Prevent duplicate game loops, repeated event listeners and runaway
    timers.
-   Pause or reduce expensive rendering when the game is not visible if
    appropriate to the architecture.

------------------------------------------------------------------------

## 13. Mobile-first layout

The game must work well on Samsung/Android phones as well as desktop
browsers.

-   Use responsive layouts and safe spacing around device edges.
-   Keep primary buttons visible without awkward scrolling.
-   Avoid tiny labels and narrow click targets.
-   Ensure the race canvas/scene has a useful aspect ratio.
-   Place touch controls consistently and avoid overlapping menus.
-   Prevent accidental page scrolling or text selection during active
    driving, without breaking normal navigation.
-   Test portrait and landscape; choose and document the intended
    orientation for racing.
-   If landscape is the intended racing mode, show a polite orientation
    prompt on mobile portrait rather than leaving a broken layout.
-   Check touch input, pause, resume, restart, audio toggles and scene
    transitions on a real phone when possible.

------------------------------------------------------------------------

## 14. Implementation phases

Do not implement every idea in a single change. Use the following
sequence and keep the game playable after each phase.

### Phase 1 --- Audit and stability

-   Complete repository audit.
-   Fix existing runtime errors and broken controls.
-   Establish baseline performance and screenshots.
-   Document current systems and assets.

**Exit criteria:** App starts reliably; primary flow works; known
failures are documented.

### Phase 2 --- Visual foundation and UI hierarchy

-   Establish typography, spacing, palette and reusable UI components.
-   Simplify the main menu, garage and results hierarchy.
-   Remove redundant or competing HUD elements without deleting useful
    functionality.
-   Confirm responsive behaviour.

**Exit criteria:** Main screens are coherent, legible and usable on
phone and desktop.

### Phase 3 --- Car presentation

-   Improve car geometry/materials using the best available assets.
-   Correct wheel placement, lighting, shadows and camera framing.
-   Add a clear garage preview.
-   Add cosmetic customisation only after preview and purchase logic are
    reliable.

**Exit criteria:** Main cars look intentional and attractive, with no
obvious clipping or placeholder materials.

### Phase 4 --- City art direction

-   Define a visual brief for every existing city.
-   Improve the first playable city fully before copying the pattern.
-   Add architecture variation, road detail, landmarks, vegetation,
    lighting and atmosphere.
-   Add LOD/instancing or equivalent performance safeguards.

**Exit criteria:** The first city is visually distinct, readable while
driving and performant on target devices.

### Phase 5 --- Driving feel and race variety

-   Tune controls, camera follow, collision response and road
    readability.
-   Add or improve a small set of race objectives.
-   Ensure every event is communicated fairly.

**Exit criteria:** A complete race is enjoyable, understandable and
reliably finishable.

### Phase 6 --- Progression and meaningful rewards

-   Connect rewards to the existing economy.
-   Make garage upgrades and unlocks visibly meaningful.
-   Prevent duplicate purchases/rewards and verify persistence.

**Exit criteria:** The player can understand why they earned rewards and
what those rewards change.

### Phase 7 --- Story consequences and rival identity

-   Define character/rival data.
-   Add a limited set of meaningful choices.
-   Track story states explicitly.
-   Connect choices to later dialogue, race conditions or unlocks.

**Exit criteria:** At least one decision has a demonstrable later
consequence.

### Phase 8 --- Sound, polish and final QA

-   Add sound feedback and city ambience.
-   Tune transitions, loading, accessibility and quality settings.
-   Test mobile and desktop.
-   Fix regressions before adding optional features.

**Exit criteria:** No critical console errors; main loop works from
launch to race, results, garage and next episode.

------------------------------------------------------------------------

## 15. Required testing checklist

Claude Code should test and report the following after relevant changes:

### Functionality

-   [ ] App starts and loads without a critical error.
-   [ ] Start/continue flow works.
-   [ ] Race can start, run, finish and return to results.
-   [ ] Pause/resume/restart behave correctly.
-   [ ] All visible buttons perform their stated action.
-   [ ] Purchases preview correctly and charge once.
-   [ ] Rewards are granted once.
-   [ ] Progress persists across refresh if save support exists.
-   [ ] Locked content is clearly identified.
-   [ ] Audio and quality settings behave as labelled.

### Visuals

-   [ ] Cars have grounded wheels and correct proportions.
-   [ ] No missing textures or broken materials in key views.
-   [ ] Road, collision and lane geometry agree.
-   [ ] No obvious repeated-prop pattern in the foreground.
-   [ ] Each city has identifiable landmarks and a distinct atmosphere.
-   [ ] Text remains readable on mobile.
-   [ ] HUD does not obscure essential road information.
-   [ ] Loading transitions do not leave blank or frozen scenes.

### Performance

-   [ ] No runaway timers or duplicate render loops.
-   [ ] No major frame-rate collapse caused by new assets.
-   [ ] Mobile controls remain responsive.
-   [ ] Low/medium/high settings have a measurable effect where
    implemented.
-   [ ] Large scenes load without unnecessary upfront asset loading.

### Regression

-   [ ] Existing working features still work.
-   [ ] Browser back/reload does not corrupt progression.
-   [ ] No duplicate rewards from repeated input.
-   [ ] No unhandled exceptions during a full episode.

------------------------------------------------------------------------

## 16. How Claude Code should work with this specification

For each task: 1. State the exact goal and acceptance criteria. 2.
Inspect the relevant existing files before editing. 3. Identify the
smallest safe set of changes. 4. Implement the change using the
project's current architecture. 5. Run the relevant build, test or
browser checks available. 6. Review the result at mobile and desktop
sizes. 7. Report changed files, tests run, observed result and remaining
limitations. 8. Update a `REDESIGN_PROGRESS.md` checklist.

When visual improvement is requested, do not merely change colours or
add decorative CSS. Identify the actual cause: missing geometry, poor
materials, flat lighting, repetitive layout, weak composition, incorrect
scale, bad camera framing, low-quality assets or insufficient visual
hierarchy.

When a requested visual change is blocked by the current engine or asset
pipeline, explain the constraint and offer the smallest practical
alternative. Do not pretend a CSS filter can replace real 3D geometry,
materials, lighting or environment design.

### Recommended first prompt to Claude Code

> Read `REDESIGN_SPEC.md` completely. Do not begin by rewriting the
> game. First audit the repository and the running experience. Create
> `REDESIGN_AUDIT.md` and `REDESIGN_PROGRESS.md`. Identify the actual
> renderer, current assets, working features, broken features, mobile
> limitations and the three biggest visual weaknesses. Then propose a
> phased implementation plan mapped to this specification. Do not remove
> existing features without explaining why. Wait for approval before
> undertaking a large refactor.

------------------------------------------------------------------------

## 17. Definition of success

The redesign is successful when: - A new player understands how to begin
within seconds. - The car is visually appealing before the race
starts. - The city looks intentionally designed and recognisable. -
Driving is responsive and readable. - Race events create variety without
feeling unfair. - Rewards and choices have understandable
consequences. - Progress changes the player's car, garage, access or
story. - The interface supports the race instead of competing with it. -
The experience runs reliably on mobile and desktop. - The game remains
maintainable: the next city, car or episode can be added without
rewriting core systems.

**Final priority:** Make one car, one city, one race and one progression
loop excellent. Use that as the quality benchmark for the rest of the
game.
