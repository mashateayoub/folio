---
name: Folio
description: A document-focused LaTeX workbench with warm paper and precise controls.
colors:
  canvas: "#f7f6f3"
  surface: "#ffffff"
  panel: "#efeee9"
  ink: "#262623"
  muted: "#676761"
  line: "#deded7"
  graphite: "#242522"
  accent: "#b94c35"
  accent-hover: "#9d3f2c"
  accent-wash: "#f8ece7"
  danger: "#9e3529"
  error-ink: "#933b2d"
  error-bg: "#fff2ee"
  error-line: "#e9c9c1"
  success-ink: "#315c41"
  success-bg: "#edf5ef"
  success-line: "#c5dbce"
typography:
  display:
    fontFamily: "Satoshi, sans-serif"
    fontSize: "46px"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Satoshi, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Satoshi, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Satoshi, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Satoshi, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  source:
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    fontSize: "13px"
    lineHeight: 1.8
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "28px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "14": "56px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-text:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  auth-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  nav-item:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
  role-badge:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  project-list:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "28px"
---

# Design System: Folio

## Overview

**Creative North Star: "The Document Workbench"**

Folio gives writing a quiet, precise home. Warm paper surfaces, graphite text, and muted vermilion place the source and its typeset result at the center. The application uses self-hosted Satoshi; source uses monospace, while document output retains its own typography.

Controls are compact and legible. Rules and tonal changes organize everyday work; soft shadows identify floating dialogs and paper previews. The authentication specimen expresses the source-to-document relationship on a graphite field, with motion limited to its entrance.

**Key Characteristics:**

- Warm paper, graphite text, and one vermilion action accent.
- Self-hosted Satoshi with monospace source and independent document typography.
- Flat task surfaces, contained editing panes, and soft elevation for paper and dialogs.
- Regular Phosphor icons, visible focus, and reduced-motion support.

## Colors

Warm neutrals pair with a restrained print-like accent. Frontmatter owns exact values.

### Primary

- **Muted Vermilion** (`accent`): primary actions, compile, selected file icons, and focus.
- **Deep Vermilion** (`accent-hover`): primary action hover.
- **Vermilion Wash** (`accent-wash`): document marks, selection, and informational feedback.

### Neutral

- **Warm Paper** (`canvas`): backdrop, sidebar, and secondary toolbars.
- **Writing White** (`surface`): source, controls, project list, dialogs, and document paper.
- **Soft Board** (`panel`): preview surround, navigation selection, and filter grouping.
- **Graphite Ink** (`ink`): primary text; **Quiet Ink** (`muted`): supporting text; **Paper Rule** (`line`): borders and dividers.
- **Graphite Field** (`graphite`): authentication story panel.

### Semantic Feedback

Danger uses a deeper red. Errors and success have dedicated text, background, and border tokens. Success green remains feedback rather than a second brand accent.

**The Action Accent Rule.** Use vermilion for actions, focus, and meaningful document state; preserve neutral surfaces for reading and editing.

## Typography

**Display and Body Font:** Satoshi, self-hosted regular, medium, and bold (400, 500, 700), with sans-serif fallback. The three WOFF2 files load through `next/font/local` with swap rendering.

**Source Font:** SFMono-Regular, Consolas, Liberation Mono, monospace. The authentication document specimen uses Georgia and Times New Roman to represent typeset output.

### Hierarchy

- **Display:** medium authentication heading (46px, 1.08), growing to 52px on wide desktop and reducing to 38px and 32px at narrower breakpoints.
- **Headline:** bold library heading (34px, 1.25), reducing to 25px on mobile.
- **Title:** bold authentication/settings heading (30px, 1.25), reducing to 26px on mobile. Medium section headings use 18–20px.
- **Body:** regular application text (14px, 20px); descriptive paragraphs commonly use relaxed line height (1.625). Settings prose is constrained to 65ch.
- **Label:** medium controls (13px); compact metadata uses 10–12px. Source uses 13px at 1.8 line height. Revisions and PDF controls use tabular numerals.

**The Document Type Rule.** Keep application hierarchy in Satoshi and source in monospace; preserve the typography chosen by each compiled document.

## Layout

Spacing follows a 4px rhythm with half steps for compact icon/text gaps. Desktop navigation is 64px tall. The library has a 224px rail and a content area capped at 1240px with 48px horizontal padding and 56px top space. Aligned project rows are at least 96px tall. At 1100px the rail becomes 184px and padding contracts.

The editor shell contains 100dvh. Its 80px minimum title bar and 48px pane toolbars lead into a 216px file sidebar and resizable source/PDF split, initially 50/50. Source and preview own their scrolling. Settings use a 200px secondary navigation column, 48px gap, and 800px content maximum inside a 1240px shell.

