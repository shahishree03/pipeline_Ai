import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Upload, FileText, Database, Zap, Search, MessageSquare,
  Scale, Bot, Brain, BarChart3, PieChart,
  CheckCircle2, XCircle, Loader2, Clock, AlertTriangle,
  Play, SkipForward, RefreshCw, Terminal,
  Hash, Cpu, Activity, TrendingUp, Award, X
} from "lucide-react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STAGES = [
  { id: 1, key: "upload",    label: "Assessment Upload",     icon: Upload,        color: "teal",    description: "Validates file integrity, extracts metadata, queues document for parsing." },
  { id: 2, key: "parsing",   label: "Document Parsing",      icon: FileText,      color: "blue",    description: "Runs layout detection to extract headings, code blocks, and text hierarchy." },
  { id: 3, key: "kb",        label: "Knowledge Base",        icon: Database,      color: "violet",  description: "Constructs a hierarchical knowledge store from parsed document nodes." },
  { id: 4, key: "embedding", label: "Embedding Generation",  icon: Zap,           color: "amber",   description: "Converts text chunks into dense vector embeddings via the embedding model." },
  { id: 5, key: "retrieval", label: "RAG Retrieval",         icon: Search,        color: "cyan",    description: "Validates retrieval quality: latency, top-K accuracy, context relevance." },
  { id: 6, key: "qgen",      label: "Question Generation",   icon: MessageSquare, color: "emerald", description: "LLM agent generates a diverse question bank aligned to document intent." },
  { id: 7, key: "rubric",    label: "Rubric Inference",      icon: Scale,         color: "orange",  description: "Extracts scoring rubrics and assigns channel weights per question difficulty." },
  { id: 8, key: "interview", label: "Adaptive Interview",    icon: Bot,           color: "pink",    description: "Orchestrates an adaptive agent-to-candidate interview with branching logic." },
  { id: 9, key: "eval",      label: "Semantic Evaluation",   icon: Brain,         color: "purple",  description: "Multi-channel evaluator: semantic similarity, intent alignment, keyword detection." },
  { id: 10, key: "scoring",  label: "Scoring Normalization", icon: BarChart3,     color: "rose",    description: "Normalizes raw channel scores, applies difficulty weights, produces final grades." },
  { id: 11, key: "analytics",label: "Dashboard Analytics",   icon: PieChart,      color: "indigo",  description: "Aggregates pipeline telemetry, candidate scores, exports final reports." },
];

const PIPELINE_SEQUENCE = STAGES.map(s => s.key);

const COLOR_MAP = {
  teal:    { dot: "#14b8a6", ring: "#0d9488", bg: "#042f2e", text: "#5eead4" },
  blue:    { dot: "#3b82f6", ring: "#2563eb", bg: "#0f172a", text: "#93c5fd" },
  violet:  { dot: "#8b5cf6", ring: "#7c3aed", bg: "#1e1b4b", text: "#c4b5fd" },
  amber:   { dot: "#f59e0b", ring: "#d97706", bg: "#1c1400", text: "#fcd34d" },
  cyan:    { dot: "#06b6d4", ring: "#0891b2", bg: "#0a1a1e", text: "#67e8f9" },
  emerald: { dot: "#10b981", ring: "#059669", bg: "#022c22", text: "#6ee7b7" },
  orange:  { dot: "#f97316", ring: "#ea580c", bg: "#1a0800", text: "#fdba74" },
  pink:    { dot: "#ec4899", ring: "#db2777", bg: "#1a0010", text: "#f9a8d4" },
  purple:  { dot: "#a855f7", ring: "#9333ea", bg: "#1a0028", text: "#d8b4fe" },
  rose:    { dot: "#f43f5e", ring: "#e11d48", bg: "#1a0008", text: "#fda4af" },
  indigo:  { dot: "#6366f1", ring: "#4f46e5", bg: "#0f0f2a", text: "#a5b4fc" },
};

const LOG_COLORS = { INFO: "#94a3b8", SUCCESS: "#34d399", WARN: "#fbbf24", ERROR: "#f87171" };

// ─── CLAUDE API STAGE PROMPTS ─────────────────────────────────────────────────
// Upload stage is UI-driven (real file input). All other stages call Claude API.

