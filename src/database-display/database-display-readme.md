# Database Display Tweaks (Bullet CSS)

This is a pure CSS solution thatimproves how Notion database views render in Bullet: turns view dropdowns into tabs, cleans up headers, and fixes a few list-view quirks.

## Usage

- Copy the contents of `database-display.css` into your Bullet injection area (site-wide or per-page).
- Customize appearance by overriding CSS variables and adding optional markers to your Notion pages.

## Features

- Tabs for Database Views: converts the view dropdown into accessible, compact tabs when a database has multiple views.
  NB: There's a [much simpler alternative](https://bullet.so/docs/tabs-for-database-views/) provided by Bullet's team that is enough for many use cases.
- Always Hide Database Names: removes the database names from the headers. I hate them.
- Single-View Title: when a collection has only one view, its name is shown as a title.
- List View Tweaks: fixes sub-item toggles and other quirks.

## Opt-Out and Per-Collection Flags

Place a small marker inside a `bullet:HTML` code block directly before the target collection. They can also be inside of synced blocks or toggles. The marker must be immediately followed by the collection.

- Disable tabs for views display for the next collection:

```html
<span class="dsbullet-disable-tabs"></span>
```

- Hide the header (including search) for the next collection (useful for navigation blocks):

```html
<span class="dsbullet-hide-header"></span>
```

- You can actually use both (but it doesn't make much sense as hiding the header also hides the views dropdown/tabs anyway):

```html
<span class="dsbullet-disable-tabs dsbullet-hide-header"></span>
```

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

## Targeting Rules (What gets tabs?)

Tabs are applied when all of the following are true:

- The collection has multiple views (Bullet renders a view dropdown in the header).
- It is not preceded by a block that contains a `dsbullet-disable-tabs` marker.

The header is restructured so tabs appear on the left, and the search control sits at the top-right. The database name is hidden; in single-view collections the view name is shown as a title for context.

## List View Improvements

- Multi-level list toggles render as proper list items and align their contents consistently.
- Inline page icons in list views are not clipped.
