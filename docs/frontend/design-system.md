# Visual system and accessibility behavior

The implemented UI uses Satoshi from local WOFF2 files, paper-like warm surfaces, graphite navigation, and a muted vermilion accent. Core CSS tokens: canvas `#f7f6f3`, ink `#262623`, muted `#676761`, line `#deded7`, accent `#b94c35`, hover `#9d3f2c`, accent wash `#f8ece7`, and panel `#efeee9`.

`globals.css` integrates Tailwind through PostCSS and defines the component classes. Text/source/document areas favor restrained borders and spacing over heavy card decoration. Settings and authentication share buttons, inputs, error/success feedback, and focus treatments. Phosphor supplies the current visible icon family; lucide remains a declared dependency and is not evidence of a second intentional visual direction.

A visible focus outline, labeled inputs/buttons, semantic tables/captions, live status/alerts, native dialog, separator keyboard controls, and readonly affordances support access. CodeMirror has a source-editor label. PDF canvas has a page label, but a canvas preview is not a semantic text representation of the PDF. Avoid claiming a full accessibility certification from these features.

The editor fits the viewport with independent source/PDF scrolling. Mobile uses source/preview tabs and a toggleable file panel. CSS adapts around 767px and wider tablet/desktop ranges; browser tests use 390px and desktop viewports and check horizontal overflow. Billing uses a semantic comparison table with responsive containment.

Auth animation uses GSAP/useGSAP and CSS transitions with reduced-motion handling. CSS also disables applicable animation/transition effects under reduced motion. Motion should support feedback rather than delay form completion.

[DESIGN.md](../../DESIGN.md) contains the detailed design specification and history; the current CSS/component implementation wins if prose drifts. Font provenance is recorded in [font notes](../../src/app/fonts/README.md). Design review screenshots are local generated artifacts, not bundled production assets.

## Implementation references

- [src/app/globals.css](../../src/app/globals.css)
- [src/app/layout.tsx](../../src/app/layout.tsx)
- [src/components/auth-specimen.tsx](../../src/components/auth-specimen.tsx)
- [DESIGN.md](../../DESIGN.md)
