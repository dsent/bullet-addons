# General Style Tweaks

`style-tweaks.css` contains small, site-wide CSS improvements I use for my site, [dsent.me](https://dsent.me).

## Features

- Fixes branding focus outline and navbar spacing
- Adjusts sizing and placement of various elements in the site's navbar (search, language selector, call to action buttons etc.) for consistency
- Provides Notion-like CTA button styles and embedded SVG icons for Telegram and WhatsApp.
- Includes page-title hide trigger (`.dsbullet-hide-title`)

## Usage

Read the repo's [README](../../README.md) for general installation instructions.

Drop `style-tweaks.css` into Bullet's Code area site-wide (per-page is possible, but not recommended).

- To add Telegram and WhatsApp icons to your CTA buttons, just add any `https://t.me/` or `https://wa.me/` links to the CTA section of the navbar in Bullet's settings. They will be automatically displayed as buttons with icons:
    ![A screenshot of a navbar section with Telegram and WhatsApp icons as CTA buttons](wa-tg-icons-cta.png)

## Configuration

Add this HTML element to your Notion page to hide the title (`h1.notion-title`) on that page:

```html
<span class="dsbullet-hide-title" />
```

## License and Support

This project is licensed under the MIT License (see the [LICENSE](../../LICENSE) file for details).

Public repository: [dsent/bullet-addons](https://github.com/dsent/bullet-addons)

For support, please [open an issue](https://github.com/dsent/bullet-addons/issues) on GitHub.

© 2025 Danila Sentyabov ([dsent.me](https://dsent.me))
