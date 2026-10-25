"""
NoteBeam Context Menu Installer for Windows Explorer
Adds right-click shortcuts for:
1. .docx files -> "NoteBeam: Send to iPhone Notes"
2. All files (*) -> "NoteBeam: Send to iPhone Notes"
3. Desktop & Folder background -> "NoteBeam: Beam Clipboard to iPhone Notes"

Installs to HKCU (No Administrator elevation required).
"""

import sys
import os
import winreg
from pathlib import Path

PYTHON_EXE = sys.executable
# Prefer pythonw.exe to avoid console popup
PYTHONW_EXE = os.path.join(os.path.dirname(PYTHON_EXE), "pythonw.exe")
if not os.path.exists(PYTHONW_EXE):
    PYTHONW_EXE = PYTHON_EXE

NOTEBEAM_PY = str((Path(__file__).parent / "notebeam.py").resolve())

def install_file_context_menu():
    """Adds 'NoteBeam: Send to iPhone Notes' to file right-click menu."""
    key_path = r"Software\Classes\*\shell\NoteBeam"
    try:
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, "NoteBeam: Send to iPhone Notes")
            winreg.SetValueEx(key, "Icon", 0, winreg.REG_SZ, "shell32.dll,70") # Notepad/Document icon

        cmd_path = key_path + r"\command"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, cmd_path) as cmd_key:
            cmd = f'"{PYTHONW_EXE}" "{NOTEBEAM_PY}" "%1"'
            winreg.SetValueEx(cmd_key, "", 0, winreg.REG_SZ, cmd)

        print("[+] Registered file context menu: NoteBeam: Send to iPhone Notes")
    except Exception as e:
        print(f"[-] Failed to register file context menu: {e}")

def install_clipboard_context_menu():
    """Adds 'NoteBeam: Beam Clipboard to iPhone Notes' to desktop/folder background right-click menu."""
    key_path = r"Software\Classes\Directory\Background\shell\NoteBeamClipboard"
    try:
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, "NoteBeam: Beam Clipboard to iPhone Notes")
            winreg.SetValueEx(key, "Icon", 0, winreg.REG_SZ, "imageres.dll,102") # Lightning / network icon

        cmd_path = key_path + r"\command"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, cmd_path) as cmd_key:
            cmd = f'"{PYTHONW_EXE}" "{NOTEBEAM_PY}" --clipboard'
            winreg.SetValueEx(cmd_key, "", 0, winreg.REG_SZ, cmd)

        print("[+] Registered background context menu: NoteBeam: Beam Clipboard to iPhone Notes")
    except Exception as e:
        print(f"[-] Failed to register background context menu: {e}")

def uninstall_context_menus():
    """Removes all NoteBeam registry keys."""
    keys_to_delete = [
        (winreg.HKEY_CURRENT_USER, r"Software\Classes\*\shell\NoteBeam\command"),
        (winreg.HKEY_CURRENT_USER, r"Software\Classes\*\shell\NoteBeam"),
        (winreg.HKEY_CURRENT_USER, r"Software\Classes\Directory\Background\shell\NoteBeamClipboard\command"),
        (winreg.HKEY_CURRENT_USER, r"Software\Classes\Directory\Background\shell\NoteBeamClipboard")
    ]
    for hkey, subkey in keys_to_delete:
        try:
            winreg.DeleteKey(hkey, subkey)
            print(f"[+] Deleted: {subkey}")
        except FileNotFoundError:
            pass
        except Exception as e:
            print(f"[-] Failed to delete {subkey}: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].lower() in ["uninstall", "--uninstall", "-u"]:
        print("[*] Uninstalling NoteBeam context menus...")
        uninstall_context_menus()
    else:
        print("[*] Installing NoteBeam context menus for Dr. Mohit...")
        install_file_context_menu()
        install_clipboard_context_menu()
        print("[+] NoteBeam context menus successfully installed!")