Authentication uses a 1.15fr/1fr split, a form column with 420px minimum width, and a 360px form maximum. At 1440px the story panel gains room and larger display type.

At 767px and below, library navigation hides and rows retain title and access metadata. Editor files become a toggleable overlay; source and preview switch through tabs and the resize handle hides. Authentication stacks and hides its specimen; settings navigation wraps horizontally. Dialogs retain 16px viewport margins, a 520px maximum width, and an 85dvh height limit.

**The Contained Workbench Rule.** Keep source and PDF scrolling inside their panes and reserve the viewport for the editing task.

## Elevation & Depth

Borders and warm tonal layering establish everyday structure. Soft shadows distinguish paper and dialogs; they are not a general card treatment.

### Shadow Vocabulary

- **Filter selection:** `0 1px 2px #2626230a`.
- **PDF paper:** `0 4px 18px #26262312`.
- **Empty paper mark:** `0 4px 18px #2626230c`.
- **Dialog:** `0 16px 70px #24252233`, over a `#24252266` backdrop with 3px blur.
- **Authentication paper:** `0 16px 40px #15161233`.

**The Paper Lift Rule.** Reserve substantial elevation for document paper and floating dialogs; use rules and tone for ordinary navigation and content sections.

## Shapes

Main controls use gentle 8px corners. Compact icon/file/filter controls use 6px, project lists and document specimens use 12px, and dialogs use 16px. Full rounding belongs to toggles and state dots. One-pixel rules define boundaries; settings sections stay flat.

## Components

### Buttons

Direct, compact controls. Primary, secondary, and danger buttons share 8px corners, 40px minimum height, 13px medium text, and 8px by 16px padding. Primary uses vermilion and white. Secondary uses white, ink text, and a paper-rule border; hover shifts to warm paper and a muted border. Text and icon buttons use soft-board hover. Compact compile uses 6px corners and 32px minimum height; authentication submit expands to 48px and full width.

State transitions last 160ms. Enabled buttons scale to 0.98 when pressed. Global keyboard focus uses a 2px vermilion outline with 3px offset. Disabled buttons use 45% opacity and a blocked cursor.

### Chips

Informational role badges present real membership/plan context: warm-paper fill, paper-rule border, 6px corners, 11px medium text, and 4px by 8px padding. Segmented library filters instead use soft board with a white selected button and subtle selection shadow.

### Cards / Containers

The project list is one white, rule-bordered container with 12px corners. Rows divide with rules and gain warm-paper hover. Document marks use vermilion wash, or soft board when archived. Settings sections use top rules. Dialogs use elevation and 28px padding, reduced to 20px on mobile.

### Inputs / Fields

Labels sit above fields. Main fields use 8px corners and one-pixel paper rules. Authentication fields are white with 48px minimum height and 12px by 14px padding; focus shifts the border to vermilion and adds a 3px wash ring. Search uses a 36px containing field and accent border on focus within. Feedback retains semantic text, background, border, and wrapping. The editable project title uses an accent underline on focus.

### Navigation

Medium 13px labels pair with regular Phosphor SVG icons. Rows are at least 40px high, with 8px corners and 10px by 12px padding. Hover and active states use soft board and ink; the active leading icon gains vermilion. Mobile settings navigation wraps; library navigation hides. Accessible names preserve full labels where visible text truncates.

### Source and Document Pair

File selection, source tab, compile toolbar, PDF controls, and saved/build revision labels form the signature workbench. The source editor uses white, a warm active line, vermilion cursor, and monospace. Document paper stays white against soft board. Authentication echoes this pair in one connected workbench on graphite: a pale frame joins the source and paper, with a 48% source column and 470px minimum height. The user selected this larger composition in live review. One scoped GSAP entrance moves the entire workbench together (6px lift, 0.8s expo.out); the panes do not animate independently. It runs once at 768px and above without a reduced-motion preference; cleanup reverts animation. The heading and description keep their short reading sequence. Mobile presents the authentication form directly, and reduced motion suppresses spatial entrances.

## Do's and Don'ts

### Do:

- **Do** keep reading and editing surfaces neutral and reserve vermilion for actions, focus, and document state.
- **Do** use self-hosted Satoshi, regular Phosphor SVG icons, and the established source monospace stack.
- **Do** contain source/PDF scroll areas and switch them through mobile tabs.
- **Do** preserve labeled fields, visible keyboard focus, semantic feedback, and reduced-motion behavior.
- **Do** show actual project metadata and meaningful saved/build states.

### Don't:

- **Don't** reintroduce the former pale-green and serif application identity.
- **Don't** use typeset document fonts for the application display hierarchy.
- **Don't** add perpetual decorative motion to editing panes or project lists.
- **Don't** invent activity, collaborators, performance metrics, or customer proof.
