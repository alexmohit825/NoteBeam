@echo off
echo [*] Adding NoteBeam Bidirectional Service to Windows Startup...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET_PY=%~dp0notebeam_service.py"
set "SHORTCUT_PATH=%STARTUP_DIR%\NoteBeamService.lnk"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'C:\Users\mohal\AppData\Local\Programs\Python\Python314\pythonw.exe'; $s.Arguments = '\"%TARGET_PY%\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'NoteBeam Bidirectional Bridge Service'; $s.Save()"

echo [+] NoteBeam Service registered in Windows Startup!
echo [*] Starting service now...
start "" "C:\Users\mohal\AppData\Local\Programs\Python\Python314\pythonw.exe" "%TARGET_PY%"
echo [+] Done! NoteBeam is running in background.
pause
