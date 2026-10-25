"""
NoteBeam PC Receiver Daemon
Automatically receives incoming files, photos, and text from iPhone.
Saves files to C:\\Users\\mohal\\Downloads\\NoteBeam\\ and copies text to Windows clipboard.
Copyright (c) 2026 A. Alex Mohit.
"""

import sys
import os
import time
import json
import base64
import urllib.request
import urllib.error
import winsound
import ctypes
from pathlib import Path

# Add parent client directory to path
sys.path.insert(0, str(Path(__file__).parent))
from notebeam import notify, load_config

DOWNLOAD_DIR = Path(r"C:\Users\mohal\Downloads\NoteBeam")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def set_windows_clipboard(text: str):
    """Sets Unicode text into Windows clipboard via ctypes."""
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    CF_UNICODETEXT = 13
    if not user32.OpenClipboard(0):
        return False
    try:
        user32.EmptyClipboard()
        # Encode as UTF-16-LE null-terminated
        data = (text + "\0").encode("utf-16le")
        h_mem = kernel32.GlobalAlloc(0x0002, len(data)) # GMEM_MOVEABLE
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

def check_incoming_from_phone():
    config = load_config()
    base_url = config.get("endpoint", "https://notebeam-relay.mohalex.workers.dev/api/beam").replace("/api/beam", "")
    poll_url = f"{base_url}/api/pending-for-pc"
    auth_token = config.get("auth_token", "nb_mohit_sec_2026_beam")

    req = urllib.request.Request(
        poll_url,
        headers={
            "Authorization": f"Bearer {auth_token}",
            "User-Agent": USER_AGENT
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("items", [])
            for item in items:
                process_phone_item(item, base_url, auth_token)
    except Exception as e:
        # Silently retry on network hiccups
        pass

def process_phone_item(item: dict, base_url: str, auth_token: str):
    item_id = item.get("id")
    filename = item.get("filename") or f"iPhone_Item_{int(time.time())}.txt"
    file_data_b64 = item.get("file_data")
    markdown_text = item.get("markdown")

    dest_path = DOWNLOAD_DIR / filename
    # Avoid overwriting existing files with same name
    counter = 1
    base_stem = dest_path.stem
    base_ext = dest_path.suffix
    while dest_path.exists():
        dest_path = DOWNLOAD_DIR / f"{base_stem}_{counter}{base_ext}"
        counter += 1

    try:
        if file_data_b64:
            # Binary file / photo
            raw_bytes = base64.b64decode(file_data_b64)
            dest_path.write_bytes(raw_bytes)
            notify("⚡ Received from iPhone!", f"Saved: {dest_path.name}")
            print(f"[+] Downloaded iPhone file: {dest_path}")
        elif markdown_text:
            # Text / snippet
            dest_path.write_text(markdown_text, encoding="utf-8")
            # Copy straight to Windows clipboard!
            set_windows_clipboard(markdown_text)
            notify("⚡ Received from iPhone!", f"Snippet copied to your PC clipboard: {item.get('title')[:40]}")
            print(f"[+] Downloaded iPhone text to clipboard & file: {dest_path}")

        # Acknowledge to server
        ack_url = f"{base_url}/api/ack-pc/{item_id}"
        ack_req = urllib.request.Request(
            ack_url,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "User-Agent": USER_AGENT
            },
            method="POST"
        )
        urllib.request.urlopen(ack_req, timeout=5)
    except Exception as err:
        print(f"[-] Error processing item {item_id}: {err}")

def run_receiver_loop():
    print("[*] NoteBeam PC Receiver active.")
    print(f"[*] Watching for incoming files from iPhone -> {DOWNLOAD_DIR}")
    while True:
        try:
            check_incoming_from_phone()
        except Exception:
            pass
        time.sleep(2.5)

if __name__ == "__main__":
    run_receiver_loop()
