"""
NoteBeam Unified Background Service
1. Listens globally for Ctrl + Alt + B to beam clipboard to iPhone.
2. Watches for incoming files, photos, and text from iPhone -> Downloads\\NoteBeam.
Copyright (c) 2026 A. Alex Mohit.
"""

import sys
import os
import time
import json
import base64
import urllib.request
import urllib.error
import threading
import ctypes
from ctypes import wintypes
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from notebeam import beam_clipboard, notify, load_config

DOWNLOAD_DIR = Path(r"C:\Users\mohal\Downloads\NoteBeam")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# -------------------------------------------------------------
# 1. Receiver Thread (iPhone -> PC)
# -------------------------------------------------------------
def set_windows_clipboard(text: str):
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    CF_UNICODETEXT = 13
    if not user32.OpenClipboard(0):
        return False
    try:
        user32.EmptyClipboard()
        data = (text + "\0").encode("utf-16le")
        h_mem = kernel32.GlobalAlloc(0x0002, len(data))
        if h_mem:
            p_mem = kernel32.GlobalLock(h_mem)
            if p_mem:
                ctypes.memmove(p_mem, data, len(data))
                kernel32.GlobalUnlock(h_mem)
                user32.SetClipboardData(CF_UNICODETEXT, h_mem)
                return True
    finally:
        user32.CloseClipboard()
    return False

def receiver_loop():
    while True:
        try:
            config = load_config()
            base_url = config.get("endpoint", "https://notebeam-relay.mohalex.workers.dev/api/beam").replace("/api/beam", "")
            poll_url = f"{base_url}/api/pending-for-pc"
            auth_token = config.get("auth_token", "nb_mohit_sec_2026_beam")

            req = urllib.request.Request(
                poll_url,
                headers={"Authorization": f"Bearer {auth_token}", "User-Agent": USER_AGENT}
            )

            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for item in data.get("items", []):
                    item_id = item.get("id")
                    filename = item.get("filename") or f"iPhone_Item_{int(time.time())}.txt"
                    dest_path = DOWNLOAD_DIR / filename
                    counter = 1
                    stem = dest_path.stem
                    ext = dest_path.suffix
                    while dest_path.exists():
                        dest_path = DOWNLOAD_DIR / f"{stem}_{counter}{ext}"
                        counter += 1

                    if item.get("file_data"):
                        raw_bytes = base64.b64decode(item["file_data"])
                        dest_path.write_bytes(raw_bytes)
                        notify("⚡ Received from iPhone!", f"Saved: {dest_path.name}")
                    elif item.get("markdown"):
                        text = item["markdown"]
                        dest_path.write_text(text, encoding="utf-8")
                        set_windows_clipboard(text)
                        notify("⚡ Received from iPhone!", f"Text copied to clipboard: {item.get('title')[:35]}")

                    # Acknowledge
                    ack_url = f"{base_url}/api/ack-pc/{item_id}"
                    ack_req = urllib.request.Request(
                        ack_url,
                        headers={"Authorization": f"Bearer {auth_token}", "User-Agent": USER_AGENT},
                        method="POST"
                    )
                    urllib.request.urlopen(ack_req, timeout=5)
        except Exception:
            pass
        time.sleep(2.5)

# -------------------------------------------------------------
# 2. Global Hotkey Thread (Ctrl + Alt + B -> Beam to iPhone)
# -------------------------------------------------------------
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

def hotkey_loop():
    user32 = ctypes.windll.user32
    registered = user32.RegisterHotKey(None, HOTKEY_ID, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_B)
    if not registered:
        registered = user32.RegisterHotKey(None, HOTKEY_ID, MOD_CONTROL | MOD_ALT, VK_B)

    msg = MSG()
    try:
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            if msg.message == 0x0312 and msg.wParam == HOTKEY_ID:
                beam_clipboard()
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))
    finally:
        user32.UnregisterHotKey(None, HOTKEY_ID)

if __name__ == "__main__":
    # Start receiver thread
    t = threading.Thread(target=receiver_loop, daemon=True)
    t.start()
    # Run hotkey message pump on main thread
    hotkey_loop()
