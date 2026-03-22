import { useState, useRef } from "react";

// ─── Storage helpers ───────────────────────────────────────────────────────
const STORAGE_KEY = "faithful_five_ps_entries";
const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } };
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

// ─── Claude API (via Netlify Function — API key stays server-side) ─────────
async function askCompanion(systemPrompt, userPrompt) {
  const res = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ─── Five P's config ───────────────────────────────────────────────────────
const FIVE_PS = [
  {
    key: "position",
    num: 1,
    emoji: "🙏",
    label: "Position",
    subtitle: "Pull away. Be still. Invite God to speak.",
    verse: { ref: "Habakkuk 2:1", text: "I will stand at my watch and station myself on the ramparts; I will look to see what He will say to me." },
    fields: [
      { key: "where", label: "Where are you studying today?", placeholder: "Your quiet place…", rows: 1 },
      { key: "heart", label: "What are you bringing to God right now?", placeholder: "A burden, a question, a praise…", rows: 3 },
    ],
    aiPrompt: null,
    color: "#7C6F5B",
    bg: "#F9F4EC",
  },
  {
    key: "pore",
    num: 2,
    emoji: "📖",
    label: "Pore & Paraphrase",
    subtitle: "Read slowly. Write what each verse says in your own words.",
    verse: { ref: "Psalm 1:2", text: "But his delight is in the law of the Lord, and in His law he meditates day and night." },
    fields: [
      { key: "para1", label: "Verse 1 — Paraphrase", placeholder: "In my own words…", rows: 2 },
      { key: "para2", label: "Verse 2 — Paraphrase", placeholder: "In my own words…", rows: 2 },
      { key: "para3", label: "Verse 3 — Paraphrase (if applicable)", placeholder: "In my own words…", rows: 2 },
    ],
    aiPrompt: (f, prev) => ({
      system: `You are the Faithful Study Companion — a warm, Scripture-grounded Bible study partner. Be encouraging and concise (under 180 words). Use plain text only, no markdown. Quote Scripture from NKJV or AMP.`,
      user: `A believer is studying: "${prev?.passage || "Scripture"}". Their paraphrases: "${f.para1 || ""} | ${f.para2 || ""} | ${f.para3 || ""}". Give a brief, warm note affirming what they noticed and adding one piece of historical or cultural context that deepens understanding. End with a one-line prayer.`
    }),
    color: "#C4973A",
    bg: "#FFFBF2",
  },
  {
    key: "pull",
    num: 3,
    emoji: "💡",
    label: "Pull Out Principles",
    subtitle: "What is God teaching? Commands, promises, His character.",
    verse: { ref: "2 Timothy 3:16", text: "All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness." },
    fields: [
      { key: "principle1", label: "Spiritual Principle 1", placeholder: "What is God teaching here?", rows: 2 },
      { key: "principle2", label: "Spiritual Principle 2", placeholder: "A command, promise, or attribute of God…", rows: 2 },
      { key: "principle3", label: "Spiritual Principle 3 (optional)", placeholder: "Any further truth…", rows: 2 },
    ],
    aiPrompt: (f, prev) => ({
      system: `You are the Faithful Study Companion — a warm, Scripture-grounded Bible study partner. Be encouraging and concise (under 180 words). Use plain text only, no markdown. Quote Scripture from NKJV or AMP.`,
      user: `A believer studying "${prev?.passage || "Scripture"}" pulled out these principles: "${f.principle1 || ""} | ${f.principle2 || ""} | ${f.principle3 || ""}". Affirm what they found, add one principle they may have missed, and include a related Scripture. End with a short encouragement.`
    }),
    color: "#4A7C59",
    bg: "#F4FAF6",
  },
  {
    key: "pose",
    num: 4,
    emoji: "🔍",
    label: "Pose the Question",
    subtitle: "Turn principles into personal questions. Let the Spirit speak.",
    verse: { ref: "Hebrews 4:12", text: "For the word of God is living and powerful… and is a discerner of the thoughts and intents of the heart." },
    fields: [
      { key: "q1", label: "Question 1 — Am I obeying this?", placeholder: "Ask yourself honestly…", rows: 2 },
      { key: "q1answer", label: "What is the Holy Spirit saying to me?", placeholder: "Write what you sense God saying…", rows: 3 },
      { key: "q2", label: "Question 2 — Do I believe this promise?", placeholder: "Another personal question…", rows: 2 },
      { key: "q2answer", label: "What is the Holy Spirit saying to me?", placeholder: "Write what you sense God saying…", rows: 3 },
    ],
    aiPrompt: (f, prev) => ({
      system: `You are the Faithful Study Companion — a warm, Scripture-grounded Bible study partner. Be encouraging and concise (under 200 words). Use plain text only, no markdown. Quote Scripture from NKJV or AMP.`,
      user: `A believer is having a dialogue with God over "${prev?.passage || "Scripture"}". Their questions: "${f.q1 || ""}" and "${f.q2 || ""}". What they feel God saying: "${f.q1answer || ""}" and "${f.q2answer || ""}". Speak as a gentle companion affirming the Holy Spirit's voice, deepening the dialogue with one probing question or Scripture, and giving encouragement to keep listening.`
    }),
    color: "#6B5A9E",
    bg: "#F7F4FD",
  },
  {
    key: "plan",
    num: 5,
    emoji: "✅",
    label: "Plan Obedience",
    subtitle: "God speaks to be obeyed. Plan it. Pin down a date.",
    verse: { ref: "James 1:22", text: "But be doers of the word, and not hearers only, deceiving yourselves." },
    fields: [
      { key: "obey", label: "What is God asking me to do?", placeholder: "Be specific — start, stop, or begin something…", rows: 3 },
      { key: "when", label: "When and how will I obey?", placeholder: "Pin down a date and a plan…", rows: 2 },
      { key: "accountable", label: "Who will I be accountable to?", placeholder: "Name a person…", rows: 1 },
      { key: "prayer", label: "My closing prayer", placeholder: "Write out your prayer response to what God said…", rows: 4 },
      { key: "victory", label: "Victory / Testimony (optional)", placeholder: "An answered prayer or breakthrough to record…", rows: 2 },
    ],
    aiPrompt: (f, prev) => ({
      system: `You are the Faithful Study Companion — a warm, Scripture-grounded Bible study partner. Be encouraging and concise (under 200 words). Use plain text only, no markdown. Quote Scripture from NKJV or AMP.`,
      user: `A believer has completed their Five P's Bible study on "${prev?.passage || "Scripture"}". Their obedience plan: "${f.obey || ""}". Their prayer: "${f.prayer || ""}". Their victory: "${f.victory || ""}". Give a warm closing encouragement that seals their commitment, includes one Scripture of strength, and ends with a declaration they can speak aloud over themselves.`
    }),
    color: "#C4973A",
    bg: "#FFFBF2",
  },
];

// ─── Styles ────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Cinzel:wght@400;600&display=swap');

  :root {
    --cream: #FAF6EE;
    --parchment: #F2EAD8;
    --border: #E0D0B4;
    --gold: #C4973A;
    --gold-light: #F0E0B0;
    --dark: #1C140A;
    --muted: #8A7558;
    --white: #FFFFFF;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: var(--cream); min-height: 100vh; }

  .fsc-root {
    font-family: 'EB Garamond', serif;
    color: var(--dark);
    max-width: 780px;
    margin: 0 auto;
    padding: 0 16px 80px;
    min-height: 100vh;
  }

  .fsc-header {
    text-align: center;
    padding: 52px 0 36px;
  }
  .fsc-header::after {
    content: '';
    display: block;
    width: 80px;
    height: 1px;
    background: var(--border);
    margin: 28px auto 0;
  }
  .fsc-cross { font-size: 30px; display: block; margin-bottom: 14px; color: var(--gold); }
  .fsc-title { font-family: 'Cinzel', serif; font-size: clamp(22px,4vw,32px); font-weight: 600; color: var(--dark); letter-spacing: 0.06em; }
  .fsc-title span { color: var(--gold); }
  .fsc-tagline { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 16px; color: var(--muted); margin-top: 10px; }

  .fsc-tabs { display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin: 32px 0 36px; background: var(--parchment); }
  .fsc-tab { flex: 1; padding: 11px 8px; border: none; background: transparent; font-family: 'Cormorant Garamond', serif; font-size: 15px; font-weight: 600; color: var(--muted); cursor: pointer; transition: all 0.2s; border-right: 1px solid var(--border); }
  .fsc-tab:last-child { border-right: none; }
  .fsc-tab.active { background: var(--white); color: var(--dark); box-shadow: inset 0 -2px 0 var(--gold); }
  .fsc-tab:hover:not(.active) { background: rgba(255,255,255,0.5); color: var(--dark); }

  .session-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; }
  @media(max-width:500px) { .session-bar { grid-template-columns: 1fr; } }
  .session-field label { display: block; font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; }
  .session-field input { width: 100%; font-family: 'EB Garamond', serif; font-size: 15px; color: var(--dark); background: transparent; border: none; border-bottom: 1px solid var(--border); padding: 6px 0; outline: none; transition: border-color 0.2s; }
  .session-field input:focus { border-color: var(--gold); }

  .stepper { display: flex; align-items: center; justify-content: center; margin-bottom: 36px; overflow-x: auto; padding: 4px 0; }
  .step-item { display: flex; align-items: center; }
  .step-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px 10px; border-radius: 8px; transition: background 0.15s; }
  .step-btn:hover { background: rgba(196,151,58,0.08); }
  .step-circle { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600; color: var(--muted); background: var(--white); transition: all 0.2s; }
  .step-circle.active { border-color: var(--gold); background: var(--gold); color: white; box-shadow: 0 0 0 4px rgba(196,151,58,0.15); }
  .step-circle.done { border-color: #4A7C59; background: #4A7C59; color: white; }
  .step-label { font-family: 'Cormorant Garamond', serif; font-size: 11px; color: var(--muted); white-space: nowrap; font-weight: 600; }
  .step-label.active { color: var(--gold); }
  .step-label.done { color: #4A7C59; }
  .step-line { width: 24px; height: 2px; background: var(--border); flex-shrink: 0; margin-bottom: 22px; }
  .step-line.done { background: #4A7C59; }
  @media(max-width:500px) { .step-btn { padding: 4px 5px; } .step-circle { width: 28px; height: 28px; font-size: 10px; } .step-line { width: 10px; } .step-label { font-size: 9px; } }

  .p-card { border-radius: 16px; border: 1px solid var(--border); overflow: hidden; margin-bottom: 8px; animation: fadeUp 0.35s ease both; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }

  .p-card-header { padding: 22px 28px 18px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.5); }
  .p-card-title { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .p-emoji { font-size: 22px; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .p-num { font-family: 'Cormorant Garamond', serif; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
  .p-name { font-family: 'Cinzel', serif; font-size: 19px; font-weight: 600; color: var(--dark); letter-spacing: 0.04em; }
  .p-subtitle { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 15px; color: var(--muted); margin-left: 52px; }
  .p-verse { margin: 10px 0 0 52px; padding: 10px 14px; border-left: 3px solid var(--gold); font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 14px; color: var(--muted); line-height: 1.6; background: rgba(196,151,58,0.04); border-radius: 0 6px 6px 0; }
  .p-verse strong { font-style: normal; font-size: 12px; letter-spacing: 0.05em; color: var(--gold); display: block; margin-top: 4px; }

  .p-card-body { padding: 24px 28px; }

  .field-group { margin-bottom: 20px; }
  .field-label { font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; display: block; }
  .field-input, .field-textarea { width: 100%; font-family: 'EB Garamond', serif; font-size: 16px; color: var(--dark); background: rgba(255,255,255,0.7); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; resize: vertical; line-height: 1.6; }
  .field-textarea { min-height: 80px; }
  .field-input:focus, .field-textarea:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(196,151,58,0.1); }

  .ai-section { margin-top: 6px; padding-top: 20px; border-top: 1px dashed var(--border); }
  .ai-btn { font-family: 'Cormorant Garamond', serif; font-size: 15px; font-weight: 700; letter-spacing: 0.04em; padding: 11px 24px; border-radius: 8px; border: 1px solid var(--gold); background: transparent; color: var(--gold); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
  .ai-btn:hover { background: var(--gold); color: white; }
  .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ai-response { margin-top: 16px; background: rgba(196,151,58,0.05); border: 1px solid rgba(196,151,58,0.2); border-radius: 10px; padding: 18px 20px; animation: fadeUp 0.3s ease; }
  .ai-response-label { font-family: 'Cinzel', serif; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; }
  .ai-response-text { font-family: 'Cormorant Garamond', serif; font-size: 16px; line-height: 1.75; color: var(--dark); white-space: pre-wrap; }

  .dots { display: flex; gap: 5px; padding: 10px 0; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); animation: bounce 1.2s infinite; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,80%,100% { opacity:0.25; transform:scale(0.8); } 40% { opacity:1; transform:scale(1); } }

  .nav-row { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; gap: 12px; }
  .nav-btn { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.08em; padding: 11px 26px; border-radius: 8px; border: none; cursor: pointer; transition: all 0.2s; font-weight: 600; }
  .nav-btn-back { background: transparent; border: 1px solid var(--border); color: var(--muted); }
  .nav-btn-back:hover { border-color: var(--muted); color: var(--dark); }
  .nav-btn-next { background: var(--dark); color: white; margin-left: auto; }
  .nav-btn-next:hover { background: var(--gold); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(196,151,58,0.3); }
  .nav-btn-save { background: var(--gold); color: white; margin-left: auto; }
  .nav-btn-save:hover { background: #B8873A; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(196,151,58,0.35); }
  .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  .stats-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 28px; }
  @media(max-width:480px) { .stats-row { grid-template-columns: 1fr; } }
  .stat-card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 18px; text-align: center; }
  .stat-num { font-family: 'Cinzel', serif; font-size: 32px; color: var(--gold); font-weight: 600; }
  .stat-lbl { font-family: 'Cormorant Garamond', serif; font-size: 13px; color: var(--muted); margin-top: 4px; }

  .entry-card { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 22px 26px; margin-bottom: 16px; position: relative; overflow: hidden; animation: fadeUp 0.3s ease; }
  .entry-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--gold); }
  .entry-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .entry-passage { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600; color: var(--gold); letter-spacing: 0.04em; }
  .entry-date { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 13px; color: var(--muted); margin-top: 3px; }
  .entry-ps { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .entry-p-badge { font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.06em; padding: 3px 9px; border-radius: 20px; border: 1px solid var(--border); color: var(--muted); }
  .entry-p-badge.filled { background: var(--parchment); color: var(--dark); border-color: var(--gold-light); }
  .entry-section { margin-bottom: 12px; }
  .entry-section-lbl { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
  .entry-section-text { font-family: 'Cormorant Garamond', serif; font-size: 15px; color: var(--dark); line-height: 1.65; }
  .entry-ai { margin-top: 14px; padding: 14px 16px; background: rgba(196,151,58,0.05); border-left: 3px solid var(--gold); border-radius: 0 8px 8px 0; }
  .entry-ai-lbl { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 0.12em; color: var(--gold); margin-bottom: 6px; }
  .entry-ai-text { font-family: 'Cormorant Garamond', serif; font-size: 14.5px; line-height: 1.65; color: var(--dark); }
  .victory-chip { display: inline-flex; align-items: center; gap: 5px; background: rgba(74,124,89,0.08); border: 1px solid rgba(74,124,89,0.2); border-radius: 20px; padding: 3px 10px; font-family: 'Cormorant Garamond', serif; font-size: 13px; color: #4A7C59; margin-top: 10px; }
  .del-btn { background: none; border: none; color: #C8B49A; cursor: pointer; font-size: 14px; padding: 3px 6px; border-radius: 4px; transition: color 0.2s; }
  .del-btn:hover { color: #c0392b; }

  .empty-state { text-align: center; padding: 70px 20px; }
  .empty-icon { font-size: 44px; margin-bottom: 16px; }
  .empty-text { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 17px; color: var(--muted); max-width: 300px; margin: 0 auto; line-height: 1.65; }

  .saved-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%) translateY(80px); background: #4A7C59; color: white; font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.08em; padding: 12px 28px; border-radius: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1); z-index: 999; }
  .saved-toast.show { transform: translateX(-50%) translateY(0); }
`;

// ─── Main Component ────────────────────────────────────────────────────────
export default function FaithfulStudyCompanion() {
  const [tab, setTab] = useState("study");
  const [step, setStep] = useState(0);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState(load);
  const [formData, setFormData] = useState({});
  const [aiResponses, setAiResponses] = useState({});
  const [loadingAi, setLoadingAi] = useState({});
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const topRef = useRef(null);

  const currentP = FIVE_PS[step];
  const isLastStep = step === FIVE_PS.length - 1;

  const setField = (key, val) => setFormData(f => ({ ...f, [key]: val }));
  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  const getAi = async (p) => {
    if (!p.aiPrompt) return;
    setLoadingAi(l => ({ ...l, [p.key]: true }));
    const pFields = {};
    p.fields.forEach(f => { pFields[f.key] = formData[f.key] || ""; });
    const { system, user } = p.aiPrompt(pFields, { passage: formData.passage });
    const res = await askCompanion(system, user);
    setAiResponses(r => ({ ...r, [p.key]: res }));
    setLoadingAi(l => ({ ...l, [p.key]: false }));
  };

  const handleNext = () => { setStep(s => Math.min(s + 1, FIVE_PS.length - 1)); scrollTop(); };
  const handleBack = () => { setStep(s => Math.max(s - 1, 0)); scrollTop(); };

  const handleSave = async () => {
    setSaving(true);
    let finalAi = aiResponses[currentP.key];
    if (!finalAi && currentP.aiPrompt) {
      const pFields = {};
      currentP.fields.forEach(f => { pFields[f.key] = formData[f.key] || ""; });
      const { system, user } = currentP.aiPrompt(pFields, { passage: formData.passage });
      finalAi = await askCompanion(system, user);
      setAiResponses(r => ({ ...r, [currentP.key]: finalAi }));
    }
    const entry = { id: Date.now(), date: sessionDate, formData: { ...formData }, aiResponses: { ...aiResponses, [currentP.key]: finalAi } };
    const updated = [entry, ...entries];
    setEntries(updated);
    save(updated);
    setSaving(false);
    setFormData({});
    setAiResponses({});
    setStep(0);
    setSessionDate(new Date().toISOString().split("T")[0]);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
    setTab("journal");
    scrollTop();
  };

  const deleteEntry = (id) => setEntries(prev => { const u = prev.filter(e => e.id !== id); save(u); return u; });

  const formatDate = (d) => {
    try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  const isStepDone = (i) => FIVE_PS[i].fields.some(f => formData[f.key]?.trim());

  return (
    <>
      <style>{css}</style>
      <div className="fsc-root" ref={topRef}>

        <div className="fsc-header">
          <span className="fsc-cross">✝</span>
          <h1 className="fsc-title">Faithful Study <span>Companion</span></h1>
          <p className="fsc-tagline">"Be doers of the word, and not hearers only" — James 1:22</p>
        </div>

        <div className="fsc-tabs">
          <button className={`fsc-tab ${tab === "study" ? "active" : ""}`} onClick={() => setTab("study")}>✍ Five P's Study</button>
          <button className={`fsc-tab ${tab === "journal" ? "active" : ""}`} onClick={() => setTab("journal")}>📖 My Journal</button>
        </div>

        {tab === "study" && (
          <>
            <div className="session-bar">
              <div className="session-field">
                <label>Date</label>
                <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
              </div>
              <div className="session-field">
                <label>Passage / Verses</label>
                <input placeholder="e.g. Romans 8:1–11" value={formData.passage || ""} onChange={e => setField("passage", e.target.value)} />
              </div>
            </div>

            <div className="stepper">
              {FIVE_PS.map((p, i) => (
                <div className="step-item" key={p.key}>
                  <button className="step-btn" onClick={() => { setStep(i); scrollTop(); }}>
                    <div className={`step-circle ${i === step ? "active" : isStepDone(i) ? "done" : ""}`}>
                      {isStepDone(i) && i !== step ? "✓" : p.num}
                    </div>
                    <span className={`step-label ${i === step ? "active" : isStepDone(i) ? "done" : ""}`}>{p.label}</span>
                  </button>
                  {i < FIVE_PS.length - 1 && <div className={`step-line ${isStepDone(i) ? "done" : ""}`} />}
                </div>
              ))}
            </div>

            <div className="p-card" style={{ background: currentP.bg }} key={currentP.key}>
              <div className="p-card-header">
                <div className="p-card-title">
                  <div className="p-emoji" style={{ background: `${currentP.color}18` }}>{currentP.emoji}</div>
                  <div>
                    <div className="p-num" style={{ color: currentP.color }}>P{currentP.num} of 5</div>
                    <div className="p-name">{currentP.label}</div>
                  </div>
                </div>
                <div className="p-subtitle">{currentP.subtitle}</div>
                <div className="p-verse">
                  "{currentP.verse.text}"
                  <strong>— {currentP.verse.ref}</strong>
                </div>
              </div>

              <div className="p-card-body">
                {currentP.fields.map(field => (
                  <div className="field-group" key={field.key}>
                    <label className="field-label">{field.label}</label>
                    {field.rows === 1
                      ? <input className="field-input" placeholder={field.placeholder} value={formData[field.key] || ""} onChange={e => setField(field.key, e.target.value)} />
                      : <textarea className="field-textarea" placeholder={field.placeholder} rows={field.rows} value={formData[field.key] || ""} onChange={e => setField(field.key, e.target.value)} />
                    }
                  </div>
                ))}

                {currentP.aiPrompt && (
                  <div className="ai-section">
                    <button className="ai-btn" onClick={() => getAi(currentP)} disabled={loadingAi[currentP.key]}>
                      ✨ Companion Insight
                    </button>
                    {loadingAi[currentP.key] && <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>}
                    {aiResponses[currentP.key] && !loadingAi[currentP.key] && (
                      <div className="ai-response">
                        <div className="ai-response-label">✦ Faithful Companion Speaks</div>
                        <div className="ai-response-text">{aiResponses[currentP.key]}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="nav-row">
              {step > 0 && <button className="nav-btn nav-btn-back" onClick={handleBack}>← Back</button>}
              {!isLastStep
                ? <button className="nav-btn nav-btn-next" onClick={handleNext}>Next P →</button>
                : <button className="nav-btn nav-btn-save" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "📖 Save to Journal"}</button>
              }
            </div>
          </>
        )}

        {tab === "journal" && (
          <>
            <div className="stats-row">
              <div className="stat-card"><div className="stat-num">{entries.length}</div><div className="stat-lbl">Studies Logged</div></div>
              <div className="stat-card"><div className="stat-num">{entries.filter(e => e.formData?.victory?.trim()).length}</div><div className="stat-lbl">Victories</div></div>
              <div className="stat-card"><div className="stat-num">{entries.filter(e => e.formData?.obey?.trim()).length}</div><div className="stat-lbl">Acts of Obedience</div></div>
            </div>

            {entries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📜</div>
                <p className="empty-text">Your spiritual growth journal is empty. Complete your first Five P's study to begin.</p>
              </div>
            ) : entries.map(entry => {
              const fd = entry.formData || {};
              const ar = entry.aiResponses || {};
              const passage = fd.passage || "Untitled Study";
              const closingAi = ar.plan || ar.pose || ar.pull || ar.pore;
              return (
                <div className="entry-card" key={entry.id}>
                  <div className="entry-head">
                    <div>
                      <div className="entry-passage">{passage}</div>
                      <div className="entry-date">{formatDate(entry.date)}</div>
                    </div>
                    <button className="del-btn" onClick={() => deleteEntry(entry.id)}>✕</button>
                  </div>
                  <div className="entry-ps">
                    {FIVE_PS.map(p => (
                      <span key={p.key} className={`entry-p-badge ${p.fields.some(f => fd[f.key]?.trim()) ? "filled" : ""}`}>
                        {p.emoji} {p.label}
                      </span>
                    ))}
                  </div>
                  {fd.heart && <div className="entry-section"><div className="entry-section-lbl">Heart Before God</div><div className="entry-section-text">{fd.heart}</div></div>}
                  {(fd.principle1 || fd.principle2) && <div className="entry-section"><div className="entry-section-lbl">Principles Pulled</div><div className="entry-section-text">{[fd.principle1, fd.principle2, fd.principle3].filter(Boolean).join(" · ")}</div></div>}
                  {fd.obey && <div className="entry-section"><div className="entry-section-lbl">Plan of Obedience</div><div className="entry-section-text">{fd.obey}</div></div>}
                  {fd.prayer && <div className="entry-section"><div className="entry-section-lbl">Prayer</div><div className="entry-section-text">{fd.prayer}</div></div>}
                  {fd.victory && <div className="victory-chip">🙌 {fd.victory}</div>}
                  {closingAi && <div className="entry-ai"><div className="entry-ai-lbl">✦ Companion's Encouragement</div><div className="entry-ai-text">{closingAi}</div></div>}
                </div>
              );
            })}
          </>
        )}

        <div className={`saved-toast ${toastVisible ? "show" : ""}`}>✓ Study saved to your journal</div>
      </div>
    </>
  );
}
