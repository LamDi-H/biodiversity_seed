$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$SourceAccount = "biodiversity_admin"
$WasmPath = Join-Path $Root "target\wasm32v1-none\release\biodiversity_seed.wasm"
$ContractIdFile = Join-Path $Root "CONTRACT_ID.txt"
$FrontendSrc = Join-Path $Root "frontend\src"
$FrontendConfig = Join-Path $FrontendSrc "contractConfig.ts"
$DeployOutputFile = Join-Path $Root "deploy-output.txt"

Set-Location $Root

Write-Host ""
Write-Host "=== biodiversity_seed deploy script ===" -ForegroundColor Cyan
Write-Host "Project root: $Root"
Write-Host ""

Write-Host "Step 1: Running contract tests..." -ForegroundColor Yellow
cargo test

if ($LASTEXITCODE -ne 0) {
    throw "cargo test failed"
}

Write-Host ""
Write-Host "Step 2: Building Soroban contract..." -ForegroundColor Yellow
stellar contract build

if ($LASTEXITCODE -ne 0) {
    throw "stellar contract build failed"
}

if (!(Test-Path $WasmPath)) {
    throw "WASM file not found at: $WasmPath"
}

Write-Host ""
Write-Host "Step 3: Checking Stellar testnet source account..." -ForegroundColor Yellow

$KeyCheckOutput = cmd /c "stellar keys address $SourceAccount 2>&1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Source account not found. Creating and funding testnet account: $SourceAccount" -ForegroundColor Yellow
    cmd /c "stellar keys generate --fund $SourceAccount --network testnet"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create and fund source account: $SourceAccount"
    }
}

$AddressOutput = cmd /c "stellar keys address $SourceAccount 2>&1"

if ($LASTEXITCODE -ne 0) {
    throw "Could not read source account address."
}

Write-Host "Source account address: $AddressOutput" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Deploying contract to Stellar Testnet..." -ForegroundColor Yellow

if (Test-Path $DeployOutputFile) {
    Remove-Item $DeployOutputFile -Force
}

$DeployCommand = "stellar contract deploy --wasm `"$WasmPath`" --source-account $SourceAccount --network testnet"

Write-Host "Running:" -ForegroundColor Cyan
Write-Host $DeployCommand
Write-Host ""

cmd /c "$DeployCommand > `"$DeployOutputFile`" 2>&1"

$DeployExitCode = $LASTEXITCODE
$DeployOutput = Get-Content $DeployOutputFile -Raw

Write-Host $DeployOutput

if ($DeployExitCode -ne 0) {
    throw "Deploy failed. Please check deploy-output.txt"
}

$ContractIdMatch = [regex]::Match($DeployOutput, "C[A-Z0-9]{55,}")

if (!$ContractIdMatch.Success) {
    throw "Deploy finished but Contract ID was not found in deploy output."
}

$ContractId = $ContractIdMatch.Value

Write-Host ""
Write-Host "Contract deployed successfully!" -ForegroundColor Green
Write-Host "Contract ID: $ContractId" -ForegroundColor Green

Set-Content -Path $ContractIdFile -Value $ContractId

New-Item -ItemType Directory -Force -Path $FrontendSrc | Out-Null

$ConfigContent = @"
export const CONTRACT_ID = "$ContractId";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const STELLAR_EXPERT_CONTRACT_URL = "https://stellar.expert/explorer/testnet/contract/$ContractId";
"@

Set-Content -Path $FrontendConfig -Value $ConfigContent

Write-Host ""
Write-Host "Saved Contract ID to:" -ForegroundColor Cyan
Write-Host "- $ContractIdFile"
Write-Host "- $FrontendConfig"
Write-Host ""
Write-Host "Evidence needed now:" -ForegroundColor Magenta
Write-Host "Take screenshot of this terminal and save it as evidence\contract-deployed.png"
Write-Host ""