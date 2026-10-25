"""
NoteBeam - 1-Click Word Document & Clipboard to iPhone Apple Notes
Copyright (c) 2026 A. Alex Mohit. All rights reserved.
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
import ctypes
from ctypes import wintypes
import winsound
import re
from pathlib import Path

# Optional docx support
try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

CONFIG_PATH = Path(__file__).parent / "config.json"

def load_config() -> dict:
    default_config = {
        "endpoint": "https://notebeam-relay.mohalex.workers.dev/api/beam",
        "auth_token": "nb_mohit_sec_2026_beam",
        "play_sound": True,
        "show_toast": True
    }
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return {**default_config, **json.load(f)}
        except Exception:
            pass
    return default_config

# -------------------------------------------------------------
# Native Windows Toast Notification (Zero external dependencies)
# -------------------------------------------------------------
def notify(title: str, message: str):
    config = load_config()
    if config.get("play_sound", True):
        try:
            winsound.MessageBeep(winsound.MB_ICONASTERISK)
        except Exception:
            pass

    if not config.get("show_toast", True):
        return

    # Use PowerShell toast or balloon for instant native Windows notification
    ps_cmd = f'''
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $textNodes = $template.GetElementsByTagName("text")
    $textNodes.Item(0).AppendChild($template.CreateTextNode("{title}")) > $null
    $textNodes.Item(1).AppendChild($template.CreateTextNode("{message}")) > $null
    $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("NoteBeam").Show($toast)
    '''
    try:
        import subprocess
        subprocess.Popen(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_cmd],
            creationflags=0x08000000 # CREATE_NO_WINDOW
        )
    except Exception:
        print(f"[{title}] {message}")

# -------------------------------------------------------------
# Native Windows Clipboard Readers (64-bit ctypes + fallback)
# -------------------------------------------------------------
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

user32.GetClipboardData.restype = ctypes.c_void_p
user32.GetClipboardData.argtypes = [wintypes.UINT]
user32.OpenClipboard.argtypes = [wintypes.HWND]
user32.OpenClipboard.restype = wintypes.BOOL
user32.CloseClipboard.restype = wintypes.BOOL

kernel32.GlobalLock.restype = ctypes.c_void_p
kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
kernel32.GlobalUnlock.restype = wintypes.BOOL
kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]

CF_TEXT = 1
CF_UNICODETEXT = 13
CF_HDROP = 15

def get_clipboard_text() -> str:
    """Reads Unicode text from Windows clipboard with 64-bit ctypes and Tk fallback."""
    # Method 1: Direct 64-bit Win32 API
    if user32.OpenClipboard(None):
        try:
            h_clip = user32.GetClipboardData(CF_UNICODETEXT)
            if h_clip:
                p_text = kernel32.GlobalLock(h_clip)
                if p_text:
                    try:
                        text = ctypes.c_wchar_p(p_text).value
                        if text:
                            return text
                    finally:
                        kernel32.GlobalUnlock(h_clip)
        finally:
            user32.CloseClipboard()

    # Method 2: Tkinter standard library fallback
    try:
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        text = root.clipboard_get()
        root.destroy()
        if text:
            return text
    except Exception:
        pass

    # Method 3: PowerShell fallback
    try:
        import subprocess
        res = subprocess.run(
            ["powershell", "-NoProfile", "-Command", "Get-Clipboard"],
            capture_output=True,
            text=True,
            timeout=3
        )
        if res.returncode == 0:
            return res.stdout
    except Exception:
        pass

    return ""

def get_clipboard_files() -> list:
    """Returns list of file paths if clipboard currently holds copied files (CF_HDROP)."""
    if not user32.OpenClipboard(None):
        return []
    try:
        h_drop = user32.GetClipboardData(CF_HDROP)
        if not h_drop:
            return []
        
        shell32 = ctypes.windll.shell32
        shell32.DragQueryFileW.argtypes = [ctypes.c_void_p, wintypes.UINT, wintypes.LPWSTR, wintypes.UINT]
        shell32.DragQueryFileW.restype = wintypes.UINT
        
        count = shell32.DragQueryFileW(h_drop, 0xFFFFFFFF, None, 0)
        files = []
        buf = ctypes.create_unicode_buffer(512)
        for i in range(count):
            shell32.DragQueryFileW(h_drop, i, buf, 512)
            files.append(buf.value)
        return files
    finally:
        user32.CloseClipboard()

# -------------------------------------------------------------
# Word Document (.docx) Parser
# -------------------------------------------------------------
def parse_docx(file_path: Path) -> dict:
    if not HAS_DOCX:
        raise RuntimeError("python-docx is not installed. Run: pip install python-docx")

    doc = docx.Document(file_path)
    title = file_path.stem
    lines = []

    # First pass: look for Title style or first Heading 1
    found_title = False
    for p in doc.paragraphs:
        style_name = p.style.name.lower() if p.style else ""
        text = p.text.strip()
        if not text:
            continue
        if ("title" in style_name or "heading 1" in style_name) and not found_title:
            title = text
            found_title = True
            lines.append(f"# {text}\n")
            continue

        if "heading 1" in style_name:
            lines.append(f"# {text}")
        elif "heading 2" in style_name:
            lines.append(f"## {text}")
        elif "heading 3" in style_name:
            lines.append(f"### {text}")
        elif "bullet" in style_name or "list bullet" in style_name:
            lines.append(f"- {text}")
        elif "number" in style_name or "list number" in style_name:
            lines.append(f"1. {text}")
        else:
            # Format runs (bold, italic)
            p_formatted = []
            for run in p.runs:
                r_text = run.text
                if not r_text:
                    continue
                if run.bold and run.italic:
                    r_text = f"***{r_text}***"
                elif run.bold:
                    r_text = f"**{r_text}**"
                elif run.italic:
                    r_text = f"*{r_text}*"
                p_formatted.append(r_text)
            lines.append("".join(p_formatted) if p_formatted else text)

    # Process tables into clean Markdown tables
    for table in doc.tables:
        lines.append("") # spacer
        rows_data = []
        for row in table.rows:
            cell_texts = [cell.text.replace("\n", " ").strip() for cell in row.cells]
            rows_data.append(cell_texts)

        if rows_data:
            header = rows_data[0]
            lines.append("| " + " | ".join(header) + " |")
            lines.append("| " + " | ".join(["---"] * len(header)) + " |")
            for row in rows_data[1:]:
                # ensure matching column count
                padded = row + [""] * (len(header) - len(row))
                lines.append("| " + " | ".join(padded[:len(header)]) + " |")
            lines.append("")

    markdown_text = "\n\n".join([line for line in lines if line is not None])
    # Fallback to plain text if empty
    if not markdown_text.strip():
        markdown_text = f"# {title}\n\n*(Empty Document)*"

    words = len(markdown_text.split())
    paragraphs = len(lines)

    return {
        "title": title,
        "markdown": markdown_text,
        "filename": file_path.name,
        "stats": {
            "words": words,
            "paragraphs": paragraphs,
            "characters": len(markdown_text)
        }
    }

# -------------------------------------------------------------
# Dispatch to Cloudflare Edge Relay
# -------------------------------------------------------------
def dispatch_payload(payload: dict) -> dict:
    config = load_config()
    endpoint = config.get("endpoint", "https://notebeam-relay.mohalex.workers.dev/api/beam")
    auth_token = config.get("auth_token", "nb_mohit_sec_2026_beam")

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=req_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}",
            "User-Agent": "NoteBeam-Windows/1.0"
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=10) as resp:
        resp_data = resp.read().decode("utf-8")
        return json.loads(resp_data)

# -------------------------------------------------------------
# Main Commands
# -------------------------------------------------------------
def beam_file(path_str: str):
    p = Path(path_str).resolve()
    if not p.exists():
        notify("NoteBeam Error", f"File not found: {p.name}")
        return False

    suffix = p.suffix.lower()
    print(f"[*] Beaming document: {p.name}...")

    if suffix == ".docx":
        payload = parse_docx(p)
    elif suffix in [".txt", ".md", ".json", ".csv"]:
        text = p.read_text(encoding="utf-8", errors="replace")
        title = p.stem
        payload = {
            "title": title,
            "markdown": text,
            "filename": p.name,
            "stats": {
                "words": len(text.split()),
                "paragraphs": len(text.splitlines()),
                "characters": len(text)
            }
        }
    else:
        notify("NoteBeam Error", f"Unsupported file type: {suffix}")
        return False

    payload["timestamp"] = int(time.time() * 1000)
    payload["client"] = "NoteBeam-Windows-File"

    try:
        res = dispatch_payload(payload)
        notify("⚡ NoteBeam Sent!", f"{payload['title']} ({payload['stats']['words']} words) is ready on your iPhone.")
        print(f"[+] Successfully beamed '{payload['title']}' to Apple Notes relay.")
        return True
    except Exception as e:
        notify("NoteBeam Transfer Failed", str(e))
        print(f"[-] Transfer failed: {e}")
        return False

def beam_clipboard():
    # 1. Check if user copied files (e.g. copied a .docx in Windows Explorer)
    files = get_clipboard_files()
    if files:
        target = files[0]
        print(f"[*] Detected copied file on clipboard: {target}")
        return beam_file(target)

    # 2. Read clipboard text
    text = get_clipboard_text().strip()
    if not text:
        notify("NoteBeam", "Clipboard is empty. Copy text or a Word document first.")
        print("[-] Clipboard is empty.")
        return False

    # Extract smart title from first non-empty line
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    first_line = lines[0] if lines else "Clipboard Note"
    # Truncate first line for title if too long
    title = first_line[:50] if len(first_line) > 50 else first_line
    title = re.sub(r'^[#*\-•>\d.]+\s*', '', title) # Clean leading markdown/bullets for title

    words = len(text.split())
    chars = len(text)

    payload = {
        "title": title or f"Clipboard Note ({time.strftime('%I:%M %p')})",
        "markdown": text,
        "filename": f"Clipboard_{time.strftime('%Y%m%d_%H%M%S')}.txt",
        "stats": {
            "words": words,
            "paragraphs": len(lines),
            "characters": chars
        },
        "timestamp": int(time.time() * 1000),
        "client": "NoteBeam-Windows-Clipboard"
    }

    print(f"[*] Beaming clipboard text ({words} words)...")
    try:
        res = dispatch_payload(payload)
        notify("⚡ NoteBeam Sent!", f"Clipboard ({words} words) is ready on your iPhone Notes.")
        print(f"[+] Successfully beamed clipboard to Apple Notes relay.")
        return True
    except Exception as e:
        notify("NoteBeam Transfer Failed", str(e))
        print(f"[-] Transfer failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1].strip()
        if arg in ["--clipboard", "-c", "clipboard"]:
            beam_clipboard()
        elif arg in ["--test", "-t"]:
            print("[*] Testing NoteBeam connection...")
            test_payload = {
                "title": "NoteBeam Test Ping",
                "markdown": "# NoteBeam Ready\n\nWindows to iPhone Apple Notes bridge is active.",
                "filename": "test.txt",
                "timestamp": int(time.time() * 1000)
            }
            res = dispatch_payload(test_payload)
            print("[+] Connection verified:", res)
        else:
            beam_file(arg)
    else:
        # Default with no arguments: beam clipboard!
        beam_clipboard()
