$ErrorActionPreference = "Stop"

$Server = "121.40.26.169"
$User = "root"
$SshPort = 22
$RemoteDir = "/opt/test-engineer"
$Package = "deploy-test-engineer.tar.gz"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$PackagePath = Join-Path $ProjectRoot $Package
$InstallScript = Join-Path $ProjectRoot "deploy\aliyun\install-on-server.sh"

if (-not (Test-Path -LiteralPath $PackagePath)) {
    throw "Package not found: $PackagePath"
}

if (-not (Test-Path -LiteralPath $InstallScript)) {
    throw "Install script not found: $InstallScript"
}

Write-Host "[1/4] Checking SSH..."
ssh -p $SshPort -o ConnectTimeout=15 "$User@$Server" "echo ok"

Write-Host "[2/4] Preparing remote directory..."
ssh -p $SshPort "$User@$Server" "mkdir -p $RemoteDir"

Write-Host "[3/4] Uploading package and install script..."
scp -P $SshPort $PackagePath "${User}@${Server}:$RemoteDir/app.tar.gz"
scp -P $SshPort $InstallScript "${User}@${Server}:$RemoteDir/install-on-server.sh"

Write-Host "[4/4] Installing on server..."
ssh -p $SshPort "$User@$Server" "chmod +x $RemoteDir/install-on-server.sh && $RemoteDir/install-on-server.sh"

Write-Host ""
Write-Host "Deployment finished:"
Write-Host "  http://$Server`:3001/"
