import { useState, useCallback, useRef } from "react";

// ─────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────
const LANGUAGES = [
  { code: "en",    label: "English",             flag: "🇺🇸" },
  { code: "zh-TW", label: "繁體中文",             flag: "🇹🇼" },
  { code: "ja",    label: "日本語",               flag: "🇯🇵" },
];

// ─────────────────────────────────────────────
// SIMULATED TRANSCRIPT (client-side, no backend)
// Replace this section with real API calls (e.g., YouTube Data API v3
// via a proxy, or a transcript service) when a backend is available.
// ─────────────────────────────────────────────
function simulateTranscript(videoId) {
  // SIMULATED: Generates realistic transcript segments for demo purposes.
  // In production, replace with actual YouTube transcript fetching.
  const segments = [
    { start: 0,   duration: 3,   text: "Welcome to this video." },
    { start: 3,   duration: 4,   text: "Today we're going to explore something fascinating." },
    { start: 7,   duration: 3.5, text: "Let's start with the basics." },
    { start: 10.5,duration: 4,   text: "There are many ways to approach this topic." },
    { start: 14.5,duration: 3,   text: "First, let's understand the fundamentals." },
    { start: 17.5,duration: 4.5, text: "This concept has been around for decades." },
    { start: 22,  duration: 3,   text: "Many experts have studied this extensively." },
    { start: 25,  duration: 4,   text: "The results have been quite surprising." },
    { start: 29,  duration: 3.5, text: "Let me show you some examples." },
    { start: 32.5,duration: 4,   text: "As you can see, this is quite remarkable." },
    { start: 36.5,duration: 3,   text: "Now let's move on to the next part." },
    { start: 39.5,duration: 4.5, text: "This section covers the more advanced aspects." },
    { start: 44,  duration: 3,   text: "Don't worry if this seems complex at first." },
    { start: 47,  duration: 4,   text: "With practice, it becomes much easier to understand." },
    { start: 51,  duration: 3.5, text: "Let's summarize what we've learned so far." },
    { start: 54.5,duration: 4,   text: "Thank you so much for watching this video." },
    { start: 58.5,duration: 3,   text: "Please like and subscribe for more content." },
    { start: 61.5,duration: 3.5, text: "See you in the next one!" },
  ];
  return segments;
}

// ─────────────────────────────────────────────
// MOCK TRANSLATION LAYER
// Structure: translate(text, targetLang) → string
// Replace the body of this function with a real API call:
//   - OpenAI: fetch("https://api.openai.com/v1/chat/completions", ...)
//   - DeepL:  fetch("https://api-free.deepl.com/v2/translate", ...)
// ─────────────────────────────────────────────
const ZH_TW_MAP = {
  "Welcome to this video.": "歡迎收看本影片。",
  "Today we're going to explore something fascinating.": "今天我們將探索一些令人著迷的事物。",
  "Let's start with the basics.": "讓我們從基礎開始。",
  "There are many ways to approach this topic.": "有許多方式可以探討這個主題。",
  "First, let's understand the fundamentals.": "首先，讓我們了解基本概念。",
  "This concept has been around for decades.": "這個概念已存在數十年之久。",
  "Many experts have studied this extensively.": "許多專家已對此進行深入研究。",
  "The results have been quite surprising.": "研究結果相當令人驚訝。",
  "Let me show you some examples.": "讓我為您展示一些例子。",
  "As you can see, this is quite remarkable.": "如您所見，這相當值得注目。",
  "Now let's move on to the next part.": "現在讓我們進入下一個部分。",
  "This section covers the more advanced aspects.": "本節涵蓋更進階的層面。",
  "Don't worry if this seems complex at first.": "如果一開始覺得複雜，請不要擔心。",
  "With practice, it becomes much easier to understand.": "經過練習，理解起來會容易得多。",
  "Let's summarize what we've learned so far.": "讓我們總結一下目前所學的內容。",
  "Thank you so much for watching this video.": "非常感謝您收看本影片。",
  "Please like and subscribe for more content.": "請按讚並訂閱以獲取更多內容。",
  "See you in the next one!": "下次見！",
};

