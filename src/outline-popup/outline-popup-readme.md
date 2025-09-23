# Notion-like Floating Outline (rail + hover popup)

The script builds a Notion-style outline for headings on Bullet-rendered pages: a compact right rail shows section bars and a hover/focus popup reveals a clickable table of contents.

## Features

- Right rail with bars showing document hierarchy
- Hover/focus popup with clickable outline items
- Current section tracking and highlighting in both rail and popup
- Dynamic vertical position: outline follows page title
- Mobile-friendly: optional fullscreen popup on coarse pointer devices
- Themeable: light/dark tokens and CSS variables; no inline styles
- Accessible: ARIA roles/states, focus management, keyboard-friendly targets

## Usage

Read the repo's [README](../../README.md) for general installation instructions.

Add the CSS and JS to Bullet's Code area site-wide (per-page is possible, but not recommended).
Optionally add a config `<span>` to a `bullet:HTML` code block to tweak behavior.

The outline will appear automatically if the page contains at least `data-min-items` (default is 3) headings.

Mobile fullscreen mode toggles a `body` class:

- `body.dsbullet-mobile-popup` — applied when fullscreen popup is active (automatically detected after the script start via media query or forced via config). This class enables fullscreen layout and shows the close button.

## Configuration

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

## Technical Notes

- The script exposes a minimal API that allows other scripts to reuse its scroll/resize event handling for a consistent experience.
  I use this in the `navigation-popup` addon to add a similar left-side popup for site navigation.

## License and Support

This project is licensed under the MIT License (see the [LICENSE](../../LICENSE) file for details).

Public repository: [dsent/bullet-addons](https://github.com/dsent/bullet-addons)

For support, please [open an issue](https://github.com/dsent/bullet-addons/issues) on GitHub.

© 2025 Danila Sentyabov ([dsent.me](https://dsent.me))
