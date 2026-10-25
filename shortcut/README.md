# NoteBeam iOS Shortcut Setup

## ⚡ 1-Tap iOS Shortcut Configuration

You can configure this shortcut in Apple's native **Shortcuts** app on your iPhone in under 30 seconds.

### Step 1: Open Apple Shortcuts App
* Tap the **`+`** icon in the top right to create a new shortcut.
* Name the shortcut: **`NoteBeam`**

### Step 2: Add Action 1 — "Get Contents of URL"
* Search for **"Get Contents of URL"** and add it.
* Set the URL to:
  ```
  https://notebeam-relay.mohalex.workers.dev/api/latest?format=raw
  ```
* Method: `GET` (default)

### Step 3: Add Action 2 — "Create Note"
* Search for **"Create Note"** (Apple Notes action).
* Set to: **Create note with `Contents of URL` in `Notes`**
* Tap the dropdown arrow on the action and turn **"Show When Run"** $\to$ **`OFF`** (so it saves silently without asking for extra taps).

### Step 4: Add Action 3 (Optional) — "Show Notification"
* Add **"Show Notification"**: `Beamed to Notes!`

---

## 📲 How to Use NoteBeam on iPhone

1. **Instant Web View:**
   Visit: **[https://notebeam-relay.mohalex.workers.dev/view](https://notebeam-relay.mohalex.workers.dev/view)**
   * Shows the latest document/clipboard text.
   * Has 1-tap **"Create in Apple Notes"**, **"Copy All Text"**, and **"Native Share Sheet"** buttons.

2. **Home Screen / Lock Screen Widget:**
   * Add the **NoteBeam** shortcut as a 1-tap widget on your iPhone Home Screen or Lock Screen.
   * After pressing `Ctrl+Alt+B` or right-clicking a Word doc on your PC, 1 tap on the iPhone widget saves it straight to Apple Notes!
