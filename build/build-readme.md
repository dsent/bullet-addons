# Bullet Custom Code Build

This build script combines your selected JS and CSS into an HTML file for Bullet's Body area and a CSS file for Bullet's CSS area. The Body HTML wraps JS in a `<script>` tag. Optionally, it transpiles (for older browsers) and minifies for production. You can control JS and CSS independently via selector-based flags.

## What it does

- Reads `build.config.json`
- Concatenates sources in order (keeps per-file comments)
- Optionally transpiles/minifies via Node tools if available:
  - JS: `esbuild`
  - CSS: `lightningcss` (Autoprefix + modern minifier)
- Writes to `dist/bullet-custom-body.html` (Body HTML with `<script>`) and `dist/bullet-custom.css`

## Prerequisites

- Windows PowerShell 7+ (pwsh)
- Node.js with `npx` (optional; only needed for transpile/minify)

## Configure

Edit `build.config.json` to list your sources and options. Paths are relative to the repo root (`baseDir: ".."`).

## Usage

From the repo root or `Project` directory:

```pwsh
# Run a development build (combine only; no transpile/minify)
pwsh ./build/build.ps1 -Dev

# Use config flags from build.config.json (no CLI overrides)
pwsh ./build/build.ps1

# Force transpile/minify for a specific pipeline(s) via selectors:
pwsh ./build/build.ps1 -Transpile js
pwsh ./build/build.ps1 -Minify css
pwsh ./build/build.ps1 -Transpile js,css -Minify js,css

# Skip Node tools even if installed (concat only)
pwsh ./build/build.ps1 -NoNode
```

Outputs will be in `dist/`.

## Notes

- If Node tools are missing or fail, the script falls back to plain concatenation.
- Selector flags override config: when `-Transpile`/`-Minify` are provided, only the selected pipelines run those steps; otherwise the script uses values from `build.config.json`.
- `-Dev` disables transpile and minify for both pipelines regardless of config or selectors.
- Adjust `js.target` and `css.browserslist` in config to fine-tune compatibility.
- The JS output is wrapped in `<script type="text/javascript" defer>...</script>` for direct pasting into Bullet's Body area. The CSS output is plain CSS for the CSS area.
