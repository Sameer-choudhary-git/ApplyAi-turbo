$files = @(
'apps/worker/tsconfig.json',
'apps/scheduler/tsconfig.json',
'packages/jobs/package.json',
'packages/utils/package.json',
'packages/queue/package.json',
'packages/config/package.json',
'packages/core/apply/package.json',
'packages/core/extractor/package.json',
'packages/core/validation/package.json'
)

$out = 'temp/collected_files.txt'
if (Test-Path $out) { Remove-Item -Force $out }
New-Item -ItemType Directory -Force -Path 'temp' | Out-Null

foreach ($f in $files) {
  Add-Content -Path $out -Value "==== $f ===="
  if (Test-Path $f) {
    Get-Content -Raw -Path $f | Add-Content -Path $out
  } else {
    Add-Content -Path $out -Value "[MISSING FILE: $f]"
  }
  Add-Content -Path $out -Value ""
}

Write-Output $out