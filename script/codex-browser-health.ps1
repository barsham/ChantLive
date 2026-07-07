<#
.SYNOPSIS
Checks local Codex Desktop browser/plugin health on Windows.

.DESCRIPTION
This script inspects Codex's local bundled Browser/Chrome/Computer Use plugin
cache, config.toml plugin state, trusted browser-client hashes, Crashpad
timestamps, and helper processes that commonly lock plugin cache files.

By default it is read-only. Use -Repair to stop extension-host.exe helpers that
can keep bundled plugin caches locked during Codex refresh/reinstall flows.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [switch]$Repair
)

$ErrorActionPreference = "Continue"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "== $Title ==" -ForegroundColor Cyan
}

function Get-ConfigValue {
  param(
    [string]$ConfigText,
    [string]$Key
  )

  $match = [regex]::Match($ConfigText, "(?m)^\s*$([regex]::Escape($Key))\s*=\s*(.+?)\s*$")
  if ($match.Success) {
    return $match.Groups[1].Value.Trim().Trim('"')
  }

  return $null
}

$codexHome = Join-Path $env:USERPROFILE ".codex"
$configPath = Join-Path $codexHome "config.toml"
$bundledRoot = Join-Path $codexHome "plugins\cache\openai-bundled"
$crashpadRoot = Join-Path $env:APPDATA "Codex\web\Codex\Crashpad"

Write-Section "Codex Paths"
Write-Host "Codex home:   $codexHome"
Write-Host "Config:       $configPath"
Write-Host "Bundled root: $bundledRoot"
Write-Host "Crashpad:     $crashpadRoot"

Write-Section "Config State"
if (Test-Path -LiteralPath $configPath) {
  $configText = Get-Content -Raw -LiteralPath $configPath
  foreach ($plugin in @("browser", "chrome", "computer-use")) {
    $pattern = "(?ms)\[plugins\.""$plugin@openai-bundled""\]\s*enabled\s*=\s*(true|false)"
    $match = [regex]::Match($configText, $pattern)
    $value = if ($match.Success) { $match.Groups[1].Value } else { "missing" }
    Write-Host ("{0,-28} {1}" -f "$plugin@openai-bundled", $value)
  }

  $jsRepl = Get-ConfigValue -ConfigText $configText -Key "js_repl"
  if ($null -ne $jsRepl) {
    Write-Host ("{0,-28} {1}" -f "features.js_repl", $jsRepl)
  }

  $trustedHashes = [regex]::Match($configText, '(?m)^NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S\s*=\s*"([^"]+)"')
  if ($trustedHashes.Success) {
    Write-Host "Trusted browser-client hashes found in node_repl env."
  } else {
    Write-Warning "No NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S entry found in config.toml."
  }
} else {
  Write-Warning "config.toml was not found."
}

Write-Section "Bundled Plugin Cache"
if (Test-Path -LiteralPath $bundledRoot) {
  foreach ($plugin in @("browser", "chrome", "computer-use")) {
    $pluginRoot = Join-Path $bundledRoot $plugin
    if (-not (Test-Path -LiteralPath $pluginRoot)) {
      Write-Warning "$plugin cache is missing."
      continue
    }

    $versions = Get-ChildItem -LiteralPath $pluginRoot -Directory -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending

    if (-not $versions) {
      Write-Warning "$plugin cache exists but has no version directories."
      continue
    }

    foreach ($version in $versions | Select-Object -First 3) {
      $pluginJson = Join-Path $version.FullName ".codex-plugin\plugin.json"
      $assets = Join-Path $version.FullName "assets"
      $browserClient = Join-Path $version.FullName "scripts\browser-client.mjs"
      $pluginJsonOk = Test-Path -LiteralPath $pluginJson
      $assetsOk = Test-Path -LiteralPath $assets
      $clientOk = Test-Path -LiteralPath $browserClient

      Write-Host ("{0,-13} {1,-16} plugin.json={2,-5} assets={3,-5} browser-client={4,-5} updated={5}" -f `
        $plugin, $version.Name, $pluginJsonOk, $assetsOk, $clientOk, $version.LastWriteTime)

      if ($clientOk) {
        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $browserClient).Hash.ToLowerInvariant()
        Write-Host ("  browser-client sha256: {0}" -f $hash)
      }
    }
  }
} else {
  Write-Warning "openai-bundled plugin cache is missing. Codex should rebuild it after a full restart."
}

Write-Section "Crashpad"
if (Test-Path -LiteralPath $crashpadRoot) {
  Get-ChildItem -LiteralPath $crashpadRoot -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object Name, Mode, Length, LastWriteTime |
    Format-Table -AutoSize

  $reports = Join-Path $crashpadRoot "reports"
  if (Test-Path -LiteralPath $reports) {
    $reportFiles = Get-ChildItem -LiteralPath $reports -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending
    if ($reportFiles) {
      Write-Host "Crash reports:"
      $reportFiles | Select-Object -First 10 FullName, Length, LastWriteTime | Format-Table -AutoSize -Wrap
    } else {
      Write-Host "No crash report files found in Crashpad reports."
    }
  }
} else {
  Write-Host "Crashpad directory not found."
}

Write-Section "Potential Cache-Locking Processes"
$processes = Get-Process Codex, codex, extension-host, node -ErrorAction SilentlyContinue |
  Select-Object ProcessName, Id, Path, StartTime

if ($processes) {
  foreach ($process in $processes) {
    Write-Host ("{0} PID {1} started {2}" -f $process.ProcessName, $process.Id, $process.StartTime)
    Write-Host ("  {0}" -f $process.Path)
  }
} else {
  Write-Host "No Codex/helper processes found."
}

if ($Repair) {
  Write-Section "Repair"
  $helpers = Get-Process extension-host -ErrorAction SilentlyContinue
  if (-not $helpers) {
    Write-Host "No extension-host.exe helpers are running."
  } else {
    foreach ($helper in $helpers) {
      if ($PSCmdlet.ShouldProcess("extension-host.exe PID $($helper.Id)", "Stop process")) {
        Stop-Process -Id $helper.Id -Force -ErrorAction Continue
        Write-Host "Stopped extension-host.exe PID $($helper.Id)."
      }
    }
  }

  Write-Host ""
  Write-Host "Next safe recovery steps:"
  Write-Host "1. Fully quit Codex from File > Exit or Task Manager."
  Write-Host "2. Wait 10 seconds."
  Write-Host "3. Reopen Codex and wait 1-2 minutes for bundled plugin cache refresh."
  Write-Host "4. Re-run this script without -Repair."
} else {
  Write-Section "Suggested Recovery"
  Write-Host "Read-only check complete. If Browser/Chrome/Computer Use tools are missing:"
  Write-Host "1. Save work and fully quit Codex."
  Write-Host "2. Run: powershell -ExecutionPolicy Bypass -File script\\codex-browser-health.ps1 -Repair"
  Write-Host "3. Reopen Codex and wait 1-2 minutes for openai-bundled cache rebuild."
  Write-Host "4. Avoid using the in-app browser for arbitrary external/contact-form sites."
}
