# Build ProfZOR-Setup.exe (no API keys, no node_modules).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$installerDir = Join-Path $root "installer"
$dist = Join-Path $root "dist"
$payload = Join-Path $installerDir "payload.zip"
$setupCs = Join-Path $installerDir "Setup.cs"
$outExe = Join-Path $dist "ProfZOR-Setup.exe"

$files = @(
  "index.html",
  "demo.html",
  "demo-data.js",
  "styles.css",
  "app.js",
  "interview-logic.js",
  "radicals-knowledge.js",
  "ai-packet.js",
  "ai-prompts.js",
  "ai-client.js"
)

foreach ($f in $files) {
  $p = Join-Path $root $f
  if (-not (Test-Path $p)) { throw "Missing file: $f" }
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
if (Test-Path $payload) { Remove-Item $payload -Force }

$stage = Join-Path $env:TEMP ("profzor-payload-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
try {
  foreach ($f in $files) {
    Copy-Item (Join-Path $root $f) (Join-Path $stage $f)
  }
  Copy-Item (Join-Path $installerDir "README-TRIAL.txt") (Join-Path $stage "README-TRIAL.txt") -ErrorAction SilentlyContinue
  $readmeRu = Join-Path $installerDir "readme-ru.txt"
  if (Test-Path $readmeRu) {
    Copy-Item $readmeRu (Join-Path $stage "README-TRIAL.txt")
  }
  Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $payload -Force
} finally {
  Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
}

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
  $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
  throw "csc.exe not found (.NET Framework 4 required)."
}

$refs = @(
  "/reference:System.IO.Compression.dll",
  "/reference:System.IO.Compression.FileSystem.dll",
  "/reference:System.Windows.Forms.dll",
  "/reference:System.Drawing.dll"
)

if (Test-Path $outExe) { Remove-Item $outExe -Force }

& $csc /nologo /target:winexe /platform:anycpu /utf8output @refs `
  /resource:"$payload",payload.zip `
  /out:"$outExe" `
  "$setupCs"
if ($LASTEXITCODE -ne 0) { throw "csc exit code $LASTEXITCODE" }
if (-not (Test-Path $outExe)) { throw "Output not created: $outExe" }

Remove-Item $payload -Force -ErrorAction SilentlyContinue

$sizeKb = [math]::Round((Get-Item $outExe).Length / 1KB)
Write-Host "OK $outExe ($sizeKb KB)"
Write-Host "Share this EXE. OpenRouter key is not included."