const JA_MAP = {
  "Welcome to this video.": "この動画へようこそ。",
  "Today we're going to explore something fascinating.": "今日は魅力的なことを探っていきましょう。",
  "Let's start with the basics.": "基本から始めましょう。",
  "There are many ways to approach this topic.": "このトピックへのアプローチ方法はたくさんあります。",
  "First, let's understand the fundamentals.": "まず、基本的な概念を理解しましょう。",
  "This concept has been around for decades.": "この概念は数十年前から存在しています。",
  "Many experts have studied this extensively.": "多くの専門家がこれを徹底的に研究してきました。",
  "The results have been quite surprising.": "結果はかなり驚くべきものでした。",
  "Let me show you some examples.": "いくつかの例をご紹介します。",
  "As you can see, this is quite remarkable.": "ご覧の通り、これは非常に注目すべきことです。",
  "Now let's move on to the next part.": "では、次のパートに進みましょう。",
  "This section covers the more advanced aspects.": "このセクションでは、より高度な側面をカバーします。",
  "Don't worry if this seems complex at first.": "最初は複雑に見えても心配しないでください。",
  "With practice, it becomes much easier to understand.": "練習すれば、理解するのがずっと簡単になります。",
  "Let's summarize what we've learned so far.": "これまでに学んだことをまとめましょう。",
  "Thank you so much for watching this video.": "この動画をご視聴いただきありがとうございます。",
  "Please like and subscribe for more content.": "さらなるコンテンツのために、いいねと登録をお願いします。",
  "See you in the next one!": "次の動画でお会いしましょう！",
};

async function translate(text, targetLang) {
  // MOCK: Replace with real translation API call.
  await new Promise((r) => setTimeout(r, 10)); // simulate async
  if (targetLang === "zh-TW") return ZH_TW_MAP[text] || `[ZH] ${text}`;
  if (targetLang === "ja")    return JA_MAP[text]    || `[JA] ${text}`;
  return text; // English: no translation needed
}

// ─────────────────────────────────────────────
// SRT FORMATTING UTILS
// ─────────────────────────────────────────────
function toSrtTimestamp(seconds) {
  const h  = Math.floor(seconds / 3600);
  const m  = Math.floor((seconds % 3600) / 60);
  const s  = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
}

