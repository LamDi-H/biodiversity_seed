$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Step {
  param(
    [string]$Title,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "========================================" -ForegroundColor Cyan
  Write-Host $Title -ForegroundColor Cyan
  Write-Host "========================================" -ForegroundColor Cyan

  & $Command
}

function Assert-File {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Missing required file: $Path"
  }

  Write-Host "OK: $Path" -ForegroundColor Green
}

Set-Location $ProjectRoot

Invoke-Step "Check required files" {
  Assert-File ".\Cargo.toml"
  Assert-File ".\Cargo.lock"
  Assert-File ".\contracts\biodiversity_seed\Cargo.toml"
  Assert-File ".\contracts\biodiversity_seed\src\lib.rs"
  Assert-File ".\contracts\biodiversity_seed\src\test.rs"
  Assert-File ".\frontend\package.json"
  Assert-File ".\frontend\package-lock.json"
  Assert-File ".\frontend\src\App.tsx"
  Assert-File ".\frontend\src\services\contract.ts"
  Assert-File ".\frontend\src\vite-env.d.ts"
  Assert-File ".\server\package.json"
  Assert-File ".\server\package-lock.json"
  Assert-File ".\server\services\contractService.ts"
  Assert-File ".\.github\workflows\ci.yml"
  Assert-File ".\docs\ARCHITECTURE.md"
  Assert-File ".\docs\QUALITY_AND_DEPLOYMENT.md"
  Assert-File ".\vercel.json"
  Assert-File ".\railway.toml"
  Assert-File ".\Procfile"
}

Invoke-Step "Rust format" {
  cargo fmt --all -- --check
}

Invoke-Step "Smart contract tests" {
  cargo test --workspace
}

Invoke-Step "Smart contract WASM release build" {
  cargo build --workspace --target wasm32v1-none --release
}

Invoke-Step "Stellar contract build" {
  stellar contract build
}

Invoke-Step "Frontend install" {
  Set-Location "$ProjectRoot\frontend"
  npm ci
}

Invoke-Step "Frontend type-check" {
  Set-Location "$ProjectRoot\frontend"
  npm run type-check
}

Invoke-Step "Frontend build" {
  Set-Location "$ProjectRoot\frontend"
  npm run build
}

Invoke-Step "Frontend tests" {
  Set-Location "$ProjectRoot\frontend"
  npm test
}

Invoke-Step "Backend install" {
  Set-Location "$ProjectRoot\server"
  npm ci
}

Invoke-Step "Backend type-check" {
  Set-Location "$ProjectRoot\server"
  npm run type-check
}

Invoke-Step "Backend build" {
  Set-Location "$ProjectRoot\server"
  npm run build
}

Set-Location $ProjectRoot

Write-Host ""
Write-Host "Level 4 local verification passed." -ForegroundColor Green
