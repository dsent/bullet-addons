# Bullet Addons by dsent.me

This repository contains custom addons for Bullet that I created and maintain.

Bullet is a publishing platform built on top of Notion that greatly enhances the default Notion web experience
with custom styles, SEO improvements, multilingual support, publishing controls, and more.

You can register for Bullet using my referral link to support my work on these addons: [bullet.so](https://bullet.so/?ref=dsent)

## List of Addons

- [General Style Tweaks](src/style-tweaks/style-tweaks-readme.md)
  Contains small, site-wide CSS improvements I use for my site, [dsent.me](https://dsent.me).  
  Improves the navbar consistency, styles CTA buttons to look like Notion, add special icons for Telegram and WhatsApp,
  fixes some layout quirks. Allows hiding the title on any page.
- [Database Views Display Enhancements](src/database-display/database-display-readme.md)
  Improves database views rendering in Bullet: replaces view selection dropdowns with tabs, cleans up headers,
  fixes layout issues, improves responsiveness, especially on smaller screens.
  Adds configuration markers to disable tabs, hide headers, remove extra indentation for flat lists
  (lists with no nested items).
- [Fading Scroll Effect for the Viewport](src/fading-scroll/)
  Adds a subtle fading effect at the top and bottom of the viewport when scrolling long pages, eliminating the abrupt cut-off.
  This minimalistic script has no configuration options, but you can modify the CSS file to adjust the styling.
- [Notion-like Floating Outline](src/outline-popup/outline-popup-readme.md)
  This script builds a Notion-style outline for headings on Bullet-rendered pages: a compact right rail shows section bars
  revealing a clickable table of contents on hover/click/touch. Pretty awesome stuff. Works better than Notion's own outline.
- [Navigation Popup](src/navigation-popup/navigation-popup-readme.md)
  This script converts a list view to a popup navigation menu, very similar to the outline popup, but on the left and
  consisting of links to other pages instead of headings on the current page. It can be used to create a site-wide
  navigation menu, or a local menu for a section of the site, or a list of related articles, extra resources, etc.
  The script depends on the outline popup and can't function if the latter is not present. It also requires an HTML marker
  specifying the database view to use as a popup source on every page that includes the navigation popup.
- [Language Selector Links and Link Callouts](src/lang-link/lang-link-readme.md)
  This script improves the user experience for a multilingual site built on Notion and Bullet.

  You designate some pages as translations of each other, and the system automatically generates a helpful outline,
  linking all translations of the current page on each page. Moreover, the standard Bullet language switcher in the
  header links to the correct localized version of each page instead of just linking to the home page of
  the selected language.

  You can see how it looks and works on my site: [dsent.me](https://dsent.me).

  The styles included with this script are also useful for other applications. For example, I reuse them to display
  a list of links to the current page's content posted on other platforms (e.g. Facebook, Twitter etc.). The same
  setup can be used for other purposes, such as linking to different versions of the same content
  (e.g. PDF, text, audio, video etc.).
- [Unwrap Views](src/unwrap-views/unwrap-views-readme.md)
  This script enhances the user experience with multi-level Notion lists (lists with sub-items), enabling using
  them as navigation menus or for other purposes. It provides two main features:
  - **Unwrap**: Removes a top-level item, promoting its sub-items to the top level.
  - **Expand**: Expands all or some items in a list so their sub-items are visible without clicking
    on the parent item's handle.
- [Miscellaneous Tools](src/tools/)
  This folder contains small, self-contained scripts I use to debug stuff. They are not intended for general
  or production use. I do not provide support or documentation for them, but they might be useful for some people.

## Compatibility Notes

- These addons are designed for the default Bullet template to provide a consistent Notion-like experience.
  Custom Bullet templates may cause some addons to work incorrectly.
- Addons are tested with modern browsers only. While I avoid unsupported features, I don't test or support
  legacy browsers or versions older than 2 years. This keeps the codebase simple, modern, and maintainable.
  I use [esbuild](https://esbuild.github.io/) and [lightningcss](https://lightningcss.com/) to transpile and
  minify the code for better compatibility so that should improve things a bit (see [Build section](#build) below).

## Usage

Most addons include both CSS and JavaScript files. Some may contain only CSS or only JavaScript.

To install an addon:

1. Open your [Bullet dashboard](https://app.bullet.so/dashboard), find your site, and click "Edit."
2. Go to the "Code" tab in the left sidebar.
3. Copy the CSS file contents into the "CSS" area.
4. Copy the JavaScript output (Body HTML file) into the "Body" area. If you paste scripts manually, wrap them
   in `<script>...</script>` tags (the build output already includes this wrapper):

   ```html
   <script type="text/javascript" defer>
    /*-------------------------------------
      BULLET ADDON: Database Display Tweaks
      -------------------------------------
      See database-display-readme.md for detailed documentation.
      ...<links, license, author info>...
      -----------------------------------*/
    ...
    /*--------------------------------------------
      END OF BULLET ADDON: Database Display Tweaks
      ------------------------------------------*/
   </script>
   ```

5. Save your changes (click "Save" at the top of the custom code area).
6. Publish your site (click "Publish" at the top right of the dashboard).

To use multiple addons, paste them one after another in the same CSS and JavaScript areas. Large header and footer comments
make it easier to identify where each addon begins and ends for future updates or removal. If you use multiple addons,
I recommend using a build script to combine them (see [Build section](#build) below).

Each script is self-contained. Dependencies, if any, are noted in the script's comments and README. When present, put
dependencies first (scripts typically wait for prerequisites, but ordering them earlier keeps things clear).

## Configuration and Customization

Some scripts include configuration options, typically grouped at the top of the file. Edit these values
to change the default behavior for your entire site.

For page-level behavior, use **per-page configuration using special HTML markers**.
Add the script globally and then add specific blocks to your source Notion pages
to enable/disable features or change settings.

You can also add scripts to specific pages instead of globally by adding CSS and JavaScript to individual
page code areas ("Pages" in the left sidebar → select page → "Code" → "Current Page"). This is not recommended nor supported, so you're on your own.

Add these markers using a code block with the caption `bullet:HTML`
(see [Embed HTML inside Notion](https://bullet.so/docs/embed-html-inside-notion/) in Bullet documentation).
For details, refer to each script's readme file and comments.

**Tip:** Create synced blocks in Notion (e.g., in a template page) and copy-sync them where needed.
Remember that editing a synced block changes all copies, so this only works for **identical** configurations.
If you need a few different configurations, create separate synced blocks for each.

Most marker blocks can be empty and invisible, so it's safe to place them anywhere on the page.

Some markers affect subsequent blocks or their parent block—check each script's documentation for details.

An example of a marker block on a Notion page:

![A screenshot of a Notion page with custom HTML marker before a list](img/sample-html-marker.png)

This marker prevents the list below it from rendering as tabs and forces it to display as a default dropdown list.
The marker doesn't affect other lists or other database views on the page.

## Build

To simplify updates, I use a [PowerShell build script](build/) that combines individual CSS and JS files into
two outputs you can paste into Bullet's custom code areas: an HTML file for the Body area (with `<script>` wrapper)
and a CSS file for the CSS area. The script also optionally transpiles the scripts and stylesheets for better
compatibility with older browsers and minifies them for production use.

The script reads configuration from `build.config.json`, which lists the source files and options. A sample
configuration is included in this repo.

A detailed readme for the build script is in [build/build-readme.md](build/build-readme.md).

Note that Bullet itself minifies the code you paste into the custom code areas, so minification is not strictly necessary
and wouldn't make a noticeable difference.

## Licensing and Contributions

- This repository is licensed under the [MIT license](LICENSE).
- For different licensing options, please [contact me](#author-and-contact).
- Contributions are welcome. Open issues or submit pull requests to the public repository. Site-specific
  or sensitive content will not be accepted.

## Security & Privacy

- Do not commit secrets or site-specific credentials. This repository contains only static CSS and client-side
  scripts that require no server credentials.

## Roadmap / Next Steps

- Simplify configuration, especially for outline-popup (targeting by database view name instead of CSS selector).

## Author and Contact

- Learn more about my work at [dsent.me](https://dsent.me).
- For questions or sponsorship opportunities: [Telegram](https://t.me/dsent_zen) or [email](mailto:info@dsent.me).

## Support My Work

If you find these addons useful, please consider supporting my work. You can do so by:

- Registering for Bullet using my referral link: [bullet.so](https://bullet.so/?ref=dsent)
- Commissioning custom work or consulting: [Contact me](mailto:info@dsent.me)
