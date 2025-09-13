# Bullet Addons by dsent.me

This repository holds the extra addons for [Bullet](https://bullet.so?ref=dsent) that I created and maintain.

Bullet is a publishing platform built on top of Notion, greatly enhancing the default Notion web experience
with custom styles, SEO improvements, basic multilingual support, control over the publishing process, and a lot more.

You can register for Bullet using my referral link to support my work on these addons:

[bullet.so](https://bullet.so/?ref=dsent)

## The existing addons

- To be documented

## Usage

1. Open your [Bullet dashboard](https://app.bullet.so/dashboard), find your site, and click "Edit."
2. Go to the "Code" tab in the left sidebar.
3. Copy the contents of the CSS files you want to use into the "CSS" area.
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

If you want to use multiple features, just paste them one after another in the same CSS and JS areas. Each script is designed to be self-contained. If a script depends on another, this will be noted in its comments and readme. In this case, it's recommended, but not strictly required, to paste the dependencies first.

Some scripts have configuration options. These are usually grouped at the top of the file, or, in some cases, a particular section within the file.

If you want some scripts to apply only to specific pages or elements on your site, there are two options:

1. Add CSS and JS to the page's own custom code areas ("Pages" in the left sidebar → select the page → "Code" at the top of the left sidebar → select "Current Page"). This way, a script and styles will only apply to that page.
2. **The recommended way**, though, is to add the scripts globally, and use special HTML markers (usually `<span>` with a specific class name or attributes). Most of my scripts have such markers documented in their readmes. You can add these markers using a code block with a special caption `bullet:HTML` (see [Embed HTML inside Notion](https://bullet.so/docs/embed-html-inside-notion/) in Bullet documentation for details).

## Licensing and contributions

- The repo is licensed under a [MIT license](LICENSE).
- If you want a different license, you can [contact me](#author-and-contact).

- Contributions are welcome. Please open issues or PRs against the public package; sensitive site-specific
  bits will not be accepted into the published package.

## Security & privacy

- Do not commit secrets or site-specific credentials. The public package will contain only static CSS and
  small client-side scripts that do not require server credentials.

## Roadmap / next steps

- None published yet.

## Author and contact

- You can find more about me and my work at [dsent.me](https://dsent.me).
- For questions or sponsorship: Reach out via [Telegram](https://t.me/dsent_zen) or [email](mailto:info@dsent.me).
