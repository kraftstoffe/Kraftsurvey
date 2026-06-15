# Trigger a Coolify redeploy for Kraftstoff Survey and wait for /api/health.
#
# Setup:
#   Copy-Item scripts/coolify.env.example scripts/.coolify.env
#   # edit scripts/.coolify.env
#
# Usage:
#   .\scripts\deploy-coolify.ps1
#   .\scripts\deploy-coolify.ps1 -Push
#   .\scripts\deploy-coolify.ps1 -Force
#   .\scripts\deploy-coolify.ps1 -Push -Force

param(
    [switch]$Push,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $PSScriptRoot ".coolify.env"

if (-not (Test-Path $EnvFile)) {
    Write-Error "Missing $EnvFile — copy scripts/coolify.env.example and configure it."
}

Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $name = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    Set-Item -Path "Env:$name" -Value $value
}

foreach ($required in @("COOLIFY_URL", "COOLIFY_TOKEN", "COOLIFY_RESOURCE_UUID")) {
    if (-not (Get-Item "Env:$required" -ErrorAction SilentlyContinue)) {
        Write-Error "Set $required in scripts/.coolify.env"
    }
}

$HealthUrl = if ($env:HEALTH_URL) { $env:HEALTH_URL } else { "https://survey.kraftstoff.app/api/health" }
$GitBranch = if ($env:GIT_BRANCH) { $env:GIT_BRANCH } else { "master" }
$GitRemote = if ($env:GIT_REMOTE) { $env:GIT_REMOTE } else { "origin" }
$MaxWait = if ($env:MAX_WAIT) { [int]$env:MAX_WAIT } else { 900 }
$PollInterval = if ($env:POLL_INTERVAL) { [int]$env:POLL_INTERVAL } else { 15 }

$CoolifyUrl = $env:COOLIFY_URL.TrimEnd("/")

$ShouldPush = $Push -or ($env:GIT_PUSH -eq "1")
if ($ShouldPush) {
    Write-Host "→ Pushing ${GitRemote}/${GitBranch}..."
    git -C $Root push $GitRemote $GitBranch
}

Write-Host "→ Triggering Coolify deploy ($($env:COOLIFY_RESOURCE_UUID))..."

$body = @{
    uuid  = $env:COOLIFY_RESOURCE_UUID
    force = [bool]$Force
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $($env:COOLIFY_TOKEN)"
    Accept        = "application/json"
}

try {
    $response = Invoke-RestMethod `
        -Uri "$CoolifyUrl/api/v1/deploy" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $body
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Error "Coolify deploy request failed: $($_.Exception.Message)"
}

Write-Host "→ Waiting for health ($HealthUrl, max ${MaxWait}s)..."

$elapsed = 0
while ($elapsed -lt $MaxWait) {
    try {
        $health = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 30
        if ($health.ok -eq $true) {
            if ($null -ne $health.db) {
                if ($health.db -eq $true) {
                    Write-Host "✓ Deploy OK — database connected"
                    $health | ConvertTo-Json -Compress
                    exit 0
                }
                Write-Host "  App up, database not ready yet… (${elapsed}s)"
            } else {
                Write-Host "✓ App up (legacy health, no db field)"
                $health | ConvertTo-Json -Compress
                exit 0
            }
        }
    } catch {
        Write-Host "  Not ready yet… (${elapsed}s)"
    }

    Start-Sleep -Seconds $PollInterval
    $elapsed += $PollInterval
}

Write-Error "Health check timed out after ${MaxWait}s. Check Coolify deployment logs."
