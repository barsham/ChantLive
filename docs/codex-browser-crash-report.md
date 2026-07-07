# Codex Desktop In-App Browser Crash / Bundled Plugin Cache Refresh Report

This is a ready-to-adapt upstream bug report for the OpenAI Codex repository.

Filed upstream:

```text
https://github.com/openai/codex/issues/31115
```

## Title

```text
Windows Codex Desktop crashed while using in-app Browser; bundled browser plugin cache refreshed and previous Browser installation path disappeared
```

## Summary

On Windows, Codex Desktop crashed while the in-app Browser was being used to navigate public contact/outreach pages. After relaunch, the previously active bundled Browser plugin cache path no longer existed and a newer bundled plugin cache version had appeared. This looked like the Browser plugin had been uninstalled or replaced during recovery.

The crash did not appear to affect the user's project files. It did affect the Codex app/browser plugin state and interrupted the current workflow.

## Environment

```text
OS: Windows
Codex app path observed:
C:\Program Files\WindowsApps\OpenAI.Codex_26.623.13972.0_x64__2p2nqsd0c76g0\app\Codex.exe

Codex home:
C:\Users\barsham\.codex

Workspace:
C:\Documents\SourceCodes\barsham\ChantLive
```

## What Happened

The in-app Browser was being used for outreach/contact pages. The last external page navigated before the failure was:

```text
https://www.hrlc.org.au/connect-with-us/
```

After the application crash/restart:

- Codex Crashpad directory was touched around the same time:

```text
C:\Users\barsham\AppData\Roaming\Codex\web\Codex\Crashpad
```

- No crash report file was found under:

```text
C:\Users\barsham\AppData\Roaming\Codex\web\Codex\Crashpad\reports
```

- The old Browser plugin client path that had been used earlier in the session no longer existed:

```text
C:\Users\barsham\.codex\plugins\cache\openai-bundled\browser\26.527.31326\scripts\browser-client.mjs
```

- A newer bundled plugin cache existed:

```text
C:\Users\barsham\.codex\plugins\cache\openai-bundled\browser\26.623.101652\scripts\browser-client.mjs
C:\Users\barsham\.codex\plugins\cache\openai-bundled\chrome\26.623.101652\scripts\browser-client.mjs
C:\Users\barsham\.codex\plugins\cache\openai-bundled\computer-use\26.623.101652\.codex-plugin\plugin.json
```

- `config.toml` still contained bundled plugin entries:

```toml
[plugins."computer-use@openai-bundled"]
enabled = true

[plugins."chrome@openai-bundled"]
enabled = true

[plugins."browser@openai-bundled"]
enabled = true
```

- `config.toml` also contained:

```toml
[features]
js_repl = false
```

despite browser automation depending on the Node REPL MCP path in the current environment.

## Expected Behavior

Codex Desktop should not crash the whole application when the in-app Browser navigates to a normal public web page.

If the in-app Browser cannot safely load a page, it should fail gracefully and preserve plugin/cache/runtime state.

If bundled plugin caches need to be refreshed after an app update or crash recovery, the app should avoid leaving Browser/Chrome/Computer Use in a state that looks uninstalled or unavailable.

## Actual Behavior

The app crashed or reset during in-app Browser usage. After recovery, the old bundled Browser plugin cache path was gone and a newer cache had appeared. The user experienced this as Codex losing the Browser/plugin installation.

## Local Checks Already Run

```powershell
git status --short
Test-Path "$env:USERPROFILE\.codex\plugins\cache\openai-bundled\browser\26.527.31326\scripts\browser-client.mjs"
Get-ChildItem "$env:USERPROFILE\.codex\plugins\cache\openai-bundled" -Recurse -Filter browser-client.mjs
Get-ChildItem "$env:APPDATA\Codex\web\Codex\Crashpad" -Recurse -Force
Get-Process Codex,extension-host,node -ErrorAction SilentlyContinue
```

Project files remained intact. Only unrelated outreach documentation changes were present in the repository.

## Related Reports

These look related or adjacent:

- Codex Desktop crashes when the in-app Browser opens arbitrary real web pages:
  https://github.com/openai/codex/issues/30178
- Codex app hangs/crashes when opening local HTML with built-in browser:
  https://github.com/openai/codex/issues/30558
- Codex Desktop in-app browser crashes on browser file import:
  https://github.com/openai/codex/issues/30925
- Browser Annotation crash can leave app permanently unable to launch:
  https://github.com/openai/codex/issues/28156
- Bundled Browser/Chrome/Computer Use plugins enabled but not exposed:
  https://github.com/openai/codex/issues/26133
- Bundled plugin cache corruption / file-lock failures on Windows:
  https://github.com/openai/codex/issues/22114
- Browser plugin can attach but DOM/screenshot APIs fail on Windows:
  https://github.com/openai/codex/issues/20661

## Suggested Diagnostic Attachment

Before filing, run:

```powershell
powershell -ExecutionPolicy Bypass -File script\codex-browser-health.ps1
```

Attach or paste the redacted output, after removing any sensitive paths, tokens, or personal data.

## Current Workaround

- Avoid the in-app Browser for arbitrary external outreach/contact-form sites.
- Use regular Chrome/Edge manually for external sites.
- Use Codex to prepare email/form text rather than drive the site.
- If Browser/Chrome/Computer Use tools disappear:
  1. Fully quit Codex.
  2. Ensure `extension-host.exe` is stopped.
  3. Reopen Codex.
  4. Wait 1-2 minutes for `openai-bundled` plugin cache to rebuild.
  5. Recheck `C:\Users\<user>\.codex\plugins\cache\openai-bundled`.