function buildSrt(segments) {
  return segments
    .map((seg, i) => {
      const start = toSrtTimestamp(seg.start);
      const end   = toSrtTimestamp(seg.start + seg.duration);
      return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join("\n");
}

// ─────────────────────────────────────────────
// YOUTUBE URL UTILS
// ─────────────────────────────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v") || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// ICONS (inline SVG to avoid dependencies)
// ─────────────────────────────────────────────
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconCopy = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconYoutube = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);

// ─────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-16">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
      </div>
      <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono tracking-wide">Processing transcript…</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// COPY BUTTON
// ─────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
        ${copied
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300"
        }`}
    >
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [dark, setDark]         = useState(true);
  const [url, setUrl]           = useState("");
  const [title, setTitle]       = useState("subtitles");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [results, setResults]   = useState(null); // { en, "zh-TW", ja } → array of {start,duration,text}
  const [activeTab, setActiveTab] = useState("en");
  const [editedSrt, setEditedSrt] = useState({}); // { langCode: srtString }
  const urlRef = useRef(null);

  // ── Generate subtitles ──
  const generate = useCallback(async () => {
    setError("");
    setResults(null);
    setEditedSrt({});

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("Invalid YouTube URL. Please paste a valid link (e.g. https://youtu.be/xxxx or https://www.youtube.com/watch?v=xxxx).");
      return;
    }

    setLoading(true);
    try {
      // SIMULATED: fetch transcript. Replace with real API in production.
      await new Promise((r) => setTimeout(r, 900));
      const rawSegments = simulateTranscript(videoId);

      // Translate all languages in parallel
      const langs = LANGUAGES.map((l) => l.code);
      const translated = await Promise.all(
        langs.map(async (lang) => {
          const segs = await Promise.all(
            rawSegments.map(async (seg) => ({
              ...seg,
              text: await translate(seg.text, lang),
            }))
          );
          return { lang, segs };
        })
      );

      const res = {};
      const srtMap = {};
      translated.forEach(({ lang, segs }) => {
        res[lang] = segs;
        srtMap[lang] = buildSrt(segs);
      });

      setResults(res);
      setEditedSrt(srtMap);
      setActiveTab("en");
    } catch (e) {
      setError("Something went wrong while generating subtitles. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  // ── Download SRT ──
  const downloadSrt = (langCode) => {
    const content = editedSrt[langCode] || "";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.trim() || "subtitles"}_${langCode}.srt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Dark mode class on root ──
  const rootClass = dark ? "dark" : "";

  return (
    <div className={rootClass}>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">

        {/* ── HEADER ── */}
        <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-red-500"><IconYoutube /></span>
              <span className="font-semibold text-sm tracking-tight">SRT Generator</span>
              <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded-full">BETA</span>
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

          {/* ── INTRO ── */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">YouTube Subtitle Generator</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Paste a YouTube URL to generate, translate, and export SRT subtitle files.
            </p>
          </div>

          {/* ── INPUT CARD ── */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4 shadow-sm">
            {/* URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">YouTube URL</label>
              <div className="flex gap-2">
                <input
                  ref={urlRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Filename Prefix</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="subtitles"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
              />
              <p className="text-[11px] text-neutral-400 dark:text-neutral-600">Output: <span className="font-mono">{title || "subtitles"}_en.srt</span>, <span className="font-mono">{title || "subtitles"}_zh-TW.srt</span>, …</p>
            </div>

            {/* Button */}
            <button
              onClick={generate}
              disabled={loading || !url.trim()}
              className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Generating…
                </>
              ) : "Generate Subtitles"}
            </button>

            {/* Notice */}
            <p className="text-[11px] text-neutral-400 dark:text-neutral-600 text-center leading-relaxed">
              ⚠️ Transcript data is <strong>simulated</strong> in this demo. A real transcript API requires a backend proxy.
            </p>
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── LOADING ── */}
          {loading && <Spinner />}

          {/* ── RESULTS ── */}
          {results && !loading && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">

              {/* Tabs */}
              <div className="flex border-b border-neutral-200 dark:border-neutral-800">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveTab(lang.code)}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                      ${activeTab === lang.code
                        ? "border-b-2 border-red-500 text-red-500 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="hidden sm:inline">{lang.label}</span>
                    <span className="sm:hidden font-mono text-xs">{lang.code}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {LANGUAGES.map((lang) =>
                activeTab === lang.code ? (
                  <div key={lang.code} className="p-5 space-y-3">
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                        {results[lang.code]?.length} segments
                      </span>
                      <div className="flex gap-2">
                        <CopyButton text={editedSrt[lang.code] || ""} />
                        <button
                          onClick={() => downloadSrt(lang.code)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-100 dark:hover:bg-neutral-300 text-white dark:text-neutral-900 transition-colors"
                        >
                          <IconDownload />
                          Download .srt
                        </button>
                      </div>
                    </div>

                    {/* Editable textarea */}
                    <textarea
                      value={editedSrt[lang.code] || ""}
                      onChange={(e) =>
                        setEditedSrt((prev) => ({ ...prev, [lang.code]: e.target.value }))
                      }
                      className="w-full h-80 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all text-neutral-700 dark:text-neutral-300"
                      spellCheck={false}
                    />
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
                      Editable above — changes are reflected in copy &amp; download.
                    </p>
                  </div>
                ) : null
              )}

              {/* Download all */}
              <div className="px-5 pb-5">
                <button
                  onClick={() => LANGUAGES.forEach((l) => downloadSrt(l.code))}
                  className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                >
                  <IconDownload />
                  Download All Languages
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ── FOOTER ── */}
        <footer className="max-w-3xl mx-auto px-4 py-8 border-t border-neutral-200 dark:border-neutral-800 mt-10">
          <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-600">
            SRT Generator · Client-side only · No data is sent to any server
          </p>
        </footer>
      </div>
    </div>
  );
}
