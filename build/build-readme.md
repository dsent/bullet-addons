# Bullet Custom Code Build

This build script combines your selected JS and CSS files into two outputs you can paste into Bullet's custom code areas. Optionally, it transpiles (for older browsers) and minifies for production.

## What it does

- Reads `build.config.json`
- Concatenates sources in order (keeps per-file comments)
- Optionally transpiles/minifies via Node tools if available:
  - JS: `esbuild`
  - CSS: `lightningcss` (Autoprefix + modern minifier)
- Writes to `dist/bullet-custom.js` and `dist/bullet-custom.css`

## Prerequisites

- Windows PowerShell 7+ (pwsh)
- Node.js with `npx` (optional; only needed for transpile/minify)

## Configure

Edit `build.config.json` to list your sources and options. Paths are relative to the repo root (`baseDir: ".."`).

## Usage

From the repo root or `Project` directory:

```pwsh
# Run a development build (combine only)
pwsh ./build/build.ps1 -Dev

# Run with transpile + minify using config flags
pwsh ./build/build.ps1

# Force transpile and minify regardless of config
pwsh ./build/build.ps1 -Transpile -Minify

# Skip Node tools even if installed (concat only)
pwsh ./build/build.ps1 -NoNode
```

Outputs will be in `dist/`.

## Notes

- If Node tools are missing or fail, the script falls back to plain concatenation.
- Adjust `js.target` and `css.browserslist` in config to fine-tune compatibility.
- You can copy the resulting code directly into Bullet's custom JS/CSS areas.
