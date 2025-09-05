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
type Msg = { who: Role; text: string }; // raw markdown for ai, plain for me

function renderMarkdownSafe(mdText: string) {
  // TS still types as string | Promise<string> — cast to string since async=false
  const raw = marked.parse(mdText || "") as unknown as string;

  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "a","p","br","strong","em","code","pre","blockquote","ul","ol","li","hr",
      "table","thead","tbody","tfoot","tr","th","td"
    ],
    ALLOWED_ATTR: ["href","title","target","rel","colspan","rowspan","align"]
  }) as string;
}


export default function ChatPanel({ shop }: { shop: string }) {
  const LS_KEY = useMemo(() => `chatHistory:${shop}`, [shop]);
  const API_URL = useMemo(() => `https://go.uppership.com/api/chat/${encodeURIComponent(shop)}`, [shop]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const chatboxRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<Node | null>(null);
  const lastAskAtRef = useRef<number>(0);
  const slowHintTimer = useRef<number | null>(null);

  // restore history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        setMessages(JSON.parse(raw));
        return;
      }
    } catch {/*hello*/}
    // first-run greeting
    setMessages([
      {
        who: "ai",
        text: `Hi! I’m your AI Co-Pilot for **${shop.replace(/\.myshopify\.com$/i, "")}**. Try “Overview”, “Top SKUs”, “Low Stock”, or ask anything about orders, inventory, and savings.`,
      },
    ]);
  }, [LS_KEY, shop]);

  // persist history
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(messages.slice(-50)));
    } catch {/*hello*/}
  }, [messages, LS_KEY]);

  // auto scroll
  useEffect(() => {
    const el = chatboxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

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
    row.className = "chat-msg ai";
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = `<div class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
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
      const el = typingRef.current as HTMLElement | null;
      if (el) {
        const hint = document.createElement("div");
        hint.className = "fine";
        hint.style.marginTop = "6px";
        hint.textContent = "Still working… complex query. Thanks for your patience.";
        const bubble = el.querySelector(".chat-bubble");
        bubble?.appendChild(hint);
      }
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

  return (
    <div className="card bg-[#11161c] border border-[#1d2733] rounded-xl shadow p-4 h-[80vh] flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-base font-semibold" id="panelTitle">💬 AI Co-Pilot</h3>
        <button className="btn" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? "➕ Show" : "➖ Hide"}
        </button>
      </div>

      {!collapsed && (
        <>
          <div
            ref={chatboxRef}
            id="chatbox"
            className="mt-3 border border-[#1d2733] bg-[#0e141b] rounded-md p-3 overflow-y-auto"
            style={{ height: 360 }}
          >
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.who === "me" ? "text-right" : ""}`}>
                <div
                  className={`chat-bubble inline-block max-w-[85%] rounded-md border border-[#1d2733] p-2 ${
                    m.who === "me" ? "bg-[#162233]" : "bg-[#121b26]"
                  }`}
                >
                  {m.who === "ai" ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(m.text) }}
                    />
                  ) : (
                    m.text
                  )}
                  {m.who === "ai" && (
                    <button
                      className="btn ml-2"
                      onClick={() => {
                        navigator.clipboard.writeText(m.text).then(() => {
                          // quick UX nudge via alert-less feedback
                        });
                      }}
                    >
                      📋 Copy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                className="chip px-3 py-1 rounded-2xl bg-[#0f1722] border border-[#233041] text-sm"
                onClick={() => ask(p.q)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex gap-2 mt-2">
            <button
              className="btn"
              onClick={() => {
                setMessages([]);
                try { localStorage.removeItem(LS_KEY); } catch {/*hello*/}
              }}
            >
              🧹 Clear
            </button>
            <button
              className="btn"
              onClick={() => {
                const text = messages
                  .map((r) => `${r.who === "me" ? "You" : "Assistant"}: ${r.text}`)
                  .join("\n\n");
                navigator.clipboard.writeText(text);
              }}
            >
              📄 Export
            </button>
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-2">
            <textarea
              rows={2}
              className="flex-1 px-3 py-2 rounded-md border border-[#1d2733] bg-[#0e141b]"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              disabled={loading}
            />
            <button
              className="btn bg-[#0d6efd] border-[#0d6efd] text-white px-4"
              onClick={() => ask(input)}
              disabled={loading}
            >
              Send
            </button>
          </div>

          {/* Subtle loader overlay */}
          {loading && (
            <div
              className="fixed inset-0 flex items-center justify-center"
              style={{
                background: "rgba(8,12,18,0.62)",
                backdropFilter: "saturate(120%) blur(4px)",
                zIndex: 50,
              }}
              aria-hidden="false"
              role="status"
            >
              <div className="bg-[#11161c] border border-[#1d2733] rounded-xl p-4 min-w-[260px] text-center shadow">
                <div
                  className="mx-auto mb-2"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "3px solid #2a3a4f",
                    borderTopColor: "#7ab7ff",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <div className="font-semibold">Thinking…</div>
                <div className="text-sm text-[#9aa4af]">Analyzing demo data and preparing an answer</div>
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </>
      )}
    </div>
  );
}
