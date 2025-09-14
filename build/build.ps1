param(
  [string]$ConfigPath = "$(Join-Path $PSScriptRoot 'build.config.json')",
  [switch]$Dev,          # dev: combine only (no minify, keep modern targets)
  [string]$Minify,       # values: js | css | js,css (force these; overrides config)
  [string]$Transpile,    # values: js | css | js,css (force these; overrides config)
  [switch]$NoNode,       # disable Node tool usage even if available
  [switch]$VerboseLog
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[build] $msg" }
function Write-Warn($msg) { Write-Warning "[build] $msg" }
function Write-Err ($msg) { Write-Error "[build] $msg" }

# Load config
if (-not (Test-Path $ConfigPath)) { Write-Err "Config not found: $ConfigPath"; exit 1 }
$configJson = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json

# Resolve base/out dirs
$baseDir = if ($configJson.baseDir) { Resolve-Path (Join-Path $PSScriptRoot $configJson.baseDir) } else { Resolve-Path $PSScriptRoot }
$outDir = if ($configJson.outDir) { Join-Path $baseDir $configJson.outDir } else { Join-Path $PSScriptRoot 'dist' }

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$jsCfg = $configJson.js
$cssCfg = $configJson.css

$useNode = $true
if ($NoNode) { $useNode = $false }

# Try detect node and npx
function Test-Command($cmd) {
  try { $null = Get-Command $cmd -ErrorAction Stop; return $true } catch { return $false }
}
if ($useNode) {
  if (-not (Test-Command 'node') -or -not (Test-Command 'npx')) {
    Write-Warn 'node/npx not found; will skip transpile/minify tooling and do plain concat.'
    $useNode = $false
  }
}

# Parsing helpers for selector arguments like "js", "css", or "js,css"
function Parse-Selector($value) {
  $result = @{ js = $false; css = $false }
  if (-not $value) { return $result }
  $tokens = ($value -split '[,\s]+' | Where-Object { $_ -and $_.Trim().Length -gt 0 })
  foreach ($tok in $tokens) {
    $t = $tok.Trim().ToLowerInvariant()
    switch ($t) {
      'js' { $result.js = $true }
      'css' { $result.css = $true }
      'both' { $result.js = $true; $result.css = $true }
      'all' { $result.js = $true; $result.css = $true }
      default { Write-Warn "Unknown selector '$tok' in argument '$value' (allowed: js, css, js,css)" }
    }
  }
  return $result
}

# Determine effective flags PER PIPELINE (JS vs CSS)
# If CLI selector provided, it forces the chosen pipelines; otherwise fall back to config
$jsTranspile = $false; $cssTranspile = $false
if ($Transpile) {
  $sel = Parse-Selector $Transpile
  $jsTranspile = $sel.js; $cssTranspile = $sel.css
}
else {
  $jsTranspile = ($jsCfg -and $jsCfg.transpile)
  $cssTranspile = ($cssCfg -and $cssCfg.transpile)
}

$jsMinify = $false; $cssMinify = $false
if ($Minify) {
  $sel = Parse-Selector $Minify
  $jsMinify = $sel.js; $cssMinify = $sel.css
}
else {
  $jsMinify = ($jsCfg -and $jsCfg.minify)
  $cssMinify = ($cssCfg -and $cssCfg.minify)
}

if ($Dev) { $jsTranspile = $false; $cssTranspile = $false; $jsMinify = $false; $cssMinify = $false }

Write-Info "BaseDir: $baseDir"
Write-Info "OutDir:  $outDir"
Write-Info "UseNode: $useNode"
Write-Info "JS  -> Transpile: $jsTranspile; Minify: $jsMinify"
Write-Info "CSS -> Transpile: $cssTranspile; Minify: $cssMinify"

function Resolve-Sources([object]$arr) {
  $files = @()
  foreach ($rel in $arr) {
    $full = Join-Path $baseDir $rel
    if (-not (Test-Path $full)) { Write-Err "Source not found: $rel ($full)"; exit 1 }
    $files += (Resolve-Path $full).Path
  }
  return $files
}

# JS pipeline
if ($jsCfg) {
  $jsSources = Resolve-Sources $jsCfg.sources
  $jsTemp = Join-Path $outDir "combined.tmp.js"
  $jsOut = Join-Path $outDir ($jsCfg.outFile ?? 'bundle.js')

  # Concatenate with a small separator and source file comment
  Set-Content -Path $jsTemp -Value "" -Encoding UTF8
  foreach ($f in $jsSources) {
    $banner = "`n/* ---- File: $([System.IO.Path]::GetFileName($f)) ---- */`n"
    Add-Content -Path $jsTemp -Value $banner -Encoding UTF8
    Get-Content -Raw -Path $f | Add-Content -Path $jsTemp -Encoding UTF8
    Add-Content -Path $jsTemp -Value "`n" -Encoding UTF8
  }

  if ($jsCfg.banner) {
    $b = $jsCfg.banner + "`n"
    $content = Get-Content -Raw -Path $jsTemp
    Set-Content -Path $jsTemp -Value ($b + $content) -Encoding UTF8
  }

  if ($useNode -and ($jsTranspile -or $jsMinify)) {
    $target = $jsCfg.target
    $npxJsArgs = @('--yes', '-p', 'esbuild', 'esbuild', $jsTemp, '--bundle', '--legal-comments=none', "--outfile=$jsOut")
    if ($jsMinify) { $npxJsArgs += '--minify' }
    if ($jsTranspile -and $target) { $npxJsArgs += "--target=$target" }
    Write-Info ("esbuild: npx " + ($npxJsArgs -join ' '))
    $exit = 0
    try { & npx @npxJsArgs } catch { $exit = 1 }
    if ($LASTEXITCODE -ne 0 -or $exit -ne 0) {
      Write-Warn 'esbuild failed; falling back to plain concatenation.'
      Copy-Item -Force -Path $jsTemp -Destination $jsOut
    }
  }
  else {
    Copy-Item -Force -Path $jsTemp -Destination $jsOut
  }

  Remove-Item -Force $jsTemp -ErrorAction SilentlyContinue
  Write-Info "Wrote JS: $([IO.Path]::GetFileName($jsOut))"

  # Wrap JS output in <script> tag and emit HTML alongside JS (no other behavior changed)
  try {
    $jsContent = Get-Content -Raw -Path $jsOut
    $wrapped = @"
<script type="text/javascript" defer>
$jsContent
</script>
"@
    $jsOutHtml = if ([IO.Path]::GetExtension($jsOut).ToLowerInvariant() -eq '.html') { $jsOut } else { [IO.Path]::ChangeExtension($jsOut, 'html') }
    Set-Content -Path $jsOutHtml -Value $wrapped -Encoding UTF8
    Write-Info "Wrote JS (HTML wrapper): $([IO.Path]::GetFileName($jsOutHtml))"

    # If the raw bundle was a .js file, remove it so the output is HTML-only per request
    if ([IO.Path]::GetExtension($jsOut).ToLowerInvariant() -eq '.js') {
      Remove-Item -Force -Path $jsOut -ErrorAction SilentlyContinue
      Write-Info "Removed raw JS bundle (HTML output requested)"
    }
  }
  catch {
    Write-Warn "Failed to produce HTML-wrapped JS output: $($_.Exception.Message)"
  }
}

# CSS pipeline
if ($cssCfg) {
  $cssSources = Resolve-Sources $cssCfg.sources
  $cssTemp = Join-Path $outDir "combined.tmp.css"
  $cssOut = Join-Path $outDir ($cssCfg.outFile ?? 'styles.css')

  Set-Content -Path $cssTemp -Value "" -Encoding UTF8
  foreach ($f in $cssSources) {
    $banner = "`n/* ---- File: $([System.IO.Path]::GetFileName($f)) ---- */`n"
    Add-Content -Path $cssTemp -Value $banner -Encoding UTF8
    Get-Content -Raw -Path $f | Add-Content -Path $cssTemp -Encoding UTF8
    Add-Content -Path $cssTemp -Value "`n" -Encoding UTF8
  }

  if ($cssCfg.banner) {
    $b = $cssCfg.banner + "`n"
    $content = Get-Content -Raw -Path $cssTemp
    Set-Content -Path $cssTemp -Value ($b + $content) -Encoding UTF8
  }

  if ($useNode -and ($cssTranspile -or $cssMinify)) {
    # Build lightningcss args safely for PowerShell; force package with -p for stable CLI resolution
    $npxCssArgs = @('--yes', '-p', 'lightningcss-cli', 'lightningcss', $cssTemp)

    # Only set targets when transpiling CSS for compatibility
    if ($cssTranspile) {
      # NOTE: lightningcss parses the --targets value by splitting on commas to allow multiple target groups.
      if ($cssCfg.browserslist -is [array]) { $browsers = ($cssCfg.browserslist -join ", ") }
      else { $browsers = ($cssCfg.browserslist ? $cssCfg.browserslist : "defaults") }
      $npxCssArgs += @('--targets', $browsers)
    }

    # Bundle and emit the file
    $npxCssArgs += @('--bundle', '--output-file', $cssOut)

    if ($cssMinify) { $npxCssArgs += '--minify' }

    Write-Info ("lightningcss: npx " + ($npxCssArgs -join ' '))
    $exit = 0
    try { & npx @npxCssArgs } catch { $exit = 1 }
    if ($LASTEXITCODE -ne 0 -or $exit -ne 0) {
      Write-Warn 'lightningcss failed; falling back to plain concatenation.'
      Copy-Item -Force -Path $cssTemp -Destination $cssOut
    }
  }
  else {
    Copy-Item -Force -Path $cssTemp -Destination $cssOut
  }

  Remove-Item -Force $cssTemp -ErrorAction SilentlyContinue
  Write-Info "Wrote CSS: $([IO.Path]::GetFileName($cssOut))"
}

Write-Info 'Build completed.'
