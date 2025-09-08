// ChatPanel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ async: false });

const QUICK_PROMPTS = [
  { label: "Overview", q: "Give me a quick overview of performance, top SKUs, low-stock risks, and any recent alerts or tickets." },
  { label: "Top SKUs", q: "What are my top 10 SKUs by orders right now? List SKU and product title." },
  { label: "Low Stock", q: "Which SKUs are low on inventory? Show up to 25 with region and current inventory." },
  { label: "Out of Stock", q: "Which SKUs are out of stock across all regions?" },
  { label: "Shipping", q: "Any recent shipping issues? Summarize key problems and show the 10 most recent tickets." },
  { label: "Tickets", q: "How many open tickets do we have and which are high priority? Show the 10 most recent." },
  { label: "💵 Savings", q: "How much money could we save if we execute all recommended rebalances?" },
  { label: "Delivery KPIs", q: "What are my delivery KPIs — average transit (calendar & business days) and delivered orders in the last 30d?" },
  { label: "Trends (WoW)", q: "What is the week-over-week change in orders, local fulfillment rate, and estimated savings?" },
];

type Role = "me" | "ai";
type Msg = { who: Role; text: string };

function renderMarkdownSafe(mdText: string) {
  const raw = marked.parse(mdText || "") as unknown as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["a","p","br","strong","em","code","pre","blockquote","ul","ol","li","hr","table","thead","tbody","tfoot","tr","th","td"],
    ALLOWED_ATTR: ["href","title","target","rel","colspan","rowspan","align"]
  }) as string;
}

