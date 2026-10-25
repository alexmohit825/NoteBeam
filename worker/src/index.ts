export interface Env {
  NOTEBEAM_KV: KVNamespace;
  AUTH_TOKEN?: string;
  NTFY_TOPIC?: string;
}

interface NotePayload {
  id: string;
  title: string;
  markdown: string;
  html?: string;
  filename: string;
  stats?: {
    words: number;
    paragraphs: number;
    characters: number;
  };
  file_data?: string; // base64 encoded for binary files
  file_type?: string; // mime type
  file_size?: number;
  timestamp: number;
  direction: "pc_to_phone" | "phone_to_pc";
  client?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-NoteBeam-Key",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const expectedToken = env.AUTH_TOKEN || "nb_mohit_sec_2026_beam";

    // ------------------------------------------------------------------
    // ROUTE: POST /api/beam (PC -> iPhone)
    // ------------------------------------------------------------------
    if (url.pathname === "/api/beam" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization") || request.headers.get("X-NoteBeam-Key");
      const token = authHeader?.replace(/^Bearer\s+/i, "");
      if (token !== expectedToken) {
        return new Response(JSON.stringify({ error: "Unauthorized." }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      try {
        const body = (await request.json()) as Partial<NotePayload>;
        const note: NotePayload = {
          id: body.id || `nb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: body.title || "Beamed Item",
          markdown: body.markdown || "",
          html: body.html,
          filename: body.filename || "Clipboard.txt",
          file_data: body.file_data,
          file_type: body.file_type || "text/plain",
          file_size: body.file_size || (body.markdown ? body.markdown.length : 0),
          stats: body.stats || {
            words: (body.markdown || "").split(/\s+/).filter(Boolean).length,
            paragraphs: (body.markdown || "").split(/\n\s*\n/).filter(Boolean).length,
            characters: (body.markdown || "").length,
          },
          timestamp: Date.now(),
          direction: "pc_to_phone",
          client: body.client || "Windows-PC",
        };

        // Store latest PC->Phone item
        await env.NOTEBEAM_KV.put("latest_pc_to_phone", JSON.stringify(note));
        await env.NOTEBEAM_KV.put(`item:${note.id}`, JSON.stringify(note), {
          expirationTtl: 60 * 60 * 24 * 7, // 7 days
        });

        return new Response(
          JSON.stringify({
            success: true,
            id: note.id,
            title: note.title,
            timestamp: note.timestamp,
            message: "Item successfully beamed to phone queue.",
          }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // ------------------------------------------------------------------
    // ROUTE: POST /api/phone-to-pc (iPhone -> PC)
    // ------------------------------------------------------------------
    if (url.pathname === "/api/phone-to-pc" && request.method === "POST") {
      try {
        const body = (await request.json()) as Partial<NotePayload>;
        const item: NotePayload = {
          id: body.id || `phone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: body.title || "iPhone Upload",
          markdown: body.markdown || "",
          filename: body.filename || `iPhone_${Date.now()}.txt`,
          file_data: body.file_data,
          file_type: body.file_type || "text/plain",
          file_size: body.file_size || (body.markdown ? body.markdown.length : 0),
          timestamp: Date.now(),
          direction: "phone_to_pc",
          client: "iPhone-Safari",
        };

        // Save into pending queue for PC
        const queueRaw = await env.NOTEBEAM_KV.get("queue_for_pc");
        const queue: Array<NotePayload> = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push(item);
        await env.NOTEBEAM_KV.put("queue_for_pc", JSON.stringify(queue.slice(-25)));
        await env.NOTEBEAM_KV.put(`item:${item.id}`, JSON.stringify(item), {
          expirationTtl: 60 * 60 * 24 * 7,
        });

        return new Response(
          JSON.stringify({ success: true, id: item.id, message: "Item queued for PC download." }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // ------------------------------------------------------------------
    // ROUTE: GET /api/pending-for-pc (PC polls this to auto-download)
    // ------------------------------------------------------------------
    if (url.pathname === "/api/pending-for-pc" && request.method === "GET") {
      const authHeader = request.headers.get("Authorization") || url.searchParams.get("token");
      const token = authHeader?.replace(/^Bearer\s+/i, "");
      if (token !== expectedToken) {
        return new Response("Unauthorized", { status: 401 });
      }

      const queueRaw = await env.NOTEBEAM_KV.get("queue_for_pc");
      const queue: Array<NotePayload> = queueRaw ? JSON.parse(queueRaw) : [];
      return new Response(JSON.stringify({ success: true, items: queue }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    // ROUTE: POST /api/ack-pc/:id (PC acknowledges item downloaded)
    // ------------------------------------------------------------------
    if (url.pathname.startsWith("/api/ack-pc/") && request.method === "POST") {
      const id = url.pathname.replace("/api/ack-pc/", "");
      const queueRaw = await env.NOTEBEAM_KV.get("queue_for_pc");
      if (queueRaw) {
        const queue: Array<NotePayload> = JSON.parse(queueRaw);
        const filtered = queue.filter((i) => i.id !== id);
        await env.NOTEBEAM_KV.put("queue_for_pc", JSON.stringify(filtered));
      }
      return new Response(JSON.stringify({ success: true, acknowledged: id }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    // ROUTE: GET /api/latest (iPhone / Shortcut retrieves latest PC item)
    // ------------------------------------------------------------------
    if (url.pathname === "/api/latest" && request.method === "GET") {
      const format = url.searchParams.get("format") || "json";
      const raw = await env.NOTEBEAM_KV.get("latest_pc_to_phone");
      if (!raw) {
        return new Response(
          format === "raw" ? "No notes beamed yet." : JSON.stringify({ success: false, message: "No notes beamed yet." }),
          {
            status: format === "raw" ? 200 : 404,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": format === "raw" ? "text/plain; charset=utf-8" : "application/json",
            },
          }
        );
      }

      const note: NotePayload = JSON.parse(raw);
      if (format === "raw" || format === "text") {
        return new Response(note.markdown || note.title, {
          headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      return new Response(JSON.stringify({ success: true, note }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    // ROUTE: GET / or /view (Unified Responsive Bidirectional Web App)
    // ------------------------------------------------------------------
    if (url.pathname === "/" || url.pathname === "/view") {
      const raw = await env.NOTEBEAM_KV.get("latest_pc_to_phone");
      const note: NotePayload | null = raw ? JSON.parse(raw) : null;
      return new Response(renderBidirectionalApp(note, url.origin), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderBidirectionalApp(note: NotePayload | null, host: string): string {
  const noteTitle = note ? escapeHtml(note.title) : "No Content Received Yet";
  const noteFilename = note ? escapeHtml(note.filename) : "None";
  const noteDate = note ? new Date(note.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "--";
  const noteContent = note ? escapeHtml(note.markdown) : "Right-click any file on your PC or hit the Desktop NoteBeam button to send content here.";
  const hasFile = Boolean(note?.file_data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>NoteBeam · PC $\\leftrightarrow$ iPhone Bridge</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="NoteBeam">
  <meta name="theme-color" content="#0b0f19">
  <link rel="apple-touch-icon" href="https://api.iconify.design/heroicons:bolt-solid.svg?color=%230A84FF">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(22, 28, 45, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #0A84FF;
      --accent-glow: rgba(10, 132, 255, 0.25);
      --green: #30D158;
      --purple: #AF52DE;
      --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: env(safe-area-inset-top, 20px) 16px env(safe-area-inset-bottom, 24px);
    }
    .container { width: 100%; max-width: 580px; margin: 0 auto; }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 4px 16px;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #0A84FF 0%, #AF52DE 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; box-shadow: 0 4px 14px var(--accent-glow);
    }
    .brand-title { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .brand-subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); font-weight: 600; }
    
    /* Segmented Tab Control */
    .tab-bar {
      display: flex;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 3px;
      margin-bottom: 16px;
      border: 1px solid var(--card-border);
    }
    .tab-btn {
      flex: 1;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .tab-btn.active {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }

    .meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; font-size: 12px; color: var(--text-muted); }
    .meta-pill {
      background: rgba(255, 255, 255, 0.06);
      padding: 4px 9px; border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;
    }

    h2.title { font-size: 20px; font-weight: 700; margin-bottom: 14px; color: #fff; line-height: 1.3; }

    .btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 14px 18px; border-radius: 14px; font-size: 15px;
      font-weight: 600; text-decoration: none; cursor: pointer; border: none;
      font-family: inherit; margin-bottom: 10px; transition: transform 0.1s ease, opacity 0.15s ease;
    }
    .btn:active { transform: scale(0.98); opacity: 0.9; }
    .btn-notes {
      background: linear-gradient(135deg, #FF9500 0%, #FF5E3A 100%);
      color: #fff; box-shadow: 0 4px 16px rgba(255, 149, 0, 0.3);
    }
    .btn-primary {
      background: linear-gradient(135deg, #0A84FF 0%, #0060df 100%);
      color: #fff; box-shadow: 0 4px 14px var(--accent-glow);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text); border: 1px solid var(--card-border);
    }

    .preview-box {
      background: rgba(10, 14, 23, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px; padding: 16px;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 13px; line-height: 1.6;
      max-height: 280px; overflow-y: auto; white-space: pre-wrap;
      word-break: break-word; color: #e5e7eb; margin-top: 14px;
    }

    /* Outbox Tab (Send to PC) */
    .upload-zone {
      border: 2px dashed rgba(255, 255, 255, 0.18);
      border-radius: 16px; padding: 24px 16px; text-align: center;
      cursor: pointer; transition: border-color 0.2s ease; margin-bottom: 16px;
    }
    .upload-zone:active { border-color: var(--accent); background: rgba(10, 132, 255, 0.05); }
    .upload-icon { font-size: 36px; margin-bottom: 8px; }
    .upload-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    .upload-hint { font-size: 12px; color: var(--text-muted); }

    textarea.input-box {
      width: 100%; height: 110px; background: rgba(10, 14, 23, 0.65);
      border: 1px solid var(--card-border); border-radius: 12px;
      padding: 12px; color: #fff; font-family: inherit; font-size: 14px;
      resize: none; outline: none; margin-bottom: 12px;
    }
    textarea.input-box:focus { border-color: var(--accent); }

    .toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #10b981; color: white; padding: 12px 22px;
      border-radius: 30px; font-size: 14px; font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100;
    }
    .toast.show { transform: translateX(-50%) translateY(0); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">⚡</div>
        <div>
          <div class="brand-title">NoteBeam</div>
          <div class="brand-subtitle">PC $\\leftrightarrow$ iPhone Bridge</div>
        </div>
      </div>
      <button class="meta-pill" onclick="refreshContent()" style="cursor:pointer; border:none; background:rgba(255,255,255,0.1); color:#fff;">
        🔄 Refresh
      </button>
    </header>

    <div class="tab-bar">
      <button class="tab-btn active" id="tab-inbox" onclick="switchTab('inbox')">📥 Received from PC</button>
      <button class="tab-btn" id="tab-outbox" onclick="switchTab('outbox')">📤 Send to PC</button>
    </div>

    <!-- TAB 1: INCOMING FROM PC -->
    <div id="view-inbox">
      <div class="card">
        <div class="meta-row">
          <span class="meta-pill">🕒 ${noteDate}</span>
          <span class="meta-pill">📄 ${noteFilename}</span>
        </div>

        <h2 class="title" id="note-title">${noteTitle}</h2>

        <!-- HERO ACTION 1: SEND DIRECT TO APPLE NOTES -->
        <button class="btn btn-notes" onclick="saveToAppleNotes()">
          <span>📝</span> <strong>Save to Apple Notes</strong>
        </button>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button class="btn btn-secondary" onclick="copyNoteText()">
            <span>📋</span> Copy Text
          </button>
          <button class="btn btn-secondary" onclick="shareNativeSheet()">
            <span>📤</span> iOS Share
          </button>
        </div>

        ${
          hasFile
            ? `<button class="btn btn-primary" onclick="downloadAttachment()" style="margin-top:4px;">
                <span>💾</span> Download Attachment (${noteFilename})
               </button>`
            : ""
        }

        <div class="preview-box" id="preview-text">${noteContent}</div>
      </div>
    </div>

    <!-- TAB 2: SEND TO PC -->
    <div id="view-outbox" style="display: none;">
      <div class="card">
        <h2 class="title">Drop to Your PC</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Photos, documents, or text sent here automatically download into your PC's <strong>Downloads\\NoteBeam</strong> folder with an instant Windows chime!
        </p>

        <!-- FILE / PHOTO DROP ZONE -->
        <label class="upload-zone" for="file-input" style="display:block;">
          <div class="upload-icon">📁</div>
          <div class="upload-title">Select Photo, PDF, or Document</div>
          <div class="upload-hint">Uploads directly to your PC desktop</div>
          <input type="file" id="file-input" multiple onchange="uploadFilesToPC(this)" style="display:none;">
        </label>

        <!-- TEXT / DICTATION BOX -->
        <div style="font-size: 13px; font-weight:600; margin-bottom: 6px;">Or Beam Text Directly to PC Clipboard:</div>
        <textarea class="input-box" id="phone-text-input" placeholder="Type or dictate a note to beam to your PC clipboard..."></textarea>
        <button class="btn btn-primary" onclick="sendTextToPC()">
          <span>⚡</span> Beam Text to PC Clipboard
        </button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast">Saved!</div>

  <script>
    const noteRaw = ${JSON.stringify(note?.markdown || "")};
    const noteTitleText = ${JSON.stringify(note?.title || "NoteBeam Note")};
    const fileDataBase64 = ${JSON.stringify(note?.file_data || "")};
    const fileMime = ${JSON.stringify(note?.file_type || "application/octet-stream")};
    const filenameStr = ${JSON.stringify(note?.filename || "download")};

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2400);
    }

    function switchTab(tab) {
      document.getElementById('view-inbox').style.display = tab === 'inbox' ? 'block' : 'none';
      document.getElementById('view-outbox').style.display = tab === 'outbox' ? 'block' : 'none';
      document.getElementById('tab-inbox').classList.toggle('active', tab === 'inbox');
      document.getElementById('tab-outbox').classList.toggle('active', tab === 'outbox');
    }

    function refreshContent() {
      window.location.reload();
    }

    // 1-TAP SAVE TO APPLE NOTES
    function saveToAppleNotes() {
      if (!noteRaw) return showToast("No text to save");

      // Method 1: Web Share API (Triggers native iOS Notes sheet)
      if (navigator.share) {
        navigator.share({
          title: noteTitleText,
          text: noteRaw
        }).catch(() => {
          fallbackCopyToNotes();
        });
      } else {
        fallbackCopyToNotes();
      }
    }

    function fallbackCopyToNotes() {
      navigator.clipboard.writeText(noteRaw).then(() => {
        showToast("✓ Copied! Opening Notes...");
        setTimeout(() => {
          window.location.href = "mobilenotes://";
        }, 400);
      });
    }

    function copyNoteText() {
      navigator.clipboard.writeText(noteRaw).then(() => {
        showToast("✓ Copied text to clipboard!");
      });
    }

    function shareNativeSheet() {
      if (navigator.share) {
        navigator.share({
          title: noteTitleText,
          text: noteRaw
        }).catch(() => {});
      } else {
        copyNoteText();
      }
    }

    function downloadAttachment() {
      if (!fileDataBase64) return;
      const a = document.createElement('a');
      a.href = "data:" + fileMime + ";base64," + fileDataBase64;
      a.download = filenameStr;
      a.click();
    }

    // PHONE -> PC: SEND TEXT
    async function sendTextToPC() {
      const input = document.getElementById('phone-text-input');
      const text = input.value.trim();
      if (!text) return showToast("Enter text first");

      showToast("⏳ Beaming to PC...");
      try {
        const resp = await fetch('/api/phone-to-pc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: text.substring(0, 40),
            markdown: text,
            filename: "Phone_Snippet.txt",
            file_type: "text/plain"
          })
        });
        const res = await resp.json();
        if (res.success) {
          input.value = "";
          showToast("✓ Beamed to PC Clipboard!");
        }
      } catch (err) {
        alert("Transfer failed: " + err.message);
      }
    }

    // PHONE -> PC: UPLOAD FILES / PHOTOS
    async function uploadFilesToPC(input) {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      showToast("⏳ Uploading " + file.name + " to PC...");

      const reader = new FileReader();
      reader.onload = async function() {
        const base64Data = reader.result.split(',')[1];
        try {
          const resp = await fetch('/api/phone-to-pc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: file.name,
              filename: file.name,
              file_type: file.type || "application/octet-stream",
              file_size: file.size,
              file_data: base64Data
            })
          });
          const res = await resp.json();
          if (res.success) {
            showToast("✓ Sent to PC! (Saved in Downloads)");
            input.value = "";
          }
        } catch (err) {
          alert("Upload failed: " + err.message);
        }
      };
      reader.readAsDataURL(file);
    }
  </script>
</body>
</html>`;
}
