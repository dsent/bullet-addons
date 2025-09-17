# Unwrap Notion List Views with Subitems

This script works with multi-level Notion lists (enable them using Sub-items option in any notion list view).
Bullet doesn't support many of the advanced Notion database features. There's only a very basic support for multi-level lists.
The native Notion options are mostly ignored, and the lists are rendered as simple nested lists with all the sub-items always visible and collapsed.

## Features

The script provides two main features:

- **Unwrap**: Removes a top-level item, promoting its sub-items to the top level.
- **Expand**: Automatically expands all `<details>` elements in a list body, or only those containing specific items.

## Usage

Read the repo's [README](../README.md) for general installation instructions.

Place `<span>` markers with one of the attributes mentioned below anywhere within `<body>`. All attributes accept valid CSS selectors.

### Unwrap Top-Level Wrapper Details

```html
<span data-unwrap-view="#notion-list-123"></span>
<span data-unwrap-view="#notion-view-123"></span>
<span data-unwrap-view=".some-scope :is(#listA, #listB)"></span>
```

### Unwrap Only Wrappers Containing Matches

Use `data-unwrap-filter` to target wrappers that contain specific elements (OR logic across selectors):

```html
<span
    data-unwrap-view="#notion-list-123"
    data-unwrap-filter='summary a[href="/ru/archive/"], summary a[href="/en/archive/"]'>
</span>
```

### Expand Details

Set the `open` attribute on details elements:

```html
<span data-expand-view="#notion-list-123"></span>      <!-- expand all details in that list body -->
<span data-expand-view="#notion-view-123"></span>      <!-- expand list body inside the target view -->
<span data-expand-view="body"></span>                  <!-- expand all list bodies in the document -->
```

### Expand with Filtering

Use `data-expand-filter` to expand only matching elements. This opens the matched element's ancestor `<details>` chain up to the list body:

```html
<span
    data-expand-view="#notion-list-123"
    data-expand-filter='a[href*="/ru/"], a[href*="/ru/b/"]'>
</span>
```

### Target Lists by Position

Target specific list views without knowing their IDs (rely on their position relative to the marker):

```html
<!-- Target all list views in the database next to this marker -->
<span id="list-marker-861624665"
  data-expand-view=".notion-custom-code:has(> #list-marker-861624665) + .notion-collection > .notion-collection-view .notion-list-body"
></span>
<!-- Advanced: target the *second* list view in the following database view -->
<span id="list-marker-650184903"
  data-expand-view=".notion-custom-code:has(> #list-marker-650184903) + .notion-collection > :nth-child(1 of .notion-collection-view) .notion-list-body"
></span>
```

**Important:** The marker must be directly adjacent to the target element. Even a single empty line (which renders as `<p>` or `<div>`) will break the targeting.

## Technical Notes

- **Selectors:** `data-*-view` and `data-*-filter` must be valid CSS selectors. Comma-separated lists and `:is(...)` are supported.
- **List body targeting:** If a selector resolves to `.notion-list-body`, that body is used directly. Otherwise, descendant `.notion-list-body` elements under matched elements are processed.
- **Processing order:** If the same list body is marked for both unwrap and expand, unwrap runs first, then expand.
- **Filter combination:** If a `<span>` marker contains filters, they apply to all list bodies matched by that marker. Multiple markers targeting the same list body combine their filters using OR logic.

## License and Support

This project is licensed under the MIT License (see the [LICENSE](../../LICENSE) file for details).

Public repository: [dsent/bullet-addons](https://github.com/dsent/bullet-addons)

For support, please [open an issue](https://github.com/dsent/bullet-addons/issues) on GitHub.

© 2025 Danila Sentyabov ([dsent.me](https://dsent.me))
