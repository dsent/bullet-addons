# Bullet Addons by dsent.me

This repository holds the extra addons for Bullet that I created and maintain.

Bullet is a publishing platform built on top of Notion, greatly enhancing the default Notion web experience
with custom styles, SEO improvements, basic multilingual support, control over the publishing process, and a lot more.

You can register for Bullet using my referral link to support my work on these addons: [bullet.so](https://bullet.so/?ref=dsent)

## The Existing Addons

- To be documented

## Usage

Most addons consist of a CSS file and a JavaScript (JS) file. Some addons may have only CSS or only JS.

To use one of the addons, follow these steps:

1. Open your [Bullet dashboard](https://app.bullet.so/dashboard), find your site, and click "Edit."
2. Go to the "Code" tab in the left sidebar.
3. Copy the contents of the CSS files of the addon into the "CSS" area.
4. Copy the contents of the JS files you want to use into the "Body" area, wrapping them in `<script>...</script>` tags. The text area should look like this:

   ```html
   <script type="text/javascript" defer>
    /* -------------------------------------------------------- */
    /* **** SECTION: Fading Scroll Effect for the Viewport **** */
    /* -------------------------------------------------------- */
    ...
    /* ------------------------------------------------------- */
    /* **** END OF: Fading Scroll Effect for the Viewport **** */
    /* ------------------------------------------------------- */
   </script>
   ```

5. Save your changes (click "Save" at the top of the custom code area).
6. Publish your site (click "Publish" at the top right of the dashboard).

If you want to use multiple addons, just paste them one after another in the same CSS and JS areas. Each script is designed to be self-contained. If a script depends on another, this will be noted in its comments and readme. In this case, it's recommended, but not strictly required, to paste the dependencies first.

## Configuration and Customization

Some scripts have configuration options. These are usually grouped at the top of the file, or, in some cases, a particular section within the file. You can just edit these values in the script to change the default behavior for the entire site.

You can also add some scripts to specific pages instead of globally, if you want. To do that, you can add CSS and JS to the page's own custom code areas ("Pages" in the left sidebar → select the page → "Code" at the top of the left sidebar → select "Current Page"). This way, a script and styles will only apply to that page.

However, maintaining page-specific scripts is a chore. That's why most of my scripts allow per-page configuration using special HTML markers. This is **the recommended way** to configure the scripts.

These markers are added using a code block with a special caption `bullet:HTML` (see [Embed HTML inside Notion](https://bullet.so/docs/embed-html-inside-notion/) in Bullet documentation for details).

**Tip:** You can simplify marker usage by creating a synced block in Notion (e.g. in a template page of your master pages database), and then copy-syncing it wherever you need it. Note that if you edit a synced block, it changes all copies of it, so if you want different configurations, create separate synced blocks for each of them.

Most marker blocks can be empty and will be invisible on the page, so you can place them anywhere.
  
Some markers affect the blocks coming after them, or the parent block they are in, so read the documentation for each script.

An example of a marker block on a Notion page:

![A screenshot of a Notion page with custom HTML marker before a list](img/sample-html-marker.png)

The above marker prevents the list below it from rendering its list of views as tabs and forces it to render as a default dropdown list.

## Licensing and Contributions

- The repo is licensed under a [MIT license](LICENSE).
- If you want a different license, you can [contact me](#author-and-contact).

- Contributions are welcome. Please open issues or PRs against the public package; sensitive site-specific
  bits will not be accepted into the published package.

## Security & Privacy

- Do not commit secrets or site-specific credentials. The public package will contain only static CSS and
  small client-side scripts that do not require server credentials.

## Roadmap / Next Steps

- None published yet.

## Author and Contact

- You can find more about me and my work at [dsent.me](https://dsent.me).
- For questions or sponsorship: Reach out via [Telegram](https://t.me/dsent_zen) or [email](mailto:info@dsent.me).
