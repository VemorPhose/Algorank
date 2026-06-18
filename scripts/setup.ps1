param(
    [switch]$SkipTests,
    [switch]$SkipFrontendBuild,
    [switch]$DockerBuild,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot

function Show-Usage {
    Write-Host @"
Usage: .\scripts\setup.ps1 [options]

Prepare a local Algorank development checkout.

Options:
  -SkipTests             Install dependencies and build without running tests.
  -SkipFrontendBuild     Install frontend dependencies without building the frontend.
  -DockerBuild           Also run 'docker compose build' after local verification.
  -Help                  Show this help text.
"@
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "[setup] $Message"
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

function Resolve-Python {
    if ($env:PYTHON) {
        $fromEnv = Get-Command $env:PYTHON -ErrorAction SilentlyContinue
        if ($fromEnv) {
            return @($fromEnv.Source)
        }
    }

    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        return @($pyLauncher.Source, "-3")
    }

    $python3 = Get-Command python3 -ErrorAction SilentlyContinue
    if ($python3) {
        return @($python3.Source)
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return @($python.Source)
    }

    throw "Python 3.9+ is required. Set PYTHON to the interpreter path if it is not on PATH."
}

function Resolve-Npm {
    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCmd) {
        return $npmCmd.Source
    }

    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        return $npm.Source
    }

    throw "Missing required command: npm"
}

function Invoke-Python {
    param([string[]]$Arguments)
    $fullArgs = $script:PythonArgs + $Arguments
    Invoke-Checked $script:PythonCommand $fullArgs
}

if ($Help) {
    Show-Usage
    exit 0
}

Set-Location $RootDir

if (-not (Test-Path ".env")) {
    Write-Step "Creating .env from .env.example"
    Copy-Item ".env.example" ".env"
}
else {
    Write-Step "Using existing .env"
}

$pythonSpec = @(Resolve-Python)
$script:PythonCommand = $pythonSpec[0]
$script:PythonArgs = @()
if ($pythonSpec.Count -gt 1) {
    $script:PythonArgs = $pythonSpec[1..($pythonSpec.Count - 1)]
}

Write-Step "Preparing Python virtual environment"
if (-not (Test-Path ".venv")) {
    Invoke-Python @("-m", "venv", ".venv")
}

$venvCandidates = @(
    (Join-Path $RootDir ".venv\Scripts\python.exe"),
    (Join-Path $RootDir ".venv\bin\python")
)
$venvPython = $venvCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $venvPython) {
    throw "Could not find the virtual environment Python executable."
}

Invoke-Checked $venvPython @("-m", "pip", "install", "--upgrade", "pip")
Invoke-Checked $venvPython @("-m", "pip", "install", ".[dev]")

$npmCommand = Resolve-Npm

Write-Step "Installing frontend dependencies"
Push-Location (Join-Path $RootDir "frontend")
try {
    if (Test-Path "package-lock.json") {
        Invoke-Checked $npmCommand @("ci")
    }
    else {
        Invoke-Checked $npmCommand @("install")
    }

    if (-not $SkipFrontendBuild) {
        Write-Step "Checking and building frontend"
        Invoke-Checked $npmCommand @("run", "typecheck")
        if (-not $SkipTests) {
            Invoke-Checked $npmCommand @("test")
        }
        Invoke-Checked $npmCommand @("run", "build")
    }
}
finally {
    Pop-Location
}

if (-not $SkipTests) {
    Write-Step "Running backend tests"
    Invoke-Checked $venvPython @("-m", "pytest")
}

if ($DockerBuild) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Missing required command: docker"
    }
    Invoke-Checked "docker" @("compose", "version")
    Write-Step "Building Docker images"
    Invoke-Checked "docker" @("compose", "build")
}

Write-Step "Setup complete"
