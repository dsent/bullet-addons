# Notion-like Floating Outline (rail + hover popup)

The script builds a Notion-style outline for headings on Bullet-rendered pages: a compact right rail shows section bars and a hover/focus popup reveals a clickable table of contents.

- Non-invasive: generates UI on top of existing Bullet markup; no theme overrides
- Works on all screen sizes; optional fullscreen popup on touch devices
- Styles live in `outline-popup.css`; behavior in `outline-popup.js`
- Auto-parses headings
- Highlights the current section while you scroll; smooth scrolls with offset; keeps URL hash in sync

Place an optional `<span id="dsbullet-outline-config">` marker to configure behavior anywhere within `<body>` (after DOM ready). Defaults are sensible, but you can override via `data-*` attributes. You can also tweak the default values directly in CSS and JS, if you want to change them for the whole site.

```html
<span id="dsbullet-outline-config"
      data-max-level="3"
      data-min-items="4"
      data-scroll-offset="112"
      data-sticky-top="151"
      data-title-offset="18"
      data-default-title="Untitled"
      data-active-anchor="center"
      data-mobile-media-query="(orientation: portrait) and (pointer: coarse) and (max-width: 768px)"
      data-mobile-popup="auto">
</span>
```

## Features

- Right rail with bars showing document hierarchy (1–3)
- Hover/focus popup with clickable outline items
- Current section tracking and highlighting in both rail and popup
- Smooth scroll with top offset and late focus on heading for accessibility
- Dynamic vertical position: outline follows page title, then sticks at a baseline
- Mobile-friendly: optional fullscreen popup on coarse pointer devices; background scroll locked
- Accessible: ARIA roles/states, focus management, keyboard-friendly targets
- Themeable: light/dark tokens and CSS variables; no inline styles
- Idempotent and lightweight: initializes once, indexes once; measures on scroll only

## Usage

Add the CSS and JS to your Bullet's Code area, either globally (recommended) or per-page.
Optionally add a config `<span>` to a `bullet:HTML` code block to tweak behavior.

The outline will appear automatically if the page contains at least `data-min-items` (default is 3) headings.

Mobile fullscreen mode toggles a `body` class:

- `body.dsbullet-mobile-popup` — applied when fullscreen popup is active (automatically detected after the script start via media query or forced via config). This class enables fullscreen layout and shows the close button.

## Technical Notes

- The script exposes a minimal API that allows other scripts to reuse its scroll/resize event handling for a consistent experience.
  I use this in another script, navigation-popup, that adds a similar popup to the left of the page for site navigation (not yet published).
