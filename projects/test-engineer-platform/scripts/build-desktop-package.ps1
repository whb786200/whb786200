$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Desktop = [Environment]::GetFolderPath("Desktop")
$PackageName = "test-engineer-one-click-package"
$BuildRoot = Join-Path $ProjectRoot "desktop-package-build-lite"
$AppRoot = Join-Path $BuildRoot $PackageName
$ZipPath = Join-Path $Desktop "$PackageName.zip"
$NodeRoot = "C:\Users\19586\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.14.0-win-x64"

if (Test-Path -LiteralPath $BuildRoot) {
    Remove-Item -LiteralPath $BuildRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $AppRoot | Out-Null

$dirs = @("data", "docs", "public", "scripts", "src", "tests", "node_modules", "deploy")
foreach ($dir in $dirs) {
    $source = Join-Path $ProjectRoot $dir
    if (Test-Path -LiteralPath $source) {
        robocopy $source (Join-Path $AppRoot $dir) /E /XD ".git" /NFL /NDL /NJH /NJS | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "robocopy failed for $dir" }
    }
}

$openSourceTarget = Join-Path $AppRoot "open-source"
New-Item -ItemType Directory -Path $openSourceTarget | Out-Null
Copy-Item -LiteralPath (Join-Path $ProjectRoot "open-source\catalog.json") -Destination $openSourceTarget -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot "open-source\README.md") -Destination $openSourceTarget -Force

$files = @("package.json", "package-lock.json", "README.md", "server.js", "start-windows.bat", "install-windows.bat")
foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $ProjectRoot $file) -Destination $AppRoot -Force
}

Copy-Item -LiteralPath (Join-Path $ProjectRoot "docs\WINDOWS_ONE_CLICK_INSTALL.md") -Destination (Join-Path $AppRoot "INSTALL.md") -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot "docs\USER_MANUAL.md") -Destination (Join-Path $AppRoot "USER_MANUAL.md") -Force

if (Test-Path -LiteralPath $NodeRoot) {
    $runtimeNode = Join-Path $AppRoot "runtime\node"
    New-Item -ItemType Directory -Path $runtimeNode | Out-Null
    Copy-Item -LiteralPath (Join-Path $NodeRoot "node.exe") -Destination $runtimeNode -Force
}

if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}

Push-Location $BuildRoot
try {
    & "$env:SystemRoot\System32\tar.exe" -a -cf $ZipPath $PackageName
    if ($LASTEXITCODE -ne 0) { throw "tar.exe failed with exit code $LASTEXITCODE" }
}
finally {
    Pop-Location
}

$sizeMb = [math]::Round((Get-Item -LiteralPath $ZipPath).Length / 1MB, 2)
Write-Host "Desktop package created: $ZipPath"
Write-Host "Size: $sizeMb MB"
