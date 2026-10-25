@echo off
echo [*] Removing NoteBeam context menus...
python "%~dp0install_context_menu.py" --uninstall
echo [+] Context menus removed.
pause
