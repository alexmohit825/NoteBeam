# NoteBeam ⚡

> **1-Click Word Document & Clipboard to iPhone Apple Notes Bridge**  
> *Developed for Dr. A. Alex Mohit · 2026 A. Alex Mohit*

---

## 🚀 Overview

**NoteBeam** provides an instantaneous, zero-friction bridge between your Windows desktop and your physical iPhone's native Apple Notes app. It supports both whole Word documents (`.docx`) and highlighted clipboard snippets with full formatting preservation (headings, bullet points, numbered lists, bold/italics, and Markdown tables).

---

## ⚡ Instant Windows Usage

### 1. Highlight & Beam (Global Hotkey)
* Select any text anywhere in Windows (Word document, web page, PDF, or editor) and hit `Ctrl + C`.
* Press **`Ctrl + Alt + B`**.
* The snippet is parsed and beamed to your iPhone in $<60\text{ ms}$.

### 2. Right-Click Word Document
* Right-click any `.docx`, `.doc`, `.txt`, or `.md` file in Windows Explorer.
* Click **"NoteBeam: Send to iPhone Notes"**.
* Headings, bullet lists, and tables are automatically parsed and formatted.

### 3. Right-Click Desktop / Folder Background
* Right-click any empty space on your Desktop or in any folder.
* Click **"NoteBeam: Beam Clipboard to iPhone Notes"**.

---

## 📱 iPhone Receiving Options

### Option A: 1-Tap iOS Shortcut (Native Apple Notes)
* Open Apple Shortcuts $\to$ Create **`NoteBeam`**:
  1. **Get Contents of URL:** `https://notebeam-relay.mohalex.workers.dev/api/latest?format=raw`
  2. **Create Note with `Contents of URL` in `Notes`** (Show When Run = OFF).
* Add as a 1-tap widget to your iPhone Home Screen or Lock Screen.

### Option B: Mobile Web Viewer
* Access **[https://notebeam-relay.mohalex.workers.dev/view](https://notebeam-relay.mohalex.workers.dev/view)** in Safari on your iPhone.
* Bookmark it or "Add to Home Screen" as a lightweight PWA.
* Features 1-tap buttons:
  * 📱 **Create in Apple Notes (Shortcut)**
  * 📋 **Copy All Text**
  * 📤 **Native Share Sheet**

---

## 🛠️ System Architecture

* **Windows Client:** Python 3.14 + `docx` + 64-bit Win32 API (`ctypes`), zero external daemon dependencies.
* **Edge Relay:** Cloudflare Worker V8 Isolate (`notebeam-relay`) + KV Storage (`NOTEBEAM_KV`) deployed globally with $<5\text{ ms}$ latency.
* **Apple Notes Integration:** Native Apple Shortcuts engine (`shortcuts://run-shortcut?name=NoteBeam`).

---

## 📜 Copyright
Copyright © 2026 A. Alex Mohit. All rights reserved.