const STAGE_PROMPTS = {
  // upload is intentionally absent — handled by UploadStagePanel

  parsing: `You are simulating a document parsing pipeline output for Java interview evaluation documents (Employee/Company system, BankAccount transfer, Beach rating finder).
Return ONLY valid JSON (no markdown) with this structure:
{
  "metrics": [
    {"label":"Nodes Extracted","value":"847","unit":""},
    {"label":"Code Blocks","value":"34","unit":""},
    {"label":"Tables Found","value":"11","unit":""},
    {"label":"Parse Time","value":"3.7","unit":"s"}
  ],
  "structure": [
    {"type":"H1","count":8,"sample":"Java Interview Evaluation System"},
    {"type":"H2","count":22,"sample":"Meta Evaluation Design Principles"},
    {"type":"H3","count":51,"sample":"Question 1 — Employee/Company Mgmt"},
    {"type":"Code","count":34,"sample":"{ 'template_id': 'tmpl-java-M-01', ... }"},
    {"type":"Table","count":11,"sample":"Interviewer Decision Matrix"},
    {"type":"Para","count":721,"sample":"When a field is marked private..."}
  ],
  "logs": [
    {"time":"14:32:03.001","level":"INFO","msg":"Layout analysis started — engine: pdfminer + unstructured v0.11"},
    {"time":"14:32:04.212","level":"INFO","msg":"Detected document type: MIXED (pdf + docx)"},
    {"time":"14:32:05.091","level":"WARN","msg":"3 ambiguous heading levels in rubric_template.docx — resolved heuristically"},
    {"time":"14:32:06.330","level":"INFO","msg":"Code block extraction: 34 blocks, avg 12 lines each"},
    {"time":"14:32:06.711","level":"SUCCESS","msg":"847 document nodes extracted and classified"}
  ]
}`,

  kb: `You are simulating a Knowledge Base construction phase for a Java interview evaluation system covering 3 PDF/DOCX documents (Employee/Company, BankAccount, Beach rating).
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"KB Entries","value":"1,204","unit":""},
    {"label":"Hierarchy Depth","value":"4","unit":"levels"},
    {"label":"Index Size","value":"18.4","unit":"MB"},
    {"label":"Build Time","value":"6.1","unit":"s"}
  ],
  "hierarchy": [
    {"level":"L0 — Root","entries":1,"example":"Enterprise AI Evaluation Session 2024Q1"},
    {"level":"L1 — Document","entries":3,"example":"java_interview_answer_key.pdf"},
    {"level":"L2 — Section","entries":38,"example":"PDF 1 — Employee/Company Management"},
    {"level":"L3 — Question Block","entries":312,"example":"Question EMP_01 — Private Access Modifiers"},
    {"level":"L4 — Rubric Criteria","entries":850,"example":"Channel: intent (weight: 0.25)"}
  ],
  "logs": [
    {"time":"14:32:07.100","level":"INFO","msg":"KB construction initiated — schema_version: 3.0"},
    {"time":"14:32:08.440","level":"INFO","msg":"Inverted index built: 18,492 unique tokens"},
    {"time":"14:32:09.612","level":"INFO","msg":"Hierarchy linking: 850 leaf nodes connected to 312 question blocks"},
    {"time":"14:32:12.001","level":"INFO","msg":"BM25 baseline benchmark: MAP@10 = 0.83"},
    {"time":"14:32:13.201","level":"SUCCESS","msg":"Knowledge base ready — 1,204 indexed entries"}
  ]
}`,

  embedding: `You are simulating vector embedding generation for a Java interview knowledge base. Chunks come from Java OOP, arrays, exceptions, concurrency concepts.
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"Total Chunks","value":"1,204","unit":""},
    {"label":"Tokens Used","value":"284K","unit":""},
    {"label":"Dimensions","value":"1,536","unit":"d"},
    {"label":"Throughput","value":"312","unit":"c/s"}
  ],
  "chunks": [
    {"id":"chunk_001","text":"When a field is marked private in Employee, only methods defined inside Employee itself...","tokens":48,"dim":1536},
    {"id":"chunk_002","text":"Constructor-based initialization enforces atomic object creation and improves object validity...","tokens":52,"dim":1536},
    {"id":"chunk_003","text":"Scanner.nextInt() parses only the integer token and stops before the trailing newline...","tokens":44,"dim":1536},
    {"id":"chunk_004","text":"ArrayList internal resizing allocates a new array 1.5x the capacity using Arrays.copyOf...","tokens":57,"dim":1536},
    {"id":"chunk_005","text":"Intent scoring must dominate over raw keyword matching. Runtime reasoning importance increases...","tokens":39,"dim":1536}
  ],
  "logs": [
    {"time":"14:32:14.000","level":"INFO","msg":"Embedding model: text-embedding-3-large (OpenAI) — 1536-dim"},
    {"time":"14:32:14.301","level":"INFO","msg":"Chunking strategy: semantic_sentence_window — overlap: 64 tokens"},
    {"time":"14:32:20.001","level":"INFO","msg":"Batch 1/4 complete — 301 chunks embedded"},
    {"time":"14:32:27.880","level":"INFO","msg":"Batch 4/4 complete — all 1,204 chunks embedded"},
    {"time":"14:32:28.001","level":"SUCCESS","msg":"Vector store populated — 284,320 tokens consumed"}
  ]
}`,

  retrieval: `You are simulating RAG retrieval validation for a Java interview evaluation system. Generate realistic retrieval quality metrics.
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"Avg Latency","value":"42","unit":"ms"},
    {"label":"Top-K Accuracy","value":"94.2%","unit":""},
    {"label":"Relevance Score","value":"0.87","unit":"cosine"},
    {"label":"Test Queries","value":"50","unit":""}
  ],
  "queries": [
    {"query":"What does private access modifier do in Java?","topK":5,"latency":"38ms","relevance":0.94,"status":"pass"},
    {"query":"Why use parameterized constructors over setters?","topK":5,"latency":"41ms","relevance":0.91,"status":"pass"},
    {"query":"Explain Scanner.nextLine() after nextInt()","topK":5,"latency":"44ms","relevance":0.88,"status":"pass"},
    {"query":"ArrayList vs array resizing behavior","topK":5,"latency":"39ms","relevance":0.85,"status":"pass"},
    {"query":"Transaction consistency in banking withdrawal","topK":5,"latency":"52ms","relevance":0.71,"status":"warn"}
  ],
  "logs": [
    {"time":"14:32:29.000","level":"INFO","msg":"Retrieval benchmark: 50 test queries against vector store"},
    {"time":"14:32:31.210","level":"INFO","msg":"FAISS index: HNSW M=32, ef_construction=200"},
    {"time":"14:32:33.001","level":"WARN","msg":"Query 47: context_relevance=0.71 — below threshold 0.80 — flagged for review"},
    {"time":"14:32:34.900","level":"INFO","msg":"Average P@5: 0.942 | MRR: 0.891"},
    {"time":"14:32:35.001","level":"SUCCESS","msg":"RAG retrieval validated — 49/50 queries above relevance threshold"}
  ]
}`,

  qgen: `You are an enterprise Java interview question generation AI. Based on three Java problems (Employee/Company management system, BankAccount transfer system, Beach rating finder), generate exactly 5 diverse interview questions across difficulty levels.
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"Questions Generated","value":"48","unit":""},
    {"label":"Difficulty Split","value":"16/20/12","unit":"E/M/H"},
    {"label":"Diversity Score","value":"0.89","unit":""},
    {"label":"Generation Time","value":"28.4","unit":"s"}
  ],
  "questions": [
    {"id":"EMP_01","diff":"easy","text":"What does the private modifier prevent in Java's Employee class?","intent":"Encapsulation understanding","mustInclude":["encapsulation","access control"]},
    {"id":"EMP_02","diff":"medium","text":"Why is a parameterized constructor preferred over no-arg + setters for Employee?","intent":"Object state consistency","mustInclude":["atomic initialization","JVM default values"]},
    {"id":"BANK_12","diff":"hard","text":"If setBalance() on the sender succeeds but credit to receiver throws an exception — what is the system state and how would you fix it?","intent":"Transactional atomicity","mustInclude":["partial update","atomicity","rollback"]},
    {"id":"BEACH_11","diff":"hard","text":"Why is calling Arrays.sort(rate) inside the match loop inefficient — and what is the Big-O impact?","intent":"Algorithmic complexity awareness","mustInclude":["redundant sorting","O(n log n)","move outside loop"]},
    {"id":"BANK_18","diff":"hard","text":"Two threads call transferFunds simultaneously on the same account — describe the race condition and its prevention.","intent":"Concurrency safety","mustInclude":["race condition","synchronized","lost update"]}
  ],
  "logs": [
    {"time":"14:32:36.000","level":"INFO","msg":"Q-gen agent initialized — model: claude-sonnet-4-20250514"},
    {"time":"14:32:38.001","level":"INFO","msg":"Diversity constraint: max 3 questions per document section"},
    {"time":"14:32:50.220","level":"INFO","msg":"Generated 48 questions: 16 easy / 20 medium / 12 hard"},
    {"time":"14:32:51.001","level":"INFO","msg":"Diversity score: 0.89 (coverage across 11 Java topics)"},
    {"time":"14:32:52.400","level":"SUCCESS","msg":"Answer key mapped — 48/48 questions have golden answers"}
  ]
}`,

  rubric: `You are a rubric inference engine for an enterprise Java interview evaluation system. Extract and weight scoring rubric channels from the evaluation schema v3.0.
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"Rubric Channels","value":"7","unit":""},
    {"label":"Criteria Extracted","value":"336","unit":""},
    {"label":"Alignment Score","value":"0.93","unit":""},
    {"label":"Inference Time","value":"14.2","unit":"s"}
  ],
  "channels": [
    {"name":"semantic","weight":0.20,"desc":"Embedding similarity vs ideal answer"},
    {"name":"intent","weight":0.25,"desc":"Design intent comprehension depth"},
    {"name":"keyword","weight":0.10,"desc":"Mandatory concept keyword presence"},
    {"name":"reasoning_depth","weight":0.15,"desc":"Step-by-step technical reasoning"},
    {"name":"runtime_awareness","weight":0.15,"desc":"JVM runtime behavior understanding"},
    {"name":"edge_case_awareness","weight":0.10,"desc":"Hidden failure path identification"},
    {"name":"architecture_understanding","weight":0.05,"desc":"Scalability and maintainability signals"}
  ],
  "logs": [
    {"time":"14:32:53.000","level":"INFO","msg":"Rubric extraction — schema_version: 3.0 — 7 channels"},
    {"time":"14:32:55.001","level":"INFO","msg":"Golden-standard alignment: 48/48 questions mapped to answer keys"},
    {"time":"14:33:00.112","level":"INFO","msg":"Difficulty weight matrix applied: easy×1.0 / med×1.5 / hard×2.0"},
    {"time":"14:33:05.001","level":"WARN","msg":"2 questions with ambiguous intent scope — manual review flagged"},
    {"time":"14:33:07.400","level":"SUCCESS","msg":"336 rubric criteria extracted — alignment score: 0.93"}
  ]
}`,

  interview: `You are simulating an adaptive AI interviewer conducting a Java technical interview. Generate a realistic 6-turn transcript covering encapsulation, constructors, and JVM defaults.
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"Questions Asked","value":"18","unit":""},
    {"label":"Follow-ups Triggered","value":"7","unit":""},
    {"label":"Avg Response Time","value":"42","unit":"s"},
    {"label":"State Transitions","value":"31","unit":""}
  ],
  "transcript": [
    {"role":"agent","text":"What does the private access modifier do in Java's Employee class — specifically, who or what is it keeping out?","qid":"EMP_01"},
    {"role":"candidate","text":"Private restricts field access to within the Employee class itself. External classes like Company or main cannot directly read or write those fields — that's the core of encapsulation. It forces any changes to go through controlled methods.","score":0.88},
    {"role":"agent","text":"Good. Now — if you'd used a no-arg constructor with four setter calls instead of a parameterized constructor, what's the data-level risk during that window between construction and all setters completing?","qid":"EMP_02"},
    {"role":"candidate","text":"There's a window where the object exists but fields still hold JVM defaults — zero, null, 0.0. If another thread or method accesses the object before all four setters finish, it could see invalid state. The parameterized constructor makes initialization atomic.","score":0.93},
    {"role":"agent","text":"[FOLLOW-UP] You said JVM defaults — what specifically would salary and name hold in that window?","qid":"EMP_02_FU"},
    {"role":"candidate","text":"salary would be 0.0 as a double default, and name would be null as an object reference default. Zero for int id as well.","score":0.97}
  ],
  "logs": [
    {"time":"14:33:08.000","level":"INFO","msg":"Interview agent: adaptive_qa_v2 — state machine initialized"},
    {"time":"14:33:09.001","level":"INFO","msg":"Candidate session started — session_id: CAND_001_INT_01"},
    {"time":"14:33:51.000","level":"INFO","msg":"Score threshold 0.85 exceeded — follow-up question generated for EMP_02"},
    {"time":"14:34:12.000","level":"INFO","msg":"Score below 0.60 on ARR_04 — simplified probe injected"},
    {"time":"14:35:00.001","level":"SUCCESS","msg":"18 questions completed — 7 follow-ups generated — interview session closed"}
  ]
}`,

  eval: `You are a multi-channel semantic evaluation engine scoring Java interview responses. Score 5 candidate answers across 7 rubric channels (semantic, intent, keyword, reasoning, runtime, edge, arch).
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"Responses Scored","value":"18","unit":""},
    {"label":"Avg Semantic Sim","value":"0.87","unit":""},
    {"label":"Intent Match Rate","value":"91.2%","unit":""},
    {"label":"Hallucinations","value":"0","unit":"detected"}
  ],
  "scores": [
    {"qid":"EMP_01","semantic":0.92,"intent":0.88,"keyword":0.90,"reasoning":0.85,"runtime":0.80,"edge":0.72,"arch":0.70,"final":0.86},
    {"qid":"EMP_02","semantic":0.91,"intent":0.94,"keyword":0.85,"reasoning":0.88,"runtime":0.84,"edge":0.75,"arch":0.68,"final":0.89},
    {"qid":"BANK_12","semantic":0.78,"intent":0.82,"keyword":0.70,"reasoning":0.75,"runtime":0.88,"edge":0.65,"arch":0.55,"final":0.79},
    {"qid":"BEACH_11","semantic":0.85,"intent":0.87,"keyword":0.80,"reasoning":0.83,"runtime":0.79,"edge":0.70,"arch":0.72,"final":0.83},
    {"qid":"BANK_18","semantic":0.88,"intent":0.91,"keyword":0.82,"reasoning":0.86,"runtime":0.82,"edge":0.78,"arch":0.75,"final":0.86}
  ],
  "logs": [
    {"time":"14:35:02.000","level":"INFO","msg":"Evaluation pipeline: semantic → intent → keyword → runtime → edge_case"},
    {"time":"14:35:04.001","level":"INFO","msg":"Hallucination detector: confidence threshold 0.15 — 0 hallucinations detected"},
    {"time":"14:35:08.220","level":"INFO","msg":"Embedding similarity computed: avg cosine = 0.87 (18 responses)"},
    {"time":"14:35:12.001","level":"INFO","msg":"Intent alignment: 16.4/18 avg — rate: 91.2%"},
    {"time":"14:35:14.400","level":"SUCCESS","msg":"All 18 responses evaluated across 7 rubric channels"}
  ]
}`,

  scoring: `You are a scoring normalization engine for a Java interview evaluation system. Apply difficulty weights, detect outliers, and produce a final normalized score.
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"Final Score","value":"0.847","unit":""},
    {"label":"Weighted Grade","value":"B+","unit":""},
    {"label":"Outliers Removed","value":"1","unit":""},
    {"label":"Norm. Time","value":"0.3","unit":"s"}
  ],
  "breakdown": [
    {"category":"Core Java OOP","questions":8,"raw":0.88,"weighted":0.91,"difficulty":"easy/med"},
    {"category":"Arrays & Collections","questions":6,"raw":0.79,"weighted":0.76,"difficulty":"med/hard"},
    {"category":"Exception Handling","questions":4,"raw":0.84,"weighted":0.87,"difficulty":"medium"},
    {"category":"Concurrency & Banking","questions":4,"raw":0.83,"weighted":0.80,"difficulty":"hard"},
    {"category":"Architecture Signals","questions":3,"raw":0.72,"weighted":0.70,"difficulty":"hard"}
  ],
  "formula":"FinalScore = Σ(RubricWeight × CriterionScore × DifficultyMultiplier × ConfidenceFactor)",
  "logs": [
    {"time":"14:35:15.000","level":"INFO","msg":"Normalization: z-score outlier detection — threshold: 2.5σ"},
    {"time":"14:35:15.100","level":"WARN","msg":"BANK_12 runtime score (0.40) flagged as outlier — soft-clamped to 0.50"},
    {"time":"14:35:15.200","level":"INFO","msg":"Difficulty multipliers applied: hard×2.0 (12q), med×1.5 (20q), easy×1.0 (16q)"},
    {"time":"14:35:15.290","level":"INFO","msg":"Confidence factor (1 - hallucination_penalty): 1.000 — no penalty applied"},
    {"time":"14:35:15.400","level":"SUCCESS","msg":"Final weighted score: 0.847 — Grade: B+ — PASS"}
  ]
}`,

  analytics: `You are an analytics aggregation engine. Generate a comprehensive candidate evaluation report for a Java backend developer (CAND_001) who scored 0.847 overall.
Return ONLY valid JSON (no markdown):
{
  "metrics": [
    {"label":"Overall Score","value":"84.7%","unit":""},
    {"label":"Pass/Fail","value":"PASS","unit":""},
    {"label":"Pipeline Duration","value":"3m 14s","unit":""},
    {"label":"Export Ready","value":"Yes","unit":""}
  ],
  "radar": [
    {"label":"Semantic","score":0.87},
    {"label":"Intent","score":0.91},
    {"label":"Keyword","score":0.82},
    {"label":"Reasoning","score":0.85},
    {"label":"Runtime","score":0.83},
    {"label":"Edge Case","score":0.74},
    {"label":"Architecture","score":0.70}
  ],
  "strengths": [
    "Strong conceptual understanding of OOP encapsulation and access control",
    "Accurate JVM runtime behavior explanation including default values",
    "Clear identification of object state consistency risks with constructors",
    "Correct exception handling flow and concurrency race condition awareness"
  ],
  "weaknesses": [
    "Edge-case reasoning below threshold on array boundary operations",
    "Architecture scalability signals sparse on hard concurrency questions"
  ],
  "recommendation": "Candidate demonstrates solid intermediate-to-advanced Java knowledge with strong OOP fundamentals and exception awareness. Recommended for mid-level backend role. Suggested growth areas: distributed system design patterns and deep concurrency primitives (ReentrantLock, CompletableFuture).",
  "logs": [
    {"time":"14:35:16.000","level":"INFO","msg":"Analytics aggregation: 11 pipeline stages — 18 Q&A pairs"},
    {"time":"14:35:16.400","level":"INFO","msg":"PDF report generated: eval_CAND_001_20240118.pdf"},
    {"time":"14:35:16.600","level":"INFO","msg":"JSON export: raw scores + traces — eval_CAND_001_raw.json"},
    {"time":"14:35:16.800","level":"INFO","msg":"Webhook dispatched: HR dashboard notified"},
    {"time":"14:35:17.001","level":"SUCCESS","msg":"Pipeline complete — candidate CAND_001 — final: 0.847 — PASS"}
  ]
}`
};

