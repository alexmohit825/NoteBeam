@echo off
echo [*] Adding NoteBeam Global Hotkey (Ctrl+Alt+B) to Windows Startup...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET_VBS=%~dp0start_hotkey_daemon.vbs"
set "SHORTCUT_PATH=%STARTUP_DIR%\NoteBeamHotkey.lnk"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_VBS%'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'NoteBeam Global Hotkey Daemon (Ctrl+Alt+B)'; $s.Save()"

echo [+] NoteBeam Hotkey Daemon added to Windows Startup!
echo [*] Launching daemon now in background...
wscript "%TARGET_VBS%"
echo [+] Done! Ctrl+Alt+B is now active.
pause
