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
  timestamp: number;
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

    // Route: POST /api/beam
    if (url.pathname === "/api/beam" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization") || request.headers.get("X-NoteBeam-Key");
      const expectedToken = env.AUTH_TOKEN || "nb_mohit_sec_2026_beam";

      const token = authHeader?.replace(/^Bearer\s+/i, "");
      if (token !== expectedToken) {
        return new Response(JSON.stringify({ error: "Unauthorized. Invalid NoteBeam token." }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      try {
        const body = (await request.json()) as Partial<NotePayload>;
        if (!body.title || !body.markdown) {
          return new Response(JSON.stringify({ error: "Missing required fields: title and markdown." }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          });
        }

        const note: NotePayload = {
          id: body.id || `nb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: body.title,
          markdown: body.markdown,
          html: body.html,
          filename: body.filename || "Untitled.docx",
          stats: body.stats || {
            words: body.markdown.split(/\s+/).filter(Boolean).length,
            paragraphs: body.markdown.split(/\n\s*\n/).filter(Boolean).length,
            characters: body.markdown.length,
          },
          timestamp: body.timestamp || Date.now(),
          client: body.client || "Windows-Desktop",
        };

        // Save latest note and indexed note in KV
        await env.NOTEBEAM_KV.put("latest_note", JSON.stringify(note));
        await env.NOTEBEAM_KV.put(`note:${note.id}`, JSON.stringify(note), {
          expirationTtl: 60 * 60 * 24 * 30, // 30 days retention
        });

        // Update recent index (last 20 notes)
        try {
          const recentRaw = await env.NOTEBEAM_KV.get("recent_index");
          const recent: Array<{ id: string; title: string; filename: string; timestamp: number }> = recentRaw
            ? JSON.parse(recentRaw)
            : [];
          const updated = [
            { id: note.id, title: note.title, filename: note.filename, timestamp: note.timestamp },
            ...recent.filter((r) => r.id !== note.id),
          ].slice(0, 20);
          await env.NOTEBEAM_KV.put("recent_index", JSON.stringify(updated));
        } catch {
          // Non-critical index update error
        }

        // Trigger Instant Push Notification via ntfy (if configured)
        if (env.NTFY_TOPIC) {
          try {
            const host = url.origin;
            await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
              method: "POST",
              headers: {
                Title: `NoteBeam: ${note.title.substring(0, 50)}`,
                Priority: "high",
                Tags: "memo,inbox_tray",
                Click: `${host}/view`,
                Actions: `view, Open in Notes, shortcuts://run-shortcut?name=NoteBeam; view, Web Preview, ${host}/view`,
              },
              body: `Word doc "${note.filename}" ready to beam (${note.stats?.words || 0} words).`,
            });
          } catch (ntfyErr) {
            console.error("ntfy dispatch error:", ntfyErr);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            id: note.id,
            title: note.title,
            timestamp: note.timestamp,
            message: "Note successfully beamed to edge relay.",
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Failed to parse request" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // Route: GET /api/latest
    if (url.pathname === "/api/latest" && request.method === "GET") {
      const format = url.searchParams.get("format") || "json";
      const token = url.searchParams.get("token");
      const expectedToken = env.AUTH_TOKEN || "nb_mohit_sec_2026_beam";

      // If token provided in query or header, validate (or allow public read if configured)
      if (token && token !== expectedToken) {
        return new Response("Unauthorized", { status: 401 });
      }

      const raw = await env.NOTEBEAM_KV.get("latest_note");
      if (!raw) {
        if (format === "text" || format === "raw") {
          return new Response("No notes beamed yet.", {
            headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        return new Response(JSON.stringify({ success: false, message: "No notes beamed yet." }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const note: NotePayload = JSON.parse(raw);

      if (format === "text" || format === "raw") {
        // Ideal for iOS Shortcuts: Direct plain/markdown text
        return new Response(note.markdown, {
          headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      return new Response(JSON.stringify({ success: true, note }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Route: GET /api/notes
    if (url.pathname === "/api/notes" && request.method === "GET") {
      const recentRaw = await env.NOTEBEAM_KV.get("recent_index");
      const recent = recentRaw ? JSON.parse(recentRaw) : [];
      return new Response(JSON.stringify({ success: true, notes: recent }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Route: GET /api/note/:id
    if (url.pathname.startsWith("/api/note/") && request.method === "GET") {
      const id = url.pathname.replace("/api/note/", "");
      const raw = await env.NOTEBEAM_KV.get(`note:${id}`);
      if (!raw) {
        return new Response(JSON.stringify({ error: "Note not found" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      return new Response(raw, {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Route: GET / or /view (Mobile-Optimized Apple-Style Web UI)
    if (url.pathname === "/" || url.pathname === "/view") {
      const raw = await env.NOTEBEAM_KV.get("latest_note");
      const note: NotePayload | null = raw ? JSON.parse(raw) : null;
      return new Response(renderWebUI(note, url.origin), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Route: GET /shortcut (Setup & Shortcut Download Instructions)
    if (url.pathname === "/shortcut") {
      return new Response(renderShortcutGuide(url.origin), {
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

function renderWebUI(note: NotePayload | null, host: string): string {
  const noteTitle = note ? escapeHtml(note.title) : "No Document Beamed Yet";
  const noteDate = note ? new Date(note.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }) : "--";
  const noteWords = note?.stats?.words || 0;
  const noteFilename = note ? escapeHtml(note.filename) : "--";
  const noteContent = note ? escapeHtml(note.markdown) : "Right-click any Word document on your Windows desktop and select 'NoteBeam: Send to iPhone Notes' to beam it here.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>NoteBeam · Word to Apple Notes</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0A84FF">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(26, 32, 50, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #0A84FF;
      --accent-glow: rgba(10, 132, 255, 0.25);
      --green: #30D158;
      --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: env(safe-area-inset-top, 24px) 16px env(safe-area-inset-bottom, 24px);
    }
    .container {
      width: 100%;
      max-width: 640px;
      margin: 0 auto;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 4px 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px var(--accent-glow);
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-subtitle {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      font-weight: 600;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(48, 209, 88, 0.15);
      color: var(--green);
      font-size: 12px;
      font-weight: 600;
      border: 1px solid rgba(48, 209, 88, 0.3);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    .doc-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 8px;
      border-radius: 6px;
    }
    h1.doc-title {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 14px;
      color: #fff;
    }
    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 13px 16px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0A84FF 0%, #0060df 100%);
      color: #fff;
      box-shadow: 0 4px 14px var(--accent-glow);
      grid-column: span 2;
    }
    .btn-primary:active { transform: scale(0.98); opacity: 0.9; }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:active { background: rgba(255, 255, 255, 0.12); }
    .content-box {
      background: rgba(10, 14, 23, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      max-height: 400px;
      overflow-y: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      color: #d1d5db;
    }
    .setup-banner {
      background: linear-gradient(135deg, rgba(10, 132, 255, 0.12) 0%, rgba(94, 92, 230, 0.12) 100%);
      border: 1px solid rgba(10, 132, 255, 0.3);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .setup-text h3 { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 2px; }
    .setup-text p { font-size: 12px; color: var(--text-muted); }
    .btn-sm {
      padding: 8px 12px;
      font-size: 12px;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      text-decoration: none;
      font-weight: 600;
      white-space: nowrap;
    }
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #10b981;
      color: white;
      padding: 10px 18px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
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
          <div class="brand-subtitle">Word $\to$ Apple Notes</div>
        </div>
      </div>
      <div class="badge-live">
        <span class="pulse-dot"></span>
        <span>Edge Relay Live</span>
      </div>
    </header>

    <div class="card">
      <div class="doc-meta">
        <span class="meta-tag">📄 ${noteFilename}</span>
        <span class="meta-tag">📝 ${noteWords} words</span>
        <span class="meta-tag">🕒 ${noteDate}</span>
      </div>

      <h1 class="doc-title">${noteTitle}</h1>

      <div class="actions-grid">
        <button class="btn btn-primary" onclick="openInAppleNotes()">
          <span>📱</span> Create in Apple Notes (Shortcut)
        </button>
        <button class="btn btn-secondary" onclick="copyNoteContent()">
          <span>📋</span> Copy All Text
        </button>
        <button class="btn btn-secondary" onclick="shareNote()">
          <span>📤</span> Native Share Sheet
        </button>
      </div>

      <div class="content-box" id="note-body">${noteContent}</div>
    </div>

    <div class="setup-banner">
      <div class="setup-text">
        <h3>Install 1-Tap iOS Shortcut</h3>
        <p>Enables 1-click notification $\to$ Apple Notes import</p>
      </div>
      <a href="/shortcut" class="btn-sm">Setup Guide $\to$</a>
    </div>
  </div>

  <div class="toast" id="toast">Copied to clipboard!</div>

  <script>
    const noteRaw = ${JSON.stringify(note?.markdown || "")};
    const noteTitle = ${JSON.stringify(note?.title || "NoteBeam Document")};

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    }

    function copyNoteContent() {
      if (!noteRaw) return showToast('No document content to copy');
      navigator.clipboard.writeText(noteRaw).then(() => {
        showToast('✓ Copied to clipboard! Paste into Notes');
      });
    }

    function openInAppleNotes() {
      // 1. Trigger native iOS Shortcut deep link
      window.location.href = 'shortcuts://run-shortcut?name=NoteBeam';
      setTimeout(() => {
        // Fallback: If shortcut not installed, copy to clipboard
        navigator.clipboard.writeText(noteRaw);
        showToast('Opening Shortcut... (Content copied to clipboard)');
      }, 500);
    }

    function shareNote() {
      if (navigator.share) {
        navigator.share({
          title: noteTitle,
          text: noteRaw,
        }).catch(() => {});
      } else {
        copyNoteContent();
      }
    }
  </script>
</body>
</html>`;
}

function renderShortcutGuide(host: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>NoteBeam · iOS Shortcut Setup</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card: rgba(26, 32, 50, 0.75);
      --accent: #0A84FF;
      --text: #f3f4f6;
      --muted: #9ca3af;
      --border: rgba(255, 255, 255, 0.08);
      --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      padding: 24px 16px;
      display: flex;
      justify-content: center;
    }
    .wrap { max-width: 540px; width: 100%; }
    h1 { font-size: 24px; margin-bottom: 8px; font-weight: 700; }
    p.lead { color: var(--muted); font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .step {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 14px;
    }
    .step-num {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      line-height: 24px;
      margin-bottom: 8px;
    }
    .step h3 { font-size: 15px; margin-bottom: 4px; font-weight: 600; }
    .step p { font-size: 13px; color: var(--muted); line-height: 1.4; }
    .code {
      background: rgba(0,0,0,0.4);
      padding: 8px 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      color: #38bdf8;
      margin-top: 8px;
      word-break: break-all;
    }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      background: var(--accent);
      color: #fff;
      padding: 12px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>NoteBeam iOS Shortcut</h1>
    <p class="lead">Connects your iPhone Apple Notes directly to your Windows desktop beam stream.</p>

    <div class="step">
      <div class="step-num">1</div>
      <h3>Open Apple Shortcuts App</h3>
      <p>Create a new shortcut on your iPhone named exactly <strong>NoteBeam</strong>.</p>
    </div>

    <div class="step">
      <div class="step-num">2</div>
      <h3>Action 1: Get Contents of URL</h3>
      <p>Add the action <strong>"Get Contents of URL"</strong> and paste this exact endpoint:</p>
      <div class="code">${host}/api/latest?format=raw</div>
    </div>

    <div class="step">
      <div class="step-num">3</div>
      <h3>Action 2: Create Note</h3>
      <p>Add the action <strong>"Create Note with [Contents of URL] in [Notes]"</strong> (turn off "Show When Run" for 1-tap instant save).</p>
    </div>

    <div class="step">
      <div class="step-num">4</div>
      <h3>Done!</h3>
      <p>Whenever you right-click any Word document on Windows and click "NoteBeam", tapping the alert on your iPhone or tapping this shortcut will instantly create the formatted note.</p>
    </div>

    <a href="/view" class="btn">$\leftarrow$ Back to Note View</a>
  </div>
</body>
</html>`;
}
