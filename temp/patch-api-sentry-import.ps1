$path = 'apps/api/src/middleware/error.ts'
$content = Get-Content -Path $path -Raw
$updated = $content.Replace('from "@applyai/sentry";', 'from "@applyai/sentry/node";')
if ($updated -eq $content) {
  throw 'Expected Sentry import was not found.'
}
Set-Content -Path $path -Value $updated -Encoding utf8
