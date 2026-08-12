$path = 'packages/sentry/src/node.ts'
$content = Get-Content -Path $path -Raw
$old = 'export { trackApiRequest } from "./utils.js";'
$new = 'export { trackApiRequest, trackJob, trackCronJob, trackDatabase, trackTransaction, addTraceBreadcrumb } from "./utils.js";'
$updated = $content.Replace($old, $new)
if ($updated -eq $content) {
  throw 'Expected trackApiRequest export line was not found.'
}
Set-Content -Path $path -Value $updated -Encoding utf8
