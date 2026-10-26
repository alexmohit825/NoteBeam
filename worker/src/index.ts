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


const ICON_BASE64 = "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";

function getIconResponse(): Response {
  const binaryString = atob(ICON_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Response(bytes.buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Serve PWA and iOS Icons
    if (url.pathname === "/apple-touch-icon.png" || url.pathname === "/icon-192.png" || url.pathname === "/icon-512.png" || url.pathname === "/favicon.ico") {
      return getIconResponse();
    }

    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify({
        name: "NoteBeam",
        short_name: "NoteBeam",
        description: "PC to iPhone AirDrop Bridge",
        start_url: "/",
        display: "standalone",
        background_color: "#FCE7F3",
        theme_color: "#0b0f19",
        icons: [
          { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }), {
        headers: { "Content-Type": "application/manifest+json" }
      });
    }


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
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
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