export default function ChatPanel({ shop, onOpenChange }: { shop: string; onOpenChange?: (open: boolean) => void; }) {
  const LS_KEY = useMemo(() => `chatHistory:${shop}`, [shop]);
  const API_URL = useMemo(() => `https://go.uppership.com/api/chat/${encodeURIComponent(shop)}`, [shop]);

  // Bubble vs panel
  const [isOpen, setIsOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatboxRef = useRef<HTMLDivElement>(null);
  const typingRef  = useRef<Node | null>(null);
  const lastAskAtRef = useRef<number>(0);
  const slowHintTimer = useRef<number | null>(null);

  //const PANEL_WIDTH_SM = 420; // px
  const PANEL_WIDTH_LG = 500; // px

  function applyChatInsets(open: boolean) {
    // Default to lg width; CSS will clamp on small screens
    const w = `${PANEL_WIDTH_LG}px`;
    document.documentElement.style.setProperty("--chat-panel-width", open ? w : "0px");
    document.documentElement.setAttribute("data-chat-open", open ? "true" : "false");
    onOpenChange?.(open);
  }

  // Init / persistence
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        setMessages(JSON.parse(raw));
        return;
      }
    } catch { /* noop */ }
    setMessages([
      {
        who: "ai",
        text: `Hi! I’m your AI Co-Pilot for **${shop.replace(/\.myshopify\.com$/i, "")}**. Try “Overview”, “Top SKUs”, “Low Stock”, or ask anything about orders, inventory, and savings.`,
      },
    ]);
  }, [LS_KEY, shop]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(messages.slice(-50))); } catch { /* noop */ }
  }, [messages, LS_KEY]);

  // Auto-scroll on updates/open
  useEffect(() => {
    const el = chatboxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, isOpen]);

  function canAsk() {
    const now = Date.now();
    if (now - lastAskAtRef.current < 1500) return false;
    lastAskAtRef.current = now;
    return true;
  }

  function showTyping() {
    const el = chatboxRef.current;
    if (!el) return;

    const row = document.createElement("div");
    row.className = "flex gap-2 my-2";

    const bubble = document.createElement("div");
    bubble.className = [
      "inline-block","max-w-[85%]","rounded-lg","border","border-[#1d2733]",
      "px-3","py-2","shadow","bg-gradient-to-b","from-[#121b26]","to-[#162233]"
    ].join(" ");

    bubble.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span style="width:6px;height:6px;border-radius:9999px;background:#7aa9e6;opacity:.7;display:inline-block;animation:bounceDots 1.2s infinite ease-in-out;"></span>
        <span style="width:6px;height:6px;border-radius:9999px;background:#7aa9e6;opacity:.7;display:inline-block;animation:bounceDots 1.2s infinite ease-in-out .15s;"></span>
        <span style="width:6px;height:6px;border-radius:9999px;background:#7aa9e6;opacity:.7;display:inline-block;animation:bounceDots 1.2s infinite ease-in-out .3s;"></span>
      </div>
    `;

    row.appendChild(bubble);
    el.appendChild(row);
    typingRef.current = row;
    el.scrollTop = el.scrollHeight;
  }
  function hideTyping() {
    const el = typingRef.current as HTMLElement | null;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    typingRef.current = null;
  }
  function startSlowHint() {
    stopSlowHint();
    slowHintTimer.current = window.setTimeout(() => {
      const row = typingRef.current as HTMLElement | null;
      if (!row) return;
      const hint = document.createElement("div");
      hint.className = "mt-1 text-[0.78rem] text-[#9aa4af]";
      hint.textContent = "Still working… complex query. Thanks for your patience.";
      const bubble = row.querySelector("div.inline-block");
      bubble?.appendChild(hint);
    }, 6000) as unknown as number;
  }
  function stopSlowHint() {
    if (slowHintTimer.current) {
      window.clearTimeout(slowHintTimer.current);
      slowHintTimer.current = null;
    }
  }

  async function ask(q: string) {
    const question = q.trim();
    if (!question || !canAsk()) return;

    setMessages((m) => [...m, { who: "me", text: question }]);
    setLoading(true);
    showTyping();
    startSlowHint();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      hideTyping();
      setMessages((m) => [...m, { who: "ai", text: data?.answer || data?.error || "No response." }]);
    } catch {
      hideTyping();
      setMessages((m) => [...m, { who: "ai", text: "❌ Network error." }]);
    } finally {
      stopSlowHint();
      setLoading(false);
      setInput("");
    }
  }

  // Keyframes
  const Keyframes = () => (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes bounceDots { 0%,80%,100% { transform: translateY(0); opacity:.6; } 40% { transform: translateY(-4px); opacity:1; } }
      @keyframes bubblePulse { 0%,100%{ transform: translateZ(0) scale(1); } 50%{ transform: translateZ(0) scale(1.03); } }
    `}</style>
  );

  // Bubble (closed)
  if (!isOpen) {
    return (
      <>
        <Keyframes />
        <button
          aria-label="Open AI Co-Pilot chat"
          onClick={() => { setIsOpen(true); applyChatInsets(true); }}
          className="fixed bottom-4 right-4 z-40 rounded-full shadow-lg border border-[#1d2733] bg-[#0d6efd] text-white px-4 py-3 flex items-center gap-2"
          style={{ animation: "bubblePulse 3s ease-in-out infinite" }}
        >
          <span>💬</span>
          <span className="hidden sm:inline font-semibold">AI Co-Pilot</span>
        </button>
      </>
    );
  }

  // Right panel (open)
  return (
    <>
      <Keyframes />
      <style>{`
        @media (max-width: 639px) { /* <sm */
          :root { --chat-panel-width: 0px; } /* don't push content on mobile */
        }
      `}</style>
      <aside
        role="complementary"
        aria-label="AI Co-Pilot chat panel"
        className="fixed inset-0 h-[100dvh] w-full z-40
           bg-[#0b1117] shadow-2xl flex flex-col min-h-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1d2733] bg-[#0e141b]">
          <h3 className="m-0 text-base font-semibold">💬 AI Co-Pilot</h3>
          <button
            className="inline-flex items-center gap-2 font-semibold rounded-md border border-[#1d2733] text-[#e7eef7] px-3 py-1.5 transition hover:-translate-y-px hover:border-[#2a3a4f]"
            onClick={() => { setIsOpen(false); applyChatInsets(false); }}
            title="Minimize"
            aria-label="Minimize chat"
          >
            ⬇ Minimize
          </button>
        </div>

        {/* Body (grid keeps non-chat rows pinned) */}
        <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto_auto_auto] gap-2 p-4 relative overflow-hidden">
          {/* Chatbox (scrolls) */}
          <div
            ref={chatboxRef}
            id="chatbox"
            className="border border-[#1d2733] bg-[#0e141b] rounded-md p-3 overflow-y-auto min-h-0"
            aria-live="polite"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 my-2 ${m.who === "me" ? "justify-end" : ""}`}>
                <div
                  className={[
                    "inline-block","max-w-[85%]","rounded-lg","border","border-[#1d2733]","px-3","py-2","shadow",
                    m.who === "me"
                      ? "bg-gradient-to-b from-[#10233b] to-[#0d1a2b]"
                      : "bg-gradient-to-b from-[#121b26] to-[#162233]"
                  ].join(" ")}
                >
                  {m.who === "ai"
                    ? <div dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(m.text) }} />
                    : <div>{m.text}</div>
                  }
                  {m.who === "ai" && (
                    <div className="mt-2">
                      <button
                        className="inline-flex items-center gap-2 font-semibold rounded-md border border-[#1d2733] text-[#9aa4af] px-3 py-2 transition hover:-translate-y-px hover:border-[#2a3a4f]"
                        title="Copy response"
                        onClick={() => navigator.clipboard.writeText(m.text)}
                      >
                        📋 Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick prompts (pinned) */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                className="shrink-0 border border-[#233041] text-[#d5e3f7] font-semibold rounded-full transition whitespace-nowrap px-3 py-1 hover:-translate-y-px"
                style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent), #0f1722" }}
                onClick={() => ask(p.q)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Toolbar (pinned) */}
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 font-semibold rounded-md border border-[#1d2733] text-[#e7eef7] px-3 py-2 transition hover:-translate-y-px hover:border-[#2a3a4f]"
              onClick={() => {
                setMessages([]);
                try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
              }}
            >
              🧹 Clear
            </button>
            <button
              className="inline-flex items-center gap-2 font-semibold rounded-md border border-[#1d2733] text-[#e7eef7] px-3 py-2 transition hover:-translate-y-px hover:border-[#2a3a4f]"
              onClick={() => {
                const text = messages.map((r) => `${r.who === "me" ? "You" : "Assistant"}: ${r.text}`).join("\n\n");
                navigator.clipboard.writeText(text);
              }}
            >
              📄 Export
            </button>
          </div>

          {/* Input row (pinned) */}
          <div className="flex gap-2">
            <textarea
              rows={2}
              className="flex-1 px-3 py-2 rounded-md border border-[#1d2733] bg-[#0e141b] outline-none focus:ring-0 focus:border-[#2a3a4f]"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); }
                if ((e.key === "Enter") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ask(input); }
              }}
              disabled={loading}
            />
            <button
              className="inline-flex items-center gap-2 font-semibold rounded-md border border-[#0d6efd] bg-[#0d6efd] text-white px-4 py-2 transition hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => ask(input)}
              disabled={loading}
            >
              Send
            </button>
          </div>

          {/* Loader overlay (scoped to body) */}
          {loading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(8,12,18,0.62)", backdropFilter: "saturate(120%) blur(4px)", zIndex: 10 }}
              role="status"
              aria-live="assertive"
            >
              <div className="bg-[#11161c] border border-[#1d2733] rounded-xl p-4 min-w-[260px] text-center shadow">
                <div
                  className="mx-auto mb-2"
                  style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #2a3a4f", borderTopColor: "#7ab7ff", animation: "spin 1s linear infinite" }}
                />
                <div className="font-semibold">Thinking…</div>
                <div className="text-sm text-[#9aa4af]">Analyzing data and preparing an answer</div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}