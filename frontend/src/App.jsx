// frontend/src/App.jsx
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import "./App.css";
import { API_URL } from "./config/api";


const tabs = [
  { id: "unified", label: "Chat with me" },
  { id: "chatbot", label: "Chatbot" },
  { id: "news", label: "Web News" },
  { id: "sql", label: "SQL" },
  { id: "analyst", label: "Analyst" },
  { id: "review", label: "Code Review" },
  { id: "notes", label: "Notes" },
   // ✅ new tab
];

// helper: split instruction + code into { code, context }
function parseReviewInput(text) {
  const codeBlockMatch = text.match(/```[\s\S]*?```/);
  if (codeBlockMatch) {
    const codeBlock = codeBlockMatch[0];
    const code = codeBlock
      .replace(/```[a-zA-Z]*\n?/, "")
      .replace(/```$/, "")
      .trim();
    const context = text.replace(codeBlockMatch[0], "").trim();
    return { code, context };
  }
  return { code: text.trim(), context: "" };
}

export default function App() {
  const [active, setActive] = useState("chatbot");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [imagePath, setImagePath] = useState("");

  // ---------- Chatbot ----------
  const [chatLog, setChatLog] = useState([
    { role: "assistant", content: "Hi! I’m ready — ask me anything." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef(null);
  const isComposingChatRef = useRef(false);

  useEffect(() => {
    if (active === "chatbot") chatInputRef.current?.focus();
  }, [active]);

  useLayoutEffect(() => {
    if (active !== "chatbot" || isComposingChatRef.current) return;
    const el = chatInputRef.current;
    if (!el) return;
    try {
      el.setSelectionRange(el.value.length, el.value.length);
    } catch {}
  }, [active]);

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatLog((prev) => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", content: data.output || "(no reply)" },
      ]);
    } catch (e) {
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ---------- News ----------
  const [newsLog, setNewsLog] = useState([
    { role: "assistant", content: "Ask me about current events." },
  ]);
  const [newsInput, setNewsInput] = useState("");
  const newsInputRef = useRef(null);
  const newsBottomRef = useRef(null);
  const isComposingNewsRef = useRef(false);

  function linkify(text) {
    const urlRe = /(https?:\/\/[^\s)]+)|(www\.[^\s)]+)/gi;
    return text.split(urlRe).map((part, i) => {
      if (!part) return null;
      if (part.match(urlRe)) {
        const url = part.startsWith("http") ? part : `https://${part}`;
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer">
            {part}
          </a>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  }

  async function sendNews() {
    const q = newsInput.trim();
    if (!q) return;
    setNewsLog((prev) => [...prev, { role: "user", content: q }]);
    setNewsInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/webnews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setNewsLog((prev) => [
        ...prev,
        { role: "assistant", content: data.output || "(no reply)" },
      ]);
    } catch (e) {
      setNewsLog((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
      newsBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  // ---------- SQL / Analyst / Review / Notes ----------
  const [sqlPrompt, setSqlPrompt] = useState(
    "Create table sales(region TEXT, amount INT); insert rows; show sum(amount) by region."
  );
  const [analystAsk, setAnalystAsk] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [reviewText, setReviewText] = useState(
    "Review briefly, then apply your tiny refactor.\n```python\ndef greet(n):\n    for i in range(n):\n        print(i)\n```"
  );
  const [notesText, setNotesText] = useState(
    "- kickoff\n- TODO: Alice send timeline by Tue\n- Decision: use Postgres\n"
  );

  async function call(endpoint, payload) {
    setLoading(true);
    setResult("");
    setImagePath("");
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data.output || JSON.stringify(data, null, 2));
      if (data.image_path) setImagePath(data.image_path);
    } catch (e) {
      setResult("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAndAnalyze() {
    if (!csvFile) return;
    setLoading(true);
    setResult("");
    setImagePath("");
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      if (analystAsk.trim()) fd.append("ask", analystAsk.trim());
      const res = await fetch(`${API_URL}/api/analyst_file`, { method: "POST", body: fd });
      const data = await res.json();
      setResult(data.output || "(no reply)");
      if (data.image_path) setImagePath(data.image_path);
    } catch (e) {
      setResult("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Unified Chat ----------
  const [unifiedLog, setUnifiedLog] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi! I’m your multi-agent assistant. Ask me SQL, code review, notes, analyst, or news here.",
    },
  ]);
  const [unifiedInput, setUnifiedInput] = useState("");
  const unifiedInputRef = useRef(null);
  const isComposingUnifiedRef = useRef(false);

  async function sendUnified() {
    const msg = unifiedInput.trim();
    if (!msg) return;
    setUnifiedLog((prev) => [...prev, { role: "user", content: msg }]);
    setUnifiedInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/router`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setUnifiedLog((prev) => [
        ...prev,
        { role: "assistant", content: data.output || "(no reply)" },
      ]);
    } catch (e) {
      setUnifiedLog((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Render ----------
  const renderControls = () => {
    switch (active) {
      case "chatbot":
        return (
          <section className="space-y">
            <div className="chat">
              {chatLog.map((m, i) => (
                <div key={i} className={`bubble ${m.role === "user" ? "me" : "bot"}`}>
                  <div className="bubble-role">{m.role === "user" ? "you" : "bot"}</div>
                  <div className="bubble-text">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <textarea
                ref={chatInputRef}
                className="input"
                placeholder="Type a message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
              />
              <button className="btn" onClick={sendChat} disabled={loading}>
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </section>
        );
      case "news":
        return (
          <section className="space-y">
            <div className="chat">
              {newsLog.map((m, i) => (
                <div key={i} className={`bubble ${m.role === "user" ? "me" : "bot"}`}>
                  <div className="bubble-role">{m.role === "user" ? "you" : "bot"}</div>
                  <div className="bubble-text">
                    {m.role === "assistant" ? linkify(m.content) : m.content}
                  </div>
                </div>
              ))}
              <div ref={newsBottomRef} />
            </div>
            <div className="chat-input">
              <textarea
                ref={newsInputRef}
                className="input"
                placeholder="Ask about news…"
                value={newsInput}
                onChange={(e) => setNewsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendNews();
                  }
                }}
              />
              <button className="btn" onClick={sendNews} disabled={loading}>
                {loading ? "Searching…" : "Send"}
              </button>
            </div>
          </section>
        );
      case "sql":
        return (
          <section className="space-y">
            <label className="label">SQL Prompt</label>
            <textarea
              className="input tall"
              value={sqlPrompt}
              onChange={(e) => setSqlPrompt(e.target.value)}
            />
            <button className="btn" onClick={() => call("/api/sql", { prompt: sqlPrompt })}>
              {loading ? "Executing…" : "Run SQL"}
            </button>
          </section>
        );
      case "analyst":
        return (
          <section className="space-y">
            <label className="label">Upload CSV & Ask</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
            <textarea
              className="input"
              placeholder="Describe what to analyze"
              value={analystAsk}
              onChange={(e) => setAnalystAsk(e.target.value)}
            />
            <button className="btn" onClick={uploadAndAnalyze} disabled={loading || !csvFile}>
              {loading ? "Analyzing…" : "Upload & Analyze"}
            </button>
          </section>
        );
      case "review":
        return (
          <section className="space-y">
            <label className="label">Instruction + Code</label>
            <textarea
              className="input tall"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
            <button
              className="btn"
              onClick={() => {
                const payload = parseReviewInput(reviewText);
                call("/api/code_review", payload);
              }}
            >
              {loading ? "Reviewing…" : "Run Code Reviewer"}
            </button>
          </section>
        );
      case "notes":
        return (
          <section className="space-y">
            <label className="label">Meeting Notes</label>
            <textarea
              className="input tall"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
            />
            <button className="btn" onClick={() => call("/api/notes", { raw_notes: notesText })}>
              {loading ? "Summarizing…" : "Run Notes Agent"}
            </button>
          </section>
        );
      case "unified":
        return (
          <section className="space-y">
            <div className="chat">
              {unifiedLog.map((m, i) => (
                <div key={i} className={`bubble ${m.role === "user" ? "me" : "bot"}`}>
                  <div className="bubble-role">{m.role === "user" ? "you" : "bot"}</div>
                  <div className="bubble-text">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <textarea
                ref={unifiedInputRef}
                className="input"
                placeholder="Ask me SQL, notes, code review, analyst, or news…"
                value={unifiedInput}
                onChange={(e) => setUnifiedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendUnified();
                  }
                }}
              />
              <button className="btn" onClick={sendUnified} disabled={loading}>
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page">
      <header className="card header">
        <h1 className="title">Multi-Agent Demo</h1>
        <nav className="tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setResult("");
                setImagePath("");
                setActive(t.id);
              }}
              className={`tab ${active === t.id ? "tab--active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        <section className="card">{renderControls()}</section>

        {["sql", "analyst", "review", "notes"].includes(active) && (
          <section className="card">
            <h2 className="subtitle">Result</h2>
            <pre className="result">
              {result || (loading ? "Working…" : "(no output yet)")}
            </pre>
            {imagePath && (
              <div className="imgWrap">
                <div className="imgCap">Image:</div>
                <img src={imagePath} alt="plot" className="img" />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
