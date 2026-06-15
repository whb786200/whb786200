param(
  [string]$Destination = "$PSScriptRoot\..\tools"
)

$ErrorActionPreference = "Stop"
$manifestPath = Join-Path $PSScriptRoot "..\tools.json"
$manifest = Get-Content -LiteralPath $manifestPath -Encoding UTF8 | ConvertFrom-Json

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is required but was not found in PATH."
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

foreach ($tool in $manifest) {
  $target = Join-Path $Destination $tool.slug
  if (Test-Path -LiteralPath (Join-Path $target ".git")) {
    Write-Host "Updating $($tool.name) -> $target"
    git -C $target pull --ff-only
    continue
  }

  if (Test-Path -LiteralPath $target) {
    Write-Warning "Skipping $($tool.name): target exists but is not a git repo: $target"
    continue
  }

  Write-Host "Cloning $($tool.name) -> $target"
  git clone --depth 1 $tool.repo $target
}

Write-Host "Done. Tools are in: $Destination"

