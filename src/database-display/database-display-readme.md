# Database Display Tweaks (Bullet CSS)

This is a CSS solution that improves how Notion database views render in Bullet and adds a few customization options.

## Features

- Tabs for Database Views: converts the view dropdown into accessible, compact tabs when a database has multiple views.
  NB: There's a [much simpler alternative](https://bullet.so/docs/tabs-for-database-views/) provided by Bullet's team that is enough for many use cases.
- Always Hide Database Names: removes the inline database names from the headers. I hate them.
- Single-View Title: when an inline database has only one view, its name is shown as a title.
- List View Tweaks: fixes sub-item toggles and other quirks.

## Usage

Read the repo's [README](../../README.md) for general installation instructions.

- Copy the contents of `database-display.css` into Bullet's Code area site-wide (per-page is possible, but not recommended).
- Customize appearance by overriding CSS variables and adding optional markers to your Notion pages.

## Tabs for Database Views

### Targeting Rules (What gets tabs?)

Tabs are applied when all of the following are true:

- The database has multiple views (Bullet renders a view dropdown in the header).
- It is not preceded by a block that contains a `dsbullet-disable-tabs` marker.

The header is restructured so tabs appear on the left, and the search control sits at the top-right. The database name is hidden; in single-view databases the view name is shown as a title for context.

## List View Improvements

- Multi-level list toggles render as proper list items and align their contents consistently.
- Inline page icons in list views are not clipped.

## Opt-Out and Per-Database Flags

Place a small marker inside a `bullet:HTML` code block directly before the target list view. They can also be inside of synced blocks or toggles. The marker must be immediately followed by the database view.

- Disable tabs for views display for the next database:

```html
<span class="dsbullet-disable-tabs" />
```

- Hide the header (including search) for the next database (useful for navigation blocks and other cases where you want to display just the list/table/gallery):

```html
<span class="dsbullet-hide-header" />
```

- You can actually use both (but it doesn't make much sense as hiding the header also hides the views dropdown/tabs anyway):

```html
<span class="dsbullet-disable-tabs dsbullet-hide-header" />
```

### Flat (non-expandable) list marker: `dsbullet-flat-list`

Use this marker when your Notion list view is a flat list of pages (no nested children) and you want to remove the gap to the left of list items that is normally reserved for the expand/collapse toggle.

- Where to place it: inside a `bullet:HTML` code block (or a synced block / toggle) immediately before the target list view. The marker must directly precede the list view block.
- What to add:

  ```html
  <span class="dsbullet-flat-list" />
  ```

**Accessibility & notes:**

- If your list actually contains collapsible sub-items, you probably wouldn't want to use this marker — it will make nested content inaccessible, unless you combine it with the unwrap-views addon to expand all items, or “unwrap” top-level items so the resulting list is flat.
- This is a local, per-database flag. It will affect all list views within the database that directly follows it. To target multiple databases, place a marker before each database.

## Customize via CSS Variables

Override any of the CSS variables to match your brand. Apply them on `:root` for site-wide changes, or on a page/container element for local tweaks.

### Examples

- Make tabs taller site-wide:

```css
:root { --tab-height: 44px; }
```

- Use an accent color for active tabs on a single page:

```css
/* scoped to a specific page container */
.page-abc123 {
  --tab-bg-active: #0a84ff;
  --tab-fg-active: #fff;
  --tab-border-color: #0a84ff;
}
```

Note that some variables should be adjusted together. For example, if you change `--tab-height`, consider adjusting `--search-height` to match them visually.

## License and Support

This project is licensed under the MIT License (see the [LICENSE](../../LICENSE) file for details).

Public repository: [dsent/bullet-addons](https://github.com/dsent/bullet-addons)

For support, please [open an issue](https://github.com/dsent/bullet-addons/issues) on GitHub.

© 2025 Danila Sentyabov ([dsent.me](https://dsent.me))
