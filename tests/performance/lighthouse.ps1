param(
    [Parameter(Mandatory=$true)]
    [string]$Url
)

New-Item -ItemType Directory -Force -Path "tests/performance/results" | Out-Null

npx lighthouse $Url `
    --output=html `
    --output=json `
    --output-path="tests/performance/results/lighthouse" `
    --chrome-flags="--headless"

Write-Host ""
Write-Host "Lighthouse report created:"
Write-Host "tests/performance/results/lighthouse.report.html"