# Sync Trove Web env vars to Vercel (run after `npx vercel login`)
#
# Usage:
#   cd C:\Users\jonde\trove-web
#   npx vercel link --project trove-web --yes
#   .\scripts\sync-vercel-env.ps1

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..' '.env.local' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $envFile) {
  Write-Error "Missing trove-web/.env.local — run ..\trove\scripts\sync-web-env.ps1 first."
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_ -split '=', 2
  $name = $name.Trim()
  $value = $value.Trim().Trim('"').Trim("'")
  if ($name -in @('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    $vars[$name] = $value
  }
}

if (-not $vars['NEXT_PUBLIC_SUPABASE_URL'] -or -not $vars['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
  Write-Error "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local"
}

$productionUrl = Read-Host "Production URL (default: https://trove-web-opal.vercel.app)"
if (-not $productionUrl) { $productionUrl = 'https://trove-web-opal.vercel.app' }
$vars['NEXT_PUBLIC_SITE_URL'] = $productionUrl

foreach ($target in @('production', 'preview', 'development')) {
  foreach ($entry in $vars.GetEnumerator()) {
    Write-Host "Setting $($entry.Key) for $target..."
    $entry.Value | npx vercel@latest env add $entry.Key $target --force
  }
}

Write-Host "Done. Redeploy from Vercel dashboard or push a commit to main."
