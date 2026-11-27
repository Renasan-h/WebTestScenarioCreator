$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Join-Path $PSScriptRoot '..')
$root = (Get-Location).Path
function Invoke-Checked([scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $LASTEXITCODE" }
}
if ($env:OS -ne 'Windows_NT') { throw 'Windows is required.' }
Invoke-Checked { pnpm tauri build --no-bundle }
$out = Join-Path $root 'portable-dist'
$stage = Join-Path $out 'WebTestScenarioCreator'
$runtime = Join-Path $stage 'runtime'
if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
Copy-Item (Join-Path $root 'src-tauri/target/release/scenario-studio.exe') (Join-Path $stage 'WebTestScenarioCreator.exe')
$node = (Get-Command node.exe -ErrorAction Stop).Source
Copy-Item $node (Join-Path $runtime 'node.exe')
foreach ($folder in @('sidecar', 'packages')) {
    Copy-Item (Join-Path $root $folder) $runtime -Recurse
}
# Install only runtime dependencies in an isolated directory; npm uses ordinary
# directories rather than pnpm links that could point outside the archive.
$versions = & node -e "console.log(JSON.stringify({playwright:require('playwright/package.json').version,zod:require('zod/package.json').version,tsx:require('tsx/package.json').version}))"
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve runtime dependency versions' }
$manifest = @{name='scenario-studio-runtime';private=$true;type='module';dependencies=($versions | ConvertFrom-Json)}
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $runtime 'package.json') -Encoding utf8
Push-Location $runtime
try {
    Invoke-Checked { npm install --omit=dev --no-audit --no-fund }
    $oldBrowsers = $env:PLAYWRIGHT_BROWSERS_PATH
    try {
        $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $runtime 'browsers'
        Invoke-Checked { & .\node.exe node_modules/playwright/cli.js install chromium }
        Invoke-Checked { & .\node.exe --import tsx -e "require('playwright'); require('zod')" }
    } finally { $env:PLAYWRIGHT_BROWSERS_PATH = $oldBrowsers }
} finally { Pop-Location }
@'
Extract the entire ZIP before launching WebTestScenarioCreator.exe.
Windows x64 and Microsoft Edge WebView2 Runtime are required.
Chromium is bundled; Edge mode requires Microsoft Edge installed.
Keep the runtime folder next to the EXE. Screenshots are saved under runtime/screenshots.
This is an unsigned development build, not a production release.
'@ | Set-Content (Join-Path $stage 'README.txt') -Encoding utf8
$zip = Join-Path $out 'WebTestScenarioCreator-windows-x64.zip'
if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path $stage -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Portable archive: $zip"
