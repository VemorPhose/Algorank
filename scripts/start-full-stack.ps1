param(
    [switch]$Detached,
    [switch]$NoBuild,
    [switch]$Pull,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot

function Show-Usage {
    Write-Host @"
Usage: .\scripts\start-full-stack.ps1 [options]

Start the complete Algorank stack with Docker Compose.

Options:
  -Detached    Start services in the background.
  -NoBuild     Reuse existing images instead of building first.
  -Pull        Ask Compose to pull newer base images before starting.
  -Help        Show this help text.
"@
}

function Invoke-Checked {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE"
    }
}

if ($Help) {
    Show-Usage
    exit 0
}

Set-Location $RootDir

if (-not (Test-Path ".env")) {
    Write-Host "[start] Creating .env from .env.example"
    Copy-Item ".env.example" ".env"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is required to start the full stack."
}

Invoke-Checked "docker" @("compose", "version")

# ---------------------------------------------------------------------------
# Pre-flight: warn about host ports already in use
# ---------------------------------------------------------------------------
$portsToCheck = @(
    @{Port=5433; Service="PostgreSQL (algorank)"},
    @{Port=6379; Service="Redis (algorank)"},
    @{Port=8000; Service="API"},
    @{Port=80;   Service="Nginx frontend"},
    @{Port=2358; Service="Judge0 server"}
)

foreach ($entry in $portsToCheck) {
    $listening = netstat -ano 2>$null | Select-String ":$($entry.Port) .*LISTEN"
    if ($listening) {
        Write-Host "[start] WARNING: Host port $($entry.Port) ($($entry.Service)) is already in use. Docker may fail to bind it."
    }
}

$composeArgs = @("compose", "up")
if ($Pull) {
    $composeArgs += @("--pull", "always")
}
if (-not $NoBuild) {
    $composeArgs += "--build"
}
if ($Detached) {
    $composeArgs += "-d"
}

Write-Host "[start] Starting Algorank. Frontend: http://localhost  API docs: http://localhost/docs"
Invoke-Checked "docker" $composeArgs
