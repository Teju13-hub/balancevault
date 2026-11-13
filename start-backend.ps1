# ==============================================================================
# BalanceVault - Local Backend Startup Script (PowerShell)
# ==============================================================================

$ProjectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

# 1. Load .env file if present in the project directory
$EnvFile = Join-Path $ProjectRoot ".env"
if (Test-Path $EnvFile) {
    Write-Host "[INFO] Loading configuration from .env file..." -ForegroundColor Cyan
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $eqIdx = $line.IndexOf("=")
            if ($eqIdx -gt 0) {
                $key = $line.Substring(0, $eqIdx).Trim()
                $val = $line.Substring($eqIdx + 1).Trim()
                # Strip surrounding quotes if present
                if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                    if ($val.Length -ge 2) {
                        $val = $val.Substring(1, $val.Length - 2)
                    }
                }
                # Set in current PowerShell process
                [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }
    }
}

# 2. Validate required environment variables
$hasError = $false

if (-not $env:DB_PASSWORD) {
    Write-Host "[ERROR] 'DB_PASSWORD' is not set." -ForegroundColor Red
    $hasError = $true
}

if (-not $env:JWT_SECRET) {
    Write-Host "[ERROR] 'JWT_SECRET' is not set." -ForegroundColor Red
    $hasError = $true
} elseif ($env:JWT_SECRET.Length -lt 32) {
    Write-Host "[ERROR] 'JWT_SECRET' must be at least 32 characters (256 bits). Current length: $($env:JWT_SECRET.Length)" -ForegroundColor Red
    $hasError = $true
}

if ($hasError) {
    Write-Host "`nPlease configure the required variables using one of the following methods:" -ForegroundColor Yellow
    Write-Host "`nMethod A: Create a local .env file (Recommended)" -ForegroundColor White
    Write-Host "  1. Copy the example configuration:"
    Write-Host "       Copy-Item .env.example .env"
    Write-Host "  2. Edit .env and set your DB_PASSWORD and JWT_SECRET."
    Write-Host "`nMethod B: Set environment variables in your PowerShell session" -ForegroundColor White
    Write-Host '  $env:DB_URL      = "jdbc:postgresql://localhost:5432/ledgerline_db"'
    Write-Host '  $env:DB_USERNAME = "ledgerline_app"'
    Write-Host '  $env:DB_PASSWORD = "your_actual_postgres_password"'
    Write-Host '  $env:JWT_SECRET  = "your_secure_random_jwt_secret_at_least_32_characters_here"'
    Write-Host "`nThen re-run .\start-backend.ps1`n"
    exit 1
}

Write-Host "[INFO] Environment configuration validated successfully." -ForegroundColor Green
Write-Host "[INFO] Starting BalanceVault backend via Maven..." -ForegroundColor Cyan


$MavenWrapper = Join-Path $ProjectRoot "mvnw.cmd"

if (-not (Test-Path -LiteralPath $MavenWrapper -PathType Leaf)) {
    Write-Host "[ERROR] Maven wrapper not found at: $MavenWrapper" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectRoot
& $MavenWrapper spring-boot:run


