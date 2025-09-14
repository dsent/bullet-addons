param(
  [string]$ConfigPath = "$(Join-Path $PSScriptRoot 'build.config.json')",
  [switch]$Dev,          # dev: combine only (no minify, keep modern targets)
  [switch]$Minify,       # force minification
  [switch]$Transpile,    # force transpile/compat
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

# Effective flags
$doTranspile = $Transpile -or ($jsCfg.transpile -or $cssCfg.transpile)
$doMinify = $Minify -or ($jsCfg.minify -or $cssCfg.minify)
if ($Dev) { $doTranspile = $false; $doMinify = $false }

Write-Info "BaseDir: $baseDir"
Write-Info "OutDir:  $outDir"
Write-Info "Transpile: $doTranspile; Minify: $doMinify; UseNode: $useNode"

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

  if ($useNode -and ($doTranspile -or $doMinify)) {
    $target = $jsCfg.target
    $npxJsArgs = @('--yes', '-p', 'esbuild', 'esbuild', $jsTemp, '--bundle', '--legal-comments=none', "--outfile=$jsOut")
    if ($doMinify) { $npxJsArgs += '--minify' }
    if ($doTranspile -and $target) { $npxJsArgs += "--target=$target" }
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

  if ($useNode -and ($doTranspile -or $doMinify)) {
    # NOTE: lightningcss parses the --targets value by splitting on commas to allow multiple target groups.
    if ($cssCfg.browserslist -is [array]) {
      $browsers = ($cssCfg.browserslist -join ", ")
    }
    else {
      $browsers = $cssCfg.browserslist ? $cssCfg.browserslist : "defaults"
    }

    # Build lightningcss args safely for PowerShell; force package with -p for stable CLI resolution
    $npxCssArgs = @(
      '--yes', '-p', 'lightningcss-cli', 'lightningcss', $cssTemp,
      '--targets', $browsers,            # no browserslist: prefix needed
      '--bundle', '--output-file', $cssOut
    )
    if ($doMinify) { $npxCssArgs += '--minify' }
    $npxCssArgs += @('--bundle', '--output-file', $cssOut)
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
