# Left-side Navigation Popup (handle + popup)

This script creates a left-side navigation handle (“launcher”) and hover/focus popup built from a Notion list view.
It is similar to the Outline popup, but instead of showing headings on the current page, it shows links to other pages.

The script can be used to create a site-wide navigation menu, or a local menu for a section of the site, or a list of related articles,
extra resources, etc.

**Important:** this script depends on the Outline popup script. It waits for the Outline API (`window.DSBulletOutline`) or the `bullet-outline:ready` event before attempting to build. The outline is used for alignment and coordinated behavior; make sure the `outline-popup` addon is also loaded on the page, or the navigation addon won't work.

## Features

- Compact launcher on the left edge that reveals a popup on hover/focus/click.
- Nav items cloned from a Notion list view (collection/list) up to a configurable depth
  (note that the included stylesheets supports a maximum of 3 levels).
- If list items have icons, they are copied.
- Highlights the current page if it is present in the list.
- Accessible: ARIA roles, keyboard navigation (ArrowUp/ArrowDown, Enter, Space, Escape), focus management.
- Mobile-friendly: shows a close button on coarse-pointer devices and supports touch interactions.
- Lightweight and idempotent: initializes once and cleans up if no items are found.

## Usage

Read the repo's [README](../../README.md) for general installation instructions.

- Add the CSS and JS to Bullet's Code area site-wide (per-page is possible, but not recommended).
- Add a mandatory HTML marker to each page that should include the navigation popup (see Configuration below).

The script will look for a Notion list view specified in the marker and use it as the source for the popup. Ensure the `outline-popup` addon is present; the navigation waits for it to become available before doing anything.

After building the navigation, the list will be removed from the page by default. It makes sense to also add
a style rule to hide the original list so it doesn't flash before being removed and doesn't stay visible
in case the script fails.

## Configuration

Place a config element anywhere in the document to override defaults. The script reads a `#dsbullet-nav-config` element
(configurable in the script's constants) and accepts the following `data-*` attributes:

- `data-nav-source` — CSS selector resolving to a `.notion-list-body` or a parent that contains one. When provided, the script will use this element as the nav source.
- `data-nav-keep-source` — `true|false` (default `false`). If `false`, the original collection/list element will be removed from the page after the nav is built.

Example config:

```html
<!-- put this into a HTML code block with the caption "bullet:HTML"
 right before a database view named "Navigation Popup" to use it as a navigation source -->
<style>.notion-collection:has(> .view-navigation-popup) { display: none; }</style>
<span id="dsbullet-nav-config"
  data-nav-source=".notion-custom-code:has(#dsbullet-nav-config) + .notion-collection > .view-navigation-popup .notion-list-body"
></span>
```

## Troubleshooting

- If no navigation appears, check that a `.notion-list-body` exists and that the page includes the Outline script or emits `bullet-outline:ready`.
- Use devtools to inspect console logs starting with `navigation-popup:` for helpful diagnostics.

## License and Support

This project is licensed under the MIT License (see the [LICENSE](../../LICENSE) file for details).

Public repository: [dsent/bullet-addons](https://github.com/dsent/bullet-addons)

For support, please [open an issue](https://github.com/dsent/bullet-addons/issues) on GitHub.

© 2025 Danila Sentyabov ([dsent.me](https://dsent.me))
