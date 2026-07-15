Get-ChildItem -Path . -Filter package.json -Recurse | ForEach-Object {
    Write-Output ('--- ' + $_.FullName + ' ---')
    Get-Content -Raw -LiteralPath $_.FullName
} | Out-File -FilePath .\collected-package-jsons.txt -Encoding utf8