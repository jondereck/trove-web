# Configure Supabase Auth redirect URLs for Trove Web (Google / Apple OAuth).
#
# Requires a Supabase Personal Access Token:
#   https://supabase.com/dashboard/account/tokens
#
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\scripts\configure-supabase-oauth.ps1
#   .\scripts\configure-supabase-oauth.ps1 -SiteUrl "https://trove-jdn.vercel.app"

param(
  [string]$ProjectRef = "xullagcvhnenwpschjig",
  [string]$SiteUrl = "https://trove-jdn.vercel.app"
)

$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error @"
Missing SUPABASE_ACCESS_TOKEN.

1. Open https://supabase.com/dashboard/account/tokens
2. Create a token (name: trove-oauth-setup)
3. Run:
   `$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
   .\scripts\configure-supabase-oauth.ps1
"@
}

$base = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"
$headers = @{
  Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"
  "Content-Type" = "application/json"
}

Write-Host "Fetching current auth config..."
$current = Invoke-RestMethod -Uri $base -Headers $headers -Method Get
Write-Host "  site_url: $($current.site_url)"
Write-Host "  uri_allow_list: $($current.uri_allow_list)"

$required = @(
  "$SiteUrl/auth/callback"
  "$SiteUrl/**"
  "http://localhost:3000/auth/callback"
  "http://localhost:3000/**"
)

$existing = @()
if ($current.uri_allow_list) {
  $existing = $current.uri_allow_list -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

$merged = [System.Collections.Generic.List[string]]::new()
foreach ($url in ($existing + $required)) {
  if ($url -and -not $merged.Contains($url)) {
    [void]$merged.Add($url)
  }
}

$body = @{
  site_url = $SiteUrl.TrimEnd('/')
  uri_allow_list = ($merged -join ',')
} | ConvertTo-Json

Write-Host "Updating auth config..."
$updated = Invoke-RestMethod -Uri $base -Headers $headers -Method Patch -Body $body
Write-Host "Done."
Write-Host "  site_url: $($updated.site_url)"
Write-Host "  uri_allow_list: $($updated.uri_allow_list)"
Write-Host ""
Write-Host "Next: ensure Vercel NEXT_PUBLIC_SITE_URL=$SiteUrl and redeploy trove-web."
