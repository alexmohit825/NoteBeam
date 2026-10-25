"""
NoteBeam Background Hotkey Daemon
Listens globally for Ctrl + Alt + B to beam clipboard text/documents to iPhone Apple Notes.
Runs silently in background with native Windows API (zero heavy dependencies).
"""

import sys
import os
import ctypes
from ctypes import wintypes
import time
from pathlib import Path

# Add parent client directory to path
sys.path.insert(0, str(Path(__file__).parent))
from notebeam import beam_clipboard, notify

user32 = ctypes.windll.user32

MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_NOREPEAT = 0x4000
VK_B = 0x42
HOTKEY_ID = 101

class MSG(ctypes.Structure):
    _fields_ = [
        ("hwnd", wintypes.HWND),
        ("message", wintypes.UINT),
        ("wParam", wintypes.WPARAM),
        ("lParam", wintypes.LPARAM),
        ("time", wintypes.DWORD),
        ("pt", wintypes.POINT)
    ]

def run_hotkey_daemon():
    # Register Ctrl + Alt + B
    registered = user32.RegisterHotKey(
        None,
        HOTKEY_ID,
        MOD_CONTROL | MOD_ALT | MOD_NOREPEAT,
        VK_B
    )

    if not registered:
        # Fallback without MOD_NOREPEAT (for older Windows versions)
        registered = user32.RegisterHotKey(
            None,
            HOTKEY_ID,
            MOD_CONTROL | MOD_ALT,
            VK_B
        )

    if not registered:
        print("[-] Failed to register global hotkey Ctrl+Alt+B (might already be bound).")
        notify("NoteBeam Daemon", "Failed to bind Ctrl+Alt+B (already in use by another app).")
        return

    print("[*] NoteBeam Hotkey Daemon active.")
    print("[*] Press Ctrl + Alt + B anywhere on Windows to beam clipboard to iPhone Notes.")
    notify("⚡ NoteBeam Active", "Press Ctrl+Alt+B anywhere to beam clipboard to iPhone Notes.")

    msg = MSG()
    try:
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            if msg.message == 0x0312: # WM_HOTKEY
                if msg.wParam == HOTKEY_ID:
                    print(f"[{time.strftime('%H:%M:%S')}] Hotkey Ctrl+Alt+B triggered! Beaming clipboard...")
                    beam_clipboard()
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))
    except KeyboardInterrupt:
        pass
    finally:
        user32.UnregisterHotKey(None, HOTKEY_ID)
        print("[*] NoteBeam Hotkey Daemon stopped.")

if __name__ == "__main__":
    run_hotkey_daemon()