// ─── CLAUDE API CALL ──────────────────────────────────────────────────────────

async function callClaudeStage(stageKey) {
  if (stageKey === "upload") throw new Error("Upload stage is UI-driven, not API-driven");
  const prompt = STAGE_PROMPTS[stageKey];
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  const text = data.content?.map(b => b.text || "").join("") || "{}";
  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── SMALL UI COMPONENTS ──────────────────────────────────────────────────────

function StatusDot({ status }) {
  if (status === "processing") return <Loader2 size={14} className="text-blue-400 animate-spin" />;
  if (status === "success")    return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (status === "failed")     return <XCircle size={14} className="text-red-400" />;
  return <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />;
}

function MetricCard({ label, value, unit }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white leading-none">
        {value}<span className="text-xs text-slate-400 ml-1 font-normal">{unit}</span>
      </p>
    </div>
  );
}

function LogConsole({ logs = [] }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div ref={ref} className="bg-slate-950 border border-slate-800 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
      {logs.length === 0 && <span className="text-slate-600">No logs yet — run the pipeline to populate.</span>}
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2 mb-0.5">
          <span className="text-slate-600 shrink-0">{log.time}</span>
          <span className="shrink-0 w-14" style={{ color: LOG_COLORS[log.level] || "#94a3b8" }}>[{log.level}]</span>
          <span className="text-slate-300">{log.msg}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreBar({ value, color = "#10b981" }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-400 w-9 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

function RadarChart({ data }) {
  const cx = 120, cy = 120, r = 80;
  const n = data.length;
  const pts = data.map((d, i) => {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * r * d.score,
      y: cy + Math.sin(angle) * r * d.score,
      lx: cx + Math.cos(angle) * (r + 22),
      ly: cy + Math.sin(angle) * (r + 22),
      label: d.label, score: d.score
    };
  });
  const gridLines = [0.25, 0.5, 0.75, 1.0].map(scale =>
    data.map((_, i) => {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
    }).join(" ")
  );
  const shapePts = pts.map(p => `${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-xs mx-auto">
      {gridLines.map((poly, i) => (
        <polygon key={i} points={poly} fill="none" stroke="#1e293b" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r} stroke="#1e293b" strokeWidth="1" />;
      })}
      <polygon points={shapePts} fill="#6366f1" fillOpacity="0.25" stroke="#818cf8" strokeWidth="1.5" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#818cf8" />
          <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#94a3b8">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── UPLOAD STAGE PANEL ───────────────────────────────────────────────────────
// Real drag-and-drop file input — no Claude API needed for upload

const ACCEPTED_TYPES = [".pdf", ".docx", ".md", ".json", ".txt"];
const MAX_FILES = 5;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function UploadStagePanel({ uploadedFiles, onFilesReady, status }) {
  const [dragOver, setDragOver] = useState(false);
  const [progresses, setProgresses] = useState({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewText, setPreviewText] = useState("");
  const inputRef = useRef(null);

  const selectedFile = uploadedFiles[selectedIndex] || null;

  useEffect(() => {
    if (!selectedFile || selectedFile.type !== "PDF") {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedFile.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile || !["TXT", "MD", "JSON"].includes(selectedFile.type)) {
      setPreviewText("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreviewText(reader.result || "");
    reader.onerror = () => setPreviewText("Unable to load preview.");
    reader.readAsText(selectedFile.file);
    return () => { if (reader.readyState === 1) reader.abort(); };
  }, [selectedFile]);

  useEffect(() => {
    if (uploadedFiles.length === 0) {
      setSelectedIndex(0);
      setPreviewText("");
      setPreviewUrl("");
    } else if (selectedIndex >= uploadedFiles.length) {
      setSelectedIndex(0);
    }
  }, [uploadedFiles, selectedIndex]);

  const simulateProgress = useCallback((name) => {
    // Simulate a chunked upload progress for each file
    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 25 + 10;
      if (pct >= 100) { pct = 100; clearInterval(interval); }
      setProgresses(p => ({ ...p, [name]: Math.min(Math.round(pct), 100) }));
    }, 120);
  }, []);

  const processFiles = useCallback((rawFiles) => {
    const valid = Array.from(rawFiles)
      .filter(f => ACCEPTED_TYPES.some(ext => f.name.toLowerCase().endsWith(ext)))
      .slice(0, MAX_FILES);
    if (!valid.length) return;

    const enriched = valid.map(f => ({
      file: f,
      name: f.name,
      size: formatBytes(f.size),
      rawSize: f.size,
      type: f.name.split(".").pop().toUpperCase(),
      status: "uploading",
      hash: "sha256:" + Math.random().toString(36).slice(2, 10) + "..."
    }));

    enriched.forEach(e => simulateProgress(e.name));

    // After all progress animations settle, mark ready
    setTimeout(() => {
      const finalFiles = enriched.map(e => ({ ...e, status: "verified" }));
      onFilesReady(finalFiles);
    }, enriched.length * 200 + 800);
  }, [simulateProgress, onFilesReady]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onInputChange = useCallback((e) => {
    processFiles(e.target.files);
    e.target.value = "";
  }, [processFiles]);

  const allDone = uploadedFiles.length > 0 && uploadedFiles.every(f => f.status === "verified");

  return (
    <div className="mb-4">
      {/* Drop zone — only show when no files yet and not already success */}
      {status !== "success" && uploadedFiles.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-10 mb-4 transition-all duration-200"
          style={{
            borderColor: dragOver ? "#6366f1" : "#334155",
            background: dragOver ? "rgba(99,102,241,0.07)" : "rgba(15,23,42,0.5)"
          }}
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Upload size={22} className="text-teal-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Drop assessment files here</p>
            <p className="text-xs text-slate-500 mt-1">or click to browse · PDF, DOCX, MD, JSON, TXT</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      )}

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-1.5 mb-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            {allDone ? "Uploaded Files" : "Uploading…"}
          </p>
          {uploadedFiles.map((f, i) => {
            const pct = progresses[f.name] ?? 0;
            const done = f.status === "verified";
            return (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{f.name}</p>
                    <p className="text-xs text-slate-500">{f.size} · <span className="font-mono">{f.hash}</span></p>
                  </div>
                  {done
                    ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    : <Loader2 size={13} className="text-blue-400 shrink-0 animate-spin" />
                  }
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${done ? 100 : pct}%`,
                      background: done ? "#34d399" : "#6366f1"
                    }}
                  />
                </div>
                {!done && (
                  <p className="text-xs text-slate-500 mt-0.5 text-right">{pct}%</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-4 mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">Document Explorer</p>
              <p className="text-xs text-slate-500">Preview uploaded PDF files and inspect document metadata.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((f, i) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`text-xs px-3 py-1 rounded-full transition ${selectedIndex === i ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700/80"}`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Selected File</p>
                <p className="text-sm font-semibold text-white truncate">{selectedFile?.name || "No file selected"}</p>
                {selectedFile && (
                  <div className="mt-3 space-y-2 text-xs text-slate-400">
                    <p><span className="text-slate-500">Type:</span> {selectedFile.type}</p>
                    <p><span className="text-slate-500">Size:</span> {selectedFile.size}</p>
                    <p><span className="text-slate-500">Status:</span> {selectedFile.status}</p>
                    <p><span className="text-slate-500">Hash:</span> <span className="font-mono text-slate-300">{selectedFile.hash}</span></p>
                  </div>
                )}
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Explore Controls</p>
                <p className="text-xs text-slate-400">Click a file tab to preview it in the viewer.</p>
                {selectedFile?.type === "PDF" && (
                  <p className="text-xs text-slate-400 mt-1">PDF preview is available below.</p>
                )}
                {selectedFile && !["PDF", "TXT", "MD", "JSON"].includes(selectedFile.type) && (
                  <p className="text-xs text-slate-500 mt-1">This file type can be downloaded, but inline preview may not be available.</p>
                )}
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 min-h-[320px]">
              {selectedFile ? (
                selectedFile.type === "PDF" ? (
                  <object data={previewUrl} type="application/pdf" width="100%" height="420" className="border border-slate-800 rounded-lg overflow-hidden">
                    <p className="text-xs text-slate-500">PDF preview is unavailable in this browser. <a href={previewUrl} target="_blank" rel="noreferrer" className="text-slate-300 underline">Open in new tab</a>.</p>
                  </object>
                ) : ["TXT", "MD", "JSON"].includes(selectedFile.type) ? (
                  <div className="h-[420px] overflow-y-auto text-xs text-slate-200 font-mono whitespace-pre-wrap break-words bg-slate-950/80 rounded-lg p-3 border border-slate-800">
                    {previewText || "Loading preview..."}
                  </div>
                ) : (
                  <div className="h-[420px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg px-4 text-center">
                    <p className="text-sm text-white">Preview not available for this document type.</p>
                    <p className="text-xs mt-2">Use the file browser to open it directly in your OS or upload a PDF for inline exploration.</p>
                  </div>
                )
              ) : (
                <div className="h-[420px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-lg px-4 text-center">
                  <p className="text-sm text-white">Select a file to explore its preview.</p>
                  <p className="text-xs mt-2">PDF files render inline, text files show the first content chunk.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* After success: show re-upload option */}
      {status === "success" && (
        <div className="flex items-center gap-2 mt-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">All files verified — pipeline continuing</span>
        </div>
      )}

      {/* Accepted types hint */}
      {status !== "success" && uploadedFiles.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {ACCEPTED_TYPES.map(t => (
            <span key={t} className="text-xs bg-slate-800 border border-slate-700 text-slate-500 px-2 py-0.5 rounded font-mono">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── INSPECTOR PANEL ──────────────────────────────────────────────────────────

function InspectorPanel({ stage, status, stageData, isLoading, uploadedFiles, onFilesReady }) {
  const col = COLOR_MAP[stage.color];
  const StageIcon = stage.icon;
  const data = stageData;

  return (
    <div className="h-full overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center border"
          style={{ background: col.bg, borderColor: col.dot + "40" }}>
          <StageIcon size={18} style={{ color: col.dot }} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white leading-none">{stage.label}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{stage.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
          style={{ borderColor: col.dot + "50", color: col.text, background: col.bg }}>
          <StatusDot status={status} />
          <span className="capitalize">{status}</span>
        </div>
      </div>

      {/* Upload stage is shown even before stage data exists */}
      {stage.key === "upload" && (
        <>
          <UploadStagePanel
            uploadedFiles={uploadedFiles}
            onFilesReady={onFilesReady}
            status={status}
          />
          {data && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(data.metrics || []).map((m, i) => <MetricCard key={i} {...m} />)}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal size={11} /> Upload Logs
                </p>
                <LogConsole logs={data.logs || []} />
              </div>
            </>
          )}
        </>
      )}

      {/* Loading state — not shown for upload (UI-driven) */}
      {isLoading && stage.key !== "upload" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={32} className="text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Claude is processing this stage…</p>
          <p className="text-xs text-slate-600 font-mono">stage: {stage.key}</p>
        </div>
      )}

      {/* Pending state — not shown for upload */}
      {!isLoading && !data && status === "pending" && stage.key !== "upload" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Clock size={28} className="text-slate-600" />
          <p className="text-sm text-slate-500">Waiting for pipeline to reach this stage.</p>
          <p className="text-xs text-slate-600">Use Run Pipeline or Step to advance.</p>
        </div>
      )}

      {/* Data available — skip for upload which has its own UI */}
      {!isLoading && data && stage.key !== "upload" && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(data.metrics || []).map((m, i) => <MetricCard key={i} {...m} />)}
          </div>

          {/* Stage-specific content */}
          {stage.key === "upload" && (
            <UploadStagePanel
              uploadedFiles={uploadedFiles}
              onFilesReady={onFilesReady}
              status={status}
            />
          )}

          {stage.key === "parsing" && data.structure && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Document Structure</p>
              <div className="space-y-1">
                {data.structure.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/40 rounded">
                    <span className="text-xs font-mono w-10 text-slate-400">{s.type}</span>
                    <span className="text-xs font-semibold text-white w-6">{s.count}</span>
                    <span className="text-xs text-slate-500 truncate">{s.sample}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "kb" && data.hierarchy && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Hierarchy Structure</p>
              <div className="space-y-1.5">
                {data.hierarchy.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-slate-800/40 rounded">
                    <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ marginLeft: i * 8, background: col.dot }} />
                    <div>
                      <p className="text-xs font-medium text-white">{h.level} <span className="text-slate-400">({h.entries})</span></p>
                      <p className="text-xs text-slate-500">{h.example}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "embedding" && data.chunks && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Sample Chunks</p>
              <div className="space-y-1.5">
                {data.chunks.map((c, i) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-slate-400">{c.id}</span>
                      <span className="text-xs text-slate-500">{c.tokens} tokens · {c.dim}d</span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "retrieval" && data.queries && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Query Performance</p>
              <div className="space-y-1.5">
                {data.queries.map((q, i) => (
                  <div key={i} className="bg-slate-800/40 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs text-white flex-1">{q.query}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${q.status === "pass" ? "bg-emerald-900/50 text-emerald-400" : "bg-amber-900/50 text-amber-400"}`}>{q.status}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span>Top-{q.topK}</span>
                      <span>{q.latency}</span>
                      <span>Relevance: <span className="text-slate-300">{q.relevance}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "qgen" && data.questions && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Generated Questions</p>
              <div className="space-y-1.5">
                {data.questions.map((q, i) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{q.id}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${q.diff === "easy" ? "bg-emerald-900/40 text-emerald-400" : q.diff === "medium" ? "bg-amber-900/40 text-amber-400" : "bg-red-900/40 text-red-400"}`}>{q.diff}</span>
                    </div>
                    <p className="text-xs text-white mb-1">{q.text}</p>
                    <p className="text-xs text-slate-500">Intent: {q.intent}</p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(q.mustInclude || []).map((kw, j) => <span key={j} className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">{kw}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "rubric" && data.channels && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Rubric Channels</p>
              <div className="space-y-2">
                {data.channels.map((ch, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-white capitalize">{ch.name.replace(/_/g, " ")}</span>
                      <span className="text-xs text-slate-400">{Math.round(ch.weight * 100)}%</span>
                    </div>
                    <ScoreBar value={ch.weight} color={col.dot} />
                    <p className="text-xs text-slate-500 mt-0.5">{ch.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "interview" && data.transcript && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Interview Transcript</p>
              <div className="space-y-2">
                {data.transcript.map((t, i) => (
                  <div key={i} className={`rounded-lg p-2.5 ${t.role === "agent" ? "bg-blue-900/20 border border-blue-800/30" : "bg-slate-800/50 border border-slate-700/30"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-medium capitalize" style={{ color: t.role === "agent" ? "#60a5fa" : "#94a3b8" }}>
                        {t.role === "agent" ? "🤖 AI Interviewer" : "👤 Candidate"}
                      </span>
                      {t.qid && <span className="text-xs font-mono text-slate-500">[{t.qid}]</span>}
                      {t.score && <span className="text-xs text-emerald-400 ml-auto">score: {t.score}</span>}
                    </div>
                    <p className="text-xs text-slate-200">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "eval" && data.scores && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Channel Scores by Question</p>
              <div className="space-y-2">
                {data.scores.map((s, i) => (
                  <div key={i} className="bg-slate-800/40 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-medium text-white">{s.qid}</span>
                      <span className="text-xs font-semibold text-emerald-400">Final: {s.final}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {[["Semantic", s.semantic], ["Intent", s.intent], ["Keyword", s.keyword], ["Reasoning", s.reasoning], ["Runtime", s.runtime], ["Edge Case", s.edge]].map(([k, v]) => (
                        <div key={k}>
                          <div className="flex justify-between text-xs text-slate-500 mb-0.5"><span>{k}</span></div>
                          <ScoreBar value={v} color={v >= 0.80 ? "#10b981" : v >= 0.65 ? "#f59e0b" : "#ef4444"} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "scoring" && data.breakdown && (
            <div className="mb-4">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 mb-3">
                <p className="text-xs text-slate-400 mb-1">Scoring Formula</p>
                <p className="text-xs font-mono text-emerald-300 leading-relaxed">{data.formula}</p>
              </div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Score Breakdown</p>
              <div className="space-y-1.5">
                {data.breakdown.map((b, i) => (
                  <div key={i} className="bg-slate-800/40 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-white">{b.category}</span>
                      <span className="text-xs font-semibold" style={{ color: col.dot }}>{b.weighted.toFixed(2)}</span>
                    </div>
                    <ScoreBar value={b.weighted} color={col.dot} />
                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                      <span>{b.questions} questions</span>
                      <span>Raw: {b.raw.toFixed(2)}</span>
                      <span>{b.difficulty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.key === "analytics" && data.radar && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 text-center">Channel Radar</p>
                  <RadarChart data={data.radar} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Bar Scores</p>
                  <div className="space-y-1.5 mt-1">
                    {data.radar.map((r, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-400">{r.label}</span>
                          <span className="text-slate-300">{Math.round(r.score * 100)}%</span>
                        </div>
                        <ScoreBar value={r.score} color={r.score >= 0.85 ? "#6366f1" : r.score >= 0.75 ? "#8b5cf6" : "#a78bfa"} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {data.strengths && (
                <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-lg p-3 mb-2">
                  <p className="text-xs font-medium text-emerald-400 mb-1.5">Strengths</p>
                  {data.strengths.map((s, i) => <p key={i} className="text-xs text-emerald-300 flex gap-1.5 mb-0.5"><CheckCircle2 size={11} className="shrink-0 mt-0.5" />{s}</p>)}
                </div>
              )}
              {data.weaknesses && (
                <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 mb-2">
                  <p className="text-xs font-medium text-amber-400 mb-1.5">Improvement Areas</p>
                  {data.weaknesses.map((w, i) => <p key={i} className="text-xs text-amber-300 flex gap-1.5 mb-0.5"><AlertTriangle size={11} className="shrink-0 mt-0.5" />{w}</p>)}
                </div>
              )}
              {data.recommendation && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-300 mb-1">Hiring Recommendation</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{data.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Logs */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Terminal size={11} /> Pipeline Logs
            </p>
            <LogConsole logs={data.logs || []} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function RAGEvalDashboard() {
  const [statuses, setStatuses]         = useState(() => Object.fromEntries(PIPELINE_SEQUENCE.map(k => [k, "pending"])));
  const [stageDataMap, setStageDataMap] = useState({});
  const [loadingStages, setLoadingStages] = useState({});
  const [activeStage, setActiveStage]   = useState(STAGES[0]);
  const [isRunning, setIsRunning]       = useState(false);
  const [currentStep, setCurrentStep]   = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const abortRef    = useRef(false);
  const uploadResolveRef = useRef(null); // resolves when upload is complete

  const setStatus = useCallback((key, val) => setStatuses(s => ({ ...s, [key]: val })), []);

  // Called by UploadStagePanel when all files are verified
  const handleFilesReady = useCallback((files) => {
    setUploadedFiles(files);
    // Build synthetic upload stage data from real files
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const ts = (offsetMs) => {
      const d = new Date(now.getTime() + offsetMs);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,"0")}`;
    };
    const totalSize = (files.reduce((s, f) => s + (f.rawSize || 0), 0) / (1024*1024)).toFixed(2);
    const uploadData = {
      metrics: [
        { label: "Files Uploaded", value: String(files.length), unit: "docs" },
        { label: "Total Size",     value: totalSize,             unit: "MB"   },
        { label: "Integrity",      value: "100%",                unit: ""     },
        { label: "Upload Time",    value: (files.length * 0.4 + 0.5).toFixed(1), unit: "s" }
      ],
      files: files.map(f => ({ name: f.name, size: f.size, pages: "—", status: f.status, hash: f.hash })),
      logs: [
        { time: ts(0),   level: "INFO",    msg: `Upload session initiated — session_id: eval_${Date.now()}` },
        ...files.map((f, i) => ({ time: ts((i+1)*200), level: "INFO", msg: `${f.name} — SHA-256 hash verified — ${f.size}` })),
        { time: ts(files.length*200 + 300), level: "SUCCESS", msg: `All ${files.length} files queued for parsing pipeline` }
      ]
    };
    setStageDataMap(m => ({ ...m, upload: uploadData }));
    setStatus("upload", "success");
    // Unblock the pipeline if it's waiting
    if (uploadResolveRef.current) {
      uploadResolveRef.current();
      uploadResolveRef.current = null;
    }
  }, [setStatus]);

  // Run a single stage: upload is UI-driven; all others call Claude API
  const runStage = useCallback(async (key) => {
    setStatus(key, "processing");

    if (key === "upload") {
      // If files already uploaded, resolve immediately
      if (uploadedFiles.length > 0) {
        setStatus(key, "success");
        return;
      }
      // Otherwise wait for the user to drop files — resolved by handleFilesReady
      setActiveStage(STAGES[0]);
      await new Promise(resolve => { uploadResolveRef.current = resolve; });
      return;
    }

    setLoadingStages(l => ({ ...l, [key]: true }));
    try {
      const data = await callClaudeStage(key);
      setStageDataMap(m => ({ ...m, [key]: data }));
      setStatus(key, "success");
    } catch (err) {
      console.error(`Stage ${key} failed:`, err);
      setStatus(key, "failed");
    } finally {
      setLoadingStages(l => ({ ...l, [key]: false }));
    }
  }, [setStatus, uploadedFiles]);

  // Run the full pipeline sequentially
  const runPipeline = useCallback(async () => {
    if (isRunning) return;
    abortRef.current = false;
    setIsRunning(true);
    setCurrentStep(0);
    setStatuses(Object.fromEntries(PIPELINE_SEQUENCE.map(k => [k, "pending"])));
    setStageDataMap({});
    setUploadedFiles([]);

    for (let i = 0; i < PIPELINE_SEQUENCE.length; i++) {
      if (abortRef.current) break;
      const key = PIPELINE_SEQUENCE[i];
      setCurrentStep(i + 1);
      setActiveStage(STAGES[i]);
      await runStage(key);
      if (abortRef.current) break;
    }
    setIsRunning(false);
  }, [isRunning, runStage]);

  // Step: run the next pending stage
  const stepPipeline = useCallback(async () => {
    if (isRunning) return;
    const nextIdx = PIPELINE_SEQUENCE.findIndex(k => statuses[k] === "pending");
    if (nextIdx === -1) return;
    const key = PIPELINE_SEQUENCE[nextIdx];
    setCurrentStep(nextIdx + 1);
    setActiveStage(STAGES[nextIdx]);
    await runStage(key);
  }, [isRunning, statuses, runStage]);

  const resetPipeline = useCallback(() => {
    abortRef.current = true;
    // Cancel any waiting upload promise
    if (uploadResolveRef.current) { uploadResolveRef.current(); uploadResolveRef.current = null; }
    setIsRunning(false);
    setCurrentStep(0);
    setStatuses(Object.fromEntries(PIPELINE_SEQUENCE.map(k => [k, "pending"])));
    setStageDataMap({});
    setLoadingStages({});
    setUploadedFiles([]);
    setActiveStage(STAGES[0]);
  }, []);

  useEffect(() => () => { abortRef.current = true; }, []);

  const completedCount = Object.values(statuses).filter(s => s === "success").length;
  const processingKey  = Object.entries(statuses).find(([, v]) => v === "processing")?.[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col"
      style={{ fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>

      {/* ── Header ── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
            <Cpu size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">RAG Eval · Assessment Lifecycle</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Enterprise LLMOps v3.0 · Live Claude API</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
            <div className="relative w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / 11) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-300">{completedCount}/11</span>
          </div>
          <button onClick={runPipeline} disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-all">
            <Play size={12} /> Run Pipeline
          </button>
          <button onClick={stepPipeline} disabled={isRunning || completedCount === 11}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-all">
            <SkipForward size={12} /> Step
          </button>
          <button onClick={resetPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all">
            <RefreshCw size={12} /> Reset
          </button>
        </div>
      </header>

      {/* ── Summary Bar ── */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-2 flex gap-4 overflow-x-auto">
        {[
          { icon: FileText,   label: "Documents",       value: "3",             color: "text-teal-400" },
          { icon: Activity,   label: "Avg Latency",     value: "42ms",          color: "text-blue-400" },
          { icon: TrendingUp, label: "Success Rate",    value: completedCount === 0 ? "0%" : `${Math.round((completedCount / 11) * 100)}%`, color: "text-emerald-400" },
          { icon: Loader2,    label: "Active Pipelines",value: isRunning ? 1 : 0, color: "text-amber-400" },
          { icon: Hash,       label: "Stage",           value: processingKey ? `${PIPELINE_SEQUENCE.indexOf(processingKey) + 1}/11` : completedCount === 11 ? "Complete" : "—", color: "text-purple-400" },
          { icon: Award,      label: "Candidate",       value: "CAND_001",      color: "text-rose-400" },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <m.icon size={13} className={m.color + (m.label === "Active Pipelines" && isRunning ? " animate-spin" : "")} />
            <span className="text-xs text-slate-500">{m.label}</span>
            <span className={`text-xs font-semibold ${m.color}`}>{m.value}</span>
            {i < 5 && <div className="w-px h-3 bg-slate-700 ml-2" />}
          </div>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/40 overflow-y-auto shrink-0"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
          <div className="px-3 py-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Pipeline Stages</p>
            <div className="relative">
              <div className="absolute left-4 top-5 bottom-5 w-px bg-slate-800" />
              {STAGES.map((stage, i) => {
                const status  = statuses[stage.key];
                const col     = COLOR_MAP[stage.color];
                const isActive = activeStage.key === stage.key;
                const StageIcon = stage.icon;
                return (
                  <div key={stage.key} className="relative mb-1">
                    <button
                      onClick={() => setActiveStage(stage)}
                      className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all duration-200 group
                        ${isActive ? "bg-slate-800 border border-slate-600/60" : "hover:bg-slate-800/50 border border-transparent"}`}>
                      <div className="relative z-10 mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center">
                        <StatusDot status={status} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <StageIcon size={11} style={{ color: isActive ? col.dot : "#64748b" }} className="shrink-0" />
                          <span className={`text-xs font-medium leading-none truncate ${isActive ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                            {stage.label}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 shrink-0 mt-0.5">{i + 1}</span>
                    </button>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r" style={{ background: col.dot }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Inspector */}
        <main className="flex-1 overflow-hidden bg-slate-950 p-4">
          <InspectorPanel
            stage={activeStage}
            status={statuses[activeStage.key]}
            stageData={stageDataMap[activeStage.key] || null}
            isLoading={!!loadingStages[activeStage.key]}
            uploadedFiles={uploadedFiles}
            onFilesReady={handleFilesReady}
          />
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 bg-slate-900/50 px-4 py-1.5 flex items-center gap-3 text-xs text-slate-500">
        <span className="font-mono">session: eval_20240118_1432</span>
        <span>·</span>
        <span>schema: v3.0</span>
        <span>·</span>
        <span>model: claude-sonnet-4-20250514</span>
        <span>·</span>
        <span className="text-indigo-400 font-medium">● Live API</span>
        <div className="ml-auto flex items-center gap-3">
          {isRunning && statuses["upload"] === "processing" && (
            <span className="flex items-center gap-1.5 text-teal-400">
              <Upload size={11} className="animate-bounce" />
              Waiting for file upload…
            </span>
          )}
          {isRunning && statuses["upload"] !== "processing" && (
            <span className="flex items-center gap-1.5 text-blue-400">
              <Loader2 size={11} className="animate-spin" />
              Pipeline running…
            </span>
          )}
          {completedCount === 11 && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={11} />
              All 11 stages complete
            </span>
          )}
          <span className="font-mono">{new Date().toISOString().slice(0, 19).replace("T", " ")} UTC</span>
        </div>
      </footer>
    </div>
  );
}
