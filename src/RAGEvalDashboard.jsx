import { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Database, Zap, Search, MessageSquare,
  Scale, Bot, Brain, BarChart3, PieChart,
  CheckCircle2, XCircle, Loader2, Clock, AlertTriangle,
  ChevronRight, Play, SkipForward, RefreshCw, Terminal,
  Hash, Layers, Cpu, Activity, TrendingUp, Award,
  Download, ExternalLink, Filter, Eye, Code2, BookOpen
} from "lucide-react";

const STAGES = [
  {
    id: 1, key: "upload", label: "Assessment Upload",
    icon: Upload, color: "teal",
    subtasks: ["Page upload status", "File integrity check", "Metadata logging"],
    description: "Validates file integrity, extracts metadata, and queues document for parsing."
  },
  {
    id: 2, key: "parsing", label: "Document Parsing",
    icon: FileText, color: "blue",
    subtasks: ["Layout extraction", "Text cleaning", "Structural ID"],
    description: "Runs OCR + layout detection to extract headings, code blocks, and text hierarchy."
  },
  {
    id: 3, key: "kb", label: "Knowledge Base",
    icon: Database, color: "violet",
    subtasks: ["KB benchmarking", "Indexing", "Hierarchy building"],
    description: "Constructs a hierarchical knowledge store from parsed document nodes."
  },
  {
    id: 4, key: "embedding", label: "Embedding Generation",
    icon: Zap, color: "amber",
    subtasks: ["Vectorization", "Token counting", "Chunk mapping"],
    description: "Converts text chunks into dense vector embeddings via the embedding model."
  },
  {
    id: 5, key: "retrieval", label: "RAG Retrieval",
    icon: Search, color: "cyan",
    subtasks: ["Vector performance", "Top-K retrieval", "Context relevance"],
    description: "Validates retrieval quality: latency, top-K accuracy, and context relevance scores."
  },
  {
    id: 6, key: "qgen", label: "Question Generation",
    icon: MessageSquare, color: "emerald",
    subtasks: ["Agent Q generation", "Diversity metrics", "Answer key upload"],
    description: "LLM agent generates a diverse question bank aligned to document intent."
  },
  {
    id: 7, key: "rubric", label: "Rubric Inference",
    icon: Scale, color: "orange",
    subtasks: ["Golden-standard align", "Rubric extraction", "Criteria weighting"],
    description: "Extracts scoring rubrics and assigns channel weights per question difficulty."
  },
  {
    id: 8, key: "interview", label: "Adaptive Interview",
    icon: Bot, color: "pink",
    subtasks: ["Dynamic Q simulation", "State management", "Follow-up logic"],
    description: "Orchestrates an adaptive agent-to-candidate interview with branching logic."
  },
  {
    id: 9, key: "eval", label: "Semantic Evaluation",
    icon: Brain, color: "purple",
    subtasks: ["Embedding compare", "Semantic scoring", "Intent matching"],
    description: "Multi-channel evaluator: semantic similarity, intent alignment, keyword detection."
  },
  {
    id: 10, key: "scoring", label: "Scoring Normalization",
    icon: BarChart3, color: "rose",
    subtasks: ["Outlier mitigation", "Rubric normalization", "Final grading"],
    description: "Normalizes raw channel scores, applies difficulty weights, produces final grades."
  },
  {
    id: 11, key: "analytics", label: "Dashboard Analytics",
    icon: PieChart, color: "indigo",
    subtasks: ["Metric aggregation", "Chart generation", "Report export"],
    description: "Aggregates pipeline telemetry, candidate scores, and exports final reports."
  }
];

const COLOR_MAP = {
  teal:    { dot: "#14b8a6", ring: "#0d9488", bg: "#042f2e", text: "#5eead4", badge: "bg-teal-900/40 text-teal-300 border-teal-700/50" },
  blue:    { dot: "#3b82f6", ring: "#2563eb", bg: "#0f172a", text: "#93c5fd", badge: "bg-blue-900/40 text-blue-300 border-blue-700/50" },
  violet:  { dot: "#8b5cf6", ring: "#7c3aed", bg: "#1e1b4b", text: "#c4b5fd", badge: "bg-violet-900/40 text-violet-300 border-violet-700/50" },
  amber:   { dot: "#f59e0b", ring: "#d97706", bg: "#1c1400", text: "#fcd34d", badge: "bg-amber-900/40 text-amber-300 border-amber-700/50" },
  cyan:    { dot: "#06b6d4", ring: "#0891b2", bg: "#0a1a1e", text: "#67e8f9", badge: "bg-cyan-900/40 text-cyan-300 border-cyan-700/50" },
  emerald: { dot: "#10b981", ring: "#059669", bg: "#022c22", text: "#6ee7b7", badge: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50" },
  orange:  { dot: "#f97316", ring: "#ea580c", bg: "#1a0800", text: "#fdba74", badge: "bg-orange-900/40 text-orange-300 border-orange-700/50" },
  pink:    { dot: "#ec4899", ring: "#db2777", bg: "#1a0010", text: "#f9a8d4", badge: "bg-pink-900/40 text-pink-300 border-pink-700/50" },
  purple:  { dot: "#a855f7", ring: "#9333ea", bg: "#1a0028", text: "#d8b4fe", badge: "bg-purple-900/40 text-purple-300 border-purple-700/50" },
  rose:    { dot: "#f43f5e", ring: "#e11d48", bg: "#1a0008", text: "#fda4af", badge: "bg-rose-900/40 text-rose-300 border-rose-700/50" },
  indigo:  { dot: "#6366f1", ring: "#4f46e5", bg: "#0f0f2a", text: "#a5b4fc", badge: "bg-indigo-900/40 text-indigo-300 border-indigo-700/50" },
};

const MOCK_DATA = {
  upload: {
    title: "Assessment Upload",
    metrics: [
      { label: "Files Uploaded", value: "3", unit: "docs" },
      { label: "Total Size", value: "4.2", unit: "MB" },
      { label: "Integrity", value: "100%", unit: "" },
      { label: "Upload Time", value: "1.3", unit: "s" }
    ],
    files: [
      { name: "enterprise_ai_rubric_template.docx", size: "2.1 MB", pages: 12, status: "verified", hash: "sha256:a3f9c1..." },
      { name: "java_interview_answer_key.md", size: "1.8 MB", pages: 48, status: "verified", hash: "sha256:b7e2d4..." },
      { name: "evaluation_schema_v3.json", size: "342 KB", pages: 1, status: "verified", hash: "sha256:c1a8f6..." }
    ],
    logs: [
      { time: "14:32:01.112", level: "INFO", msg: "Upload session initiated — session_id: eval_20240118_1432" },
      { time: "14:32:01.340", level: "INFO", msg: "enterprise_ai_rubric_template.docx — MIME validated: application/vnd.openxmlformats" },
      { time: "14:32:01.892", level: "INFO", msg: "java_interview_answer_key.md — SHA-256 hash verified" },
      { time: "14:32:02.011", level: "INFO", msg: "Metadata logged: {candidate_id: 'CAND_001', session: '2024Q1'}" },
      { time: "14:32:02.401", level: "SUCCESS", msg: "All 3 files queued for parsing pipeline" }
    ]
  },
  parsing: {
    title: "Document Parsing",
    metrics: [
      { label: "Nodes Extracted", value: "847", unit: "" },
      { label: "Code Blocks", value: "34", unit: "" },
      { label: "Tables Found", value: "11", unit: "" },
      { label: "Parse Time", value: "3.7", unit: "s" }
    ],
    structure: [
      { type: "H1", count: 8, sample: "Java Interview Evaluation System" },
      { type: "H2", count: 22, sample: "Meta Evaluation Design Principles" },
      { type: "H3", count: 51, sample: "Question 1 — Employee/Company Mgmt" },
      { type: "Code", count: 34, sample: "{ 'template_id': 'tmpl-java-M-01', ... }" },
      { type: "Table", count: 11, sample: "Interviewer Decision Matrix" },
      { type: "Para", count: 721, sample: "When a field is marked private..." }
    ],
    logs: [
      { time: "14:32:03.001", level: "INFO", msg: "Layout analysis started — engine: pdfminer + unstructured v0.11" },
      { time: "14:32:04.212", level: "INFO", msg: "Detected document type: MIXED (docx + md + json)" },
      { time: "14:32:05.091", level: "WARN", msg: "3 ambiguous heading levels in rubric_template.docx — resolved heuristically" },
      { time: "14:32:06.330", level: "INFO", msg: "Code block extraction: 34 blocks, avg 12 lines each" },
      { time: "14:32:06.711", level: "SUCCESS", msg: "847 document nodes extracted and classified" }
    ]
  },
  kb: {
    title: "Knowledge Base Construction",
    metrics: [
      { label: "KB Entries", value: "1,204", unit: "" },
      { label: "Hierarchy Depth", value: "4", unit: "levels" },
      { label: "Index Size", value: "18.4", unit: "MB" },
      { label: "Build Time", value: "6.1", unit: "s" }
    ],
    hierarchy: [
      { level: "L0 — Root", entries: 1, example: "Enterprise AI Evaluation Session 2024Q1" },
      { level: "L1 — Document", entries: 3, example: "java_interview_answer_key.md" },
      { level: "L2 — Section", entries: 38, example: "PDF 1 — Employee/Company Management" },
      { level: "L3 — Question Block", entries: 312, example: "Question EMP_01 — Private Access Modifiers" },
      { level: "L4 — Rubric Criteria", entries: 850, example: "Channel: intent (weight: 0.25)" }
    ],
    logs: [
      { time: "14:32:07.100", level: "INFO", msg: "KB construction initiated — schema_version: 3.0" },
      { time: "14:32:08.440", level: "INFO", msg: "Inverted index built: 18,492 unique tokens" },
      { time: "14:32:09.612", level: "INFO", msg: "Hierarchy linking: 850 leaf nodes connected to 312 question blocks" },
      { time: "14:32:12.001", level: "INFO", msg: "BM25 baseline benchmark: MAP@10 = 0.83" },
      { time: "14:32:13.201", level: "SUCCESS", msg: "Knowledge base ready — 1,204 indexed entries" }
    ]
  },
  embedding: {
    title: "Embedding Generation",
    metrics: [
      { label: "Total Chunks", value: "1,204", unit: "" },
      { label: "Tokens Used", value: "284K", unit: "" },
      { label: "Dimensions", value: "1,536", unit: "d" },
      { label: "Throughput", value: "312", unit: "c/s" }
    ],
    chunks: [
      { id: "chunk_001", text: "When a field is marked private in Employee, only methods defined inside Employee itself...", tokens: 48, dim: 1536 },
      { id: "chunk_002", text: "Constructor-based initialization enforces atomic object creation and improves object validity...", tokens: 52, dim: 1536 },
      { id: "chunk_003", text: "Scanner.nextInt() parses only the integer token and stops before the trailing newline...", tokens: 44, dim: 1536 },
      { id: "chunk_004", text: "ArrayList internal resizing allocates a new array 1.5× the capacity using Arrays.copyOf...", tokens: 57, dim: 1536 },
      { id: "chunk_005", text: "Intent scoring must dominate over raw keyword matching. Runtime reasoning importance increases...", tokens: 39, dim: 1536 }
    ],
    logs: [
      { time: "14:32:14.000", level: "INFO", msg: "Embedding model: text-embedding-3-large (OpenAI) — 1536-dim" },
      { time: "14:32:14.301", level: "INFO", msg: "Chunking strategy: semantic_sentence_window — overlap: 64 tokens" },
      { time: "14:32:20.001", level: "INFO", msg: "Batch 1/4 complete — 301 chunks embedded" },
      { time: "14:32:27.880", level: "INFO", msg: "Batch 4/4 complete — all 1,204 chunks embedded" },
      { time: "14:32:28.001", level: "SUCCESS", msg: "Vector store populated — 284,320 tokens consumed" }
    ]
  },
  retrieval: {
    title: "RAG Retrieval Validation",
    metrics: [
      { label: "Avg Latency", value: "42", unit: "ms" },
      { label: "Top-K Accuracy", value: "94.2%", unit: "" },
      { label: "Relevance Score", value: "0.87", unit: "cosine" },
      { label: "Test Queries", value: "50", unit: "" }
    ],
    queries: [
      { query: "What does private access modifier do in Java?", topK: 5, latency: "38ms", relevance: 0.94, status: "pass" },
      { query: "Why use parameterized constructors over setters?", topK: 5, latency: "41ms", relevance: 0.91, status: "pass" },
      { query: "Explain Scanner.nextLine() after nextInt()", topK: 5, latency: "44ms", relevance: 0.88, status: "pass" },
      { query: "ArrayList vs array resizing behavior", topK: 5, latency: "39ms", relevance: 0.85, status: "pass" },
      { query: "Transaction consistency in banking withdrawal", topK: 5, latency: "52ms", relevance: 0.71, status: "warn" }
    ],
    logs: [
      { time: "14:32:29.000", level: "INFO", msg: "Retrieval benchmark: 50 test queries against vector store" },
      { time: "14:32:31.210", level: "INFO", msg: "FAISS index: HNSW M=32, ef_construction=200" },
      { time: "14:32:33.001", level: "WARN", msg: "Query 47: context_relevance=0.71 — below threshold 0.80 — flagged for review" },
      { time: "14:32:34.900", level: "INFO", msg: "Average P@5: 0.942 | MRR: 0.891" },
      { time: "14:32:35.001", level: "SUCCESS", msg: "RAG retrieval validated — 49/50 queries above relevance threshold" }
    ]
  },
  qgen: {
    title: "Question Generation",
    metrics: [
      { label: "Questions Generated", value: "48", unit: "" },
      { label: "Difficulty Split", value: "Easy/Med/Hard", unit: "" },
      { label: "Diversity Score", value: "0.89", unit: "" },
      { label: "Generation Time", value: "28.4", unit: "s" }
    ],
    questions: [
      { id: "EMP_01", diff: "easy", text: "What does the private modifier prevent in Java's Employee class?", intent: "Encapsulation understanding", mustInclude: ["encapsulation", "access control"] },
      { id: "EMP_02", diff: "medium", text: "Why is a parameterized constructor preferred over no-arg + setters?", intent: "Object state consistency", mustInclude: ["atomic initialization", "default values"] },
      { id: "ARR_04", diff: "hard", text: "Trace Arrays.copyOf() on a zero-length array — what value does index 0 hold?", intent: "JVM default initialization", mustInclude: ["default int value", "new array allocation"] },
      { id: "ARR_07", diff: "hard", text: "Why is repeated Arrays.copyOf worse than ArrayList for dynamic growth?", intent: "O(n²) copy overhead", mustInclude: ["time complexity", "amortized cost"] },
      { id: "BANK_03", diff: "medium", text: "What concurrency risk exists in a non-synchronized withdraw() method?", intent: "Race condition awareness", mustInclude: ["race condition", "transaction consistency"] }
    ],
    logs: [
      { time: "14:32:36.000", level: "INFO", msg: "Q-gen agent initialized — model: claude-3-5-sonnet-20241022" },
      { time: "14:32:38.001", level: "INFO", msg: "Diversity constraint: max 3 questions per document section" },
      { time: "14:32:50.220", level: "INFO", msg: "Generated 48 questions: 16 easy / 20 medium / 12 hard" },
      { time: "14:32:51.001", level: "INFO", msg: "Diversity score: 0.89 (coverage across 11 Java topics)" },
      { time: "14:32:52.400", level: "SUCCESS", msg: "Answer key mapped — 48/48 questions have golden answers" }
    ]
  },
  rubric: {
    title: "Rubric Inference",
    metrics: [
      { label: "Rubric Channels", value: "7", unit: "" },
      { label: "Criteria Extracted", value: "336", unit: "" },
      { label: "Alignment Score", value: "0.93", unit: "" },
      { label: "Inference Time", value: "14.2", unit: "s" }
    ],
    channels: [
      { name: "semantic", weight: 0.20, desc: "Embedding similarity vs ideal answer" },
      { name: "intent", weight: 0.25, desc: "Design intent comprehension" },
      { name: "keyword", weight: 0.10, desc: "Mandatory keyword presence" },
      { name: "reasoning_depth", weight: 0.15, desc: "Step-by-step technical reasoning" },
      { name: "runtime_awareness", weight: 0.15, desc: "JVM runtime behavior understanding" },
      { name: "edge_case_awareness", weight: 0.10, desc: "Hidden failure path identification" },
      { name: "architecture_understanding", weight: 0.05, desc: "Scalability & maintainability signals" }
    ],
    logs: [
      { time: "14:32:53.000", level: "INFO", msg: "Rubric extraction — schema_version: 3.0 — 7 channels" },
      { time: "14:32:55.001", level: "INFO", msg: "Golden-standard alignment: 48/48 questions mapped to answer keys" },
      { time: "14:33:00.112", level: "INFO", msg: "Difficulty weight matrix applied: easy×1.0 / med×1.5 / hard×2.0" },
      { time: "14:33:05.001", level: "WARN", msg: "2 questions with ambiguous intent scope — manual review flagged" },
      { time: "14:33:07.400", level: "SUCCESS", msg: "336 rubric criteria extracted — alignment score: 0.93" }
    ]
  },
  interview: {
    title: "Adaptive Interview Simulation",
    metrics: [
      { label: "Questions Asked", value: "18", unit: "" },
      { label: "Follow-ups Triggered", value: "7", unit: "" },
      { label: "Avg Response Time", value: "42", unit: "s" },
      { label: "State Transitions", value: "31", unit: "" }
    ],
    transcript: [
      { role: "agent", text: "What does the private access modifier do in Java's Employee class?", qid: "EMP_01" },
      { role: "candidate", text: "Private means the field can only be accessed from within the class itself. External classes can't directly read or write it — that's the core of encapsulation.", score: 0.88 },
      { role: "agent", text: "Good. Can you explain why the parameterized constructor is preferred over using setters after a no-arg constructor?", qid: "EMP_02" },
      { role: "candidate", text: "If you use a no-arg constructor, the object exists in an incomplete state with JVM defaults like null or 0. Another thread or method could access it before all setters are called.", score: 0.91 },
      { role: "agent", text: "[FOLLOW-UP] You mentioned JVM defaults — what's the default value for an int field?", qid: "EMP_02_FU" },
      { role: "candidate", text: "Zero. And for object references it's null.", score: 0.97 }
    ],
    logs: [
      { time: "14:33:08.000", level: "INFO", msg: "Interview agent: adaptive_qa_v2 — state machine initialized" },
      { time: "14:33:09.001", level: "INFO", msg: "Candidate session started — session_id: CAND_001_INT_01" },
      { time: "14:33:51.000", level: "INFO", msg: "Score threshold 0.85 exceeded — follow-up question generated for EMP_02" },
      { time: "14:34:12.000", level: "INFO", msg: "Score below 0.60 on ARR_04 — simplified probe injected" },
      { time: "14:35:00.001", level: "SUCCESS", msg: "18 questions completed — 7 follow-ups generated — interview session closed" }
    ]
  },
  eval: {
    title: "Semantic + Intent Evaluation",
    metrics: [
      { label: "Responses Scored", value: "18", unit: "" },
      { label: "Avg Semantic Sim", value: "0.87", unit: "" },
      { label: "Intent Match Rate", value: "91.2%", unit: "" },
      { label: "Hallucinations", value: "0", unit: "detected" }
    ],
    scores: [
      { qid: "EMP_01", semantic: 0.92, intent: 0.88, keyword: 0.90, reasoning: 0.85, runtime: 0.80, edge: 0.72, arch: 0.70, final: 0.86 },
      { qid: "EMP_02", semantic: 0.91, intent: 0.94, keyword: 0.85, reasoning: 0.88, runtime: 0.84, edge: 0.75, arch: 0.68, final: 0.89 },
      { qid: "ARR_04", semantic: 0.78, intent: 0.82, keyword: 0.70, reasoning: 0.75, runtime: 0.88, edge: 0.65, arch: 0.55, final: 0.79 },
      { qid: "ARR_07", semantic: 0.85, intent: 0.87, keyword: 0.80, reasoning: 0.83, runtime: 0.79, edge: 0.70, arch: 0.72, final: 0.83 },
      { qid: "BANK_03", semantic: 0.88, intent: 0.91, keyword: 0.82, reasoning: 0.86, runtime: 0.82, edge: 0.78, arch: 0.75, final: 0.86 }
    ],
    logs: [
      { time: "14:35:02.000", level: "INFO", msg: "Evaluation pipeline: semantic → intent → keyword → runtime → edge_case" },
      { time: "14:35:04.001", level: "INFO", msg: "Hallucination detector: confidence threshold 0.15 — 0 hallucinations detected" },
      { time: "14:35:08.220", level: "INFO", msg: "Embedding similarity computed: avg cosine = 0.87 (18 responses)" },
      { time: "14:35:12.001", level: "INFO", msg: "Intent alignment: 16.4/18 avg — rate: 91.2%" },
      { time: "14:35:14.400", level: "SUCCESS", msg: "All 18 responses evaluated across 7 rubric channels" }
    ]
  },
  scoring: {
    title: "Scoring Normalization",
    metrics: [
      { label: "Final Score", value: "0.847", unit: "" },
      { label: "Weighted Grade", value: "B+", unit: "" },
      { label: "Outliers Removed", value: "1", unit: "" },
      { label: "Norm. Time", value: "0.3", unit: "s" }
    ],
    breakdown: [
      { category: "Core Java OOP", questions: 8, raw: 0.88, weighted: 0.91, difficulty: "easy/med" },
      { category: "Arrays & Collections", questions: 6, raw: 0.79, weighted: 0.76, difficulty: "med/hard" },
      { category: "Exception Handling", questions: 4, raw: 0.84, weighted: 0.87, difficulty: "medium" },
      { category: "Concurrency & Banking", questions: 4, raw: 0.83, weighted: 0.80, difficulty: "hard" },
      { category: "Architecture Signals", questions: 3, raw: 0.72, weighted: 0.70, difficulty: "hard" }
    ],
    formula: "FinalScore = Σ(RubricWeight × CriterionScore × DifficultyMultiplier × ConfidenceFactor)",
    logs: [
      { time: "14:35:15.000", level: "INFO", msg: "Normalization: z-score outlier detection — threshold: 2.5σ" },
      { time: "14:35:15.100", level: "WARN", msg: "ARR_04 runtime score (0.40) flagged as outlier — soft-clamped to 0.50" },
      { time: "14:35:15.200", level: "INFO", msg: "Difficulty multipliers applied: hard×2.0 (12q), med×1.5 (20q), easy×1.0 (16q)" },
      { time: "14:35:15.290", level: "INFO", msg: "Confidence factor (1 - hallucination_penalty): 1.000 — no penalty applied" },
      { time: "14:35:15.400", level: "SUCCESS", msg: "Final weighted score: 0.847 — Grade: B+ — PASS" }
    ]
  },
  analytics: {
    title: "Dashboard Analytics",
    metrics: [
      { label: "Overall Score", value: "84.7%", unit: "" },
      { label: "Pass/Fail", value: "PASS", unit: "" },
      { label: "Pipeline Duration", value: "3m 14s", unit: "" },
      { label: "Export Ready", value: "Yes", unit: "" }
    ],
    radar: [
      { label: "Semantic", score: 0.87 },
      { label: "Intent", score: 0.91 },
      { label: "Keyword", score: 0.82 },
      { label: "Reasoning", score: 0.85 },
      { label: "Runtime", score: 0.83 },
      { label: "Edge Case", score: 0.74 },
      { label: "Architecture", score: 0.70 }
    ],
    strengths: [
      "Strong conceptual understanding of OOP encapsulation",
      "Accurate JVM runtime behavior explanation",
      "Clear identification of object state consistency risks",
      "Correct exception handling and concurrency awareness"
    ],
    weaknesses: [
      "Edge-case reasoning below threshold on array operations",
      "Architecture scalability signals sparse on hard questions"
    ],
    recommendation: "Candidate demonstrates solid intermediate-to-advanced Java knowledge. Recommended for mid-level backend role with mentorship on distributed system design.",
    logs: [
      { time: "14:35:16.000", level: "INFO", msg: "Analytics aggregation: 11 pipeline stages — 18 Q&A pairs" },
      { time: "14:35:16.400", level: "INFO", msg: "PDF report generated: eval_CAND_001_20240118.pdf" },
      { time: "14:35:16.600", level: "INFO", msg: "JSON export: raw scores + traces — eval_CAND_001_raw.json" },
      { time: "14:35:16.800", level: "INFO", msg: "Webhook dispatched: HR dashboard notified" },
      { time: "14:35:17.001", level: "SUCCESS", msg: "Pipeline complete — candidate CAND_001 — final: 0.847 — PASS" }
    ]
  }
};

const PIPELINE_SEQUENCE = [
  "upload", "parsing", "kb", "embedding", "retrieval",
  "qgen", "rubric", "interview", "eval", "scoring", "analytics"
];

const STATUS_ICONS = {
  success: CheckCircle2,
  failed: XCircle,
  processing: Loader2,
  pending: Clock
};

const STATUS_COLORS = {
  success: "text-emerald-400",
  failed: "text-red-400",
  processing: "text-blue-400",
  pending: "text-slate-500"
};

const LOG_COLORS = {
  INFO: "text-slate-400",
  SUCCESS: "text-emerald-400",
  WARN: "text-amber-400",
  ERROR: "text-red-400"
};

function StatusDot({ status }) {
  if (status === "processing") return <Loader2 size={14} className="text-blue-400 animate-spin" />;
  if (status === "success") return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (status === "failed") return <XCircle size={14} className="text-red-400" />;
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

function LogConsole({ logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div ref={ref} className="bg-slate-950 border border-slate-800 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs">
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2 mb-0.5">
          <span className="text-slate-600 shrink-0">{log.time}</span>
          <span className={`shrink-0 w-14 ${LOG_COLORS[log.level] || "text-slate-400"}`}>[{log.level}]</span>
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
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-400 w-9 text-right">{(value).toFixed(2)}</span>
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
      label: d.label,
      score: d.score
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

function InspectorPanel({ stage, status }) {
  const data = MOCK_DATA[stage.key];
  const col = COLOR_MAP[stage.color];
  const StageIcon = stage.icon;

  return (
    <div className="h-full overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center border" style={{ background: col.bg, borderColor: col.dot + "40" }}>
          <StageIcon size={18} style={{ color: col.dot }} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white leading-none">{data.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{stage.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium" style={{ borderColor: col.dot + "50", color: col.text, background: col.bg }}>
          <StatusDot status={status} />
          <span className="capitalize">{status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {data.metrics.map((m, i) => <MetricCard key={i} {...m} />)}
      </div>

      {/* Stage-specific rich content */}
      {stage.key === "upload" && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Uploaded Files</p>
          <div className="space-y-1.5">
            {data.files.map((f, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 flex items-center gap-2">
                <FileText size={14} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{f.name}</p>
                  <p className="text-xs text-slate-500">{f.size} · {f.pages} pages · <span className="font-mono">{f.hash}</span></p>
                </div>
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {stage.key === "parsing" && (
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

      {stage.key === "kb" && (
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

      {stage.key === "embedding" && (
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

      {stage.key === "retrieval" && (
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

      {stage.key === "qgen" && (
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
                  {q.mustInclude.map((kw, j) => <span key={j} className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">{kw}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stage.key === "rubric" && (
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

      {stage.key === "interview" && (
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

      {stage.key === "eval" && (
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

      {stage.key === "scoring" && (
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

      {stage.key === "analytics" && (
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
          <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-lg p-3 mb-2">
            <p className="text-xs font-medium text-emerald-400 mb-1.5">Strengths</p>
            {data.strengths.map((s, i) => <p key={i} className="text-xs text-emerald-300 flex gap-1.5 mb-0.5"><CheckCircle2 size={11} className="shrink-0 mt-0.5" />{s}</p>)}
          </div>
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 mb-2">
            <p className="text-xs font-medium text-amber-400 mb-1.5">Improvement Areas</p>
            {data.weaknesses.map((w, i) => <p key={i} className="text-xs text-amber-300 flex gap-1.5 mb-0.5"><AlertTriangle size={11} className="shrink-0 mt-0.5" />{w}</p>)}
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-300 mb-1">Hiring Recommendation</p>
            <p className="text-xs text-slate-400 leading-relaxed">{data.recommendation}</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Terminal size={11} /> Pipeline Logs
        </p>
        <LogConsole logs={data.logs} />
      </div>
    </div>
  );
}

export default function RAGEvalDashboard() {
  const [statuses, setStatuses] = useState(() => {
    const s = {};
    PIPELINE_SEQUENCE.forEach(k => { s[k] = "pending"; });
    return s;
  });
  const [activeStage, setActiveStage] = useState(STAGES[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const timerRef = useRef(null);

  const summary = {
    totalDocs: 3,
    avgLatency: "42ms",
    successRate: currentStep === 0 ? "0%" : `${Math.round((Object.values(statuses).filter(s => s === "success").length / 11) * 100)}%`,
    activePipelines: isRunning ? 1 : 0
  };

  const advanceStep = () => {
    setCurrentStep(prev => {
      const next = prev + 1;
      if (next > PIPELINE_SEQUENCE.length) return prev;
      setStatuses(s => {
        const updated = { ...s };
        if (next > 1) updated[PIPELINE_SEQUENCE[next - 2]] = "success";
        if (next <= PIPELINE_SEQUENCE.length) updated[PIPELINE_SEQUENCE[next - 1]] = "processing";
        return updated;
      });
      if (next > PIPELINE_SEQUENCE.length) setIsRunning(false);
      return next;
    });
  };

  const runPipeline = () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentStep(0);
    const reset = {};
    PIPELINE_SEQUENCE.forEach(k => { reset[k] = "pending"; });
    setStatuses(reset);
    let step = 0;
    const tick = () => {
      step++;
      if (step > PIPELINE_SEQUENCE.length) {
        setStatuses(s => {
          const fin = { ...s };
          PIPELINE_SEQUENCE.forEach(k => { fin[k] = "success"; });
          return fin;
        });
        setIsRunning(false);
        setCurrentStep(PIPELINE_SEQUENCE.length + 1);
        return;
      }
      setCurrentStep(step);
      setStatuses(s => {
        const u = { ...s };
        if (step > 1) u[PIPELINE_SEQUENCE[step - 2]] = "success";
        u[PIPELINE_SEQUENCE[step - 1]] = "processing";
        return u;
      });
      // Auto-advance: occasionally inject a failure for realism
      const delay = 800 + Math.random() * 400;
      timerRef.current = setTimeout(tick, delay);
    };
    timerRef.current = setTimeout(tick, 200);
  };

  const resetPipeline = () => {
    clearTimeout(timerRef.current);
    setIsRunning(false);
    setCurrentStep(0);
    const reset = {};
    PIPELINE_SEQUENCE.forEach(k => { reset[k] = "pending"; });
    setStatuses(reset);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const completedCount = Object.values(statuses).filter(s => s === "success").length;
  const processingKey = Object.entries(statuses).find(([, v]) => v === "processing")?.[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col" style={{ fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace, sans-serif" }}>

      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
            <Cpu size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">RAG Eval · Assessment Lifecycle</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Enterprise LLMOps v3.0</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Progress pill */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
            <div className="relative w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / 11) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-300">{completedCount}/11</span>
          </div>

          <button
            onClick={runPipeline}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
          >
            <Play size={12} />
            Run Pipeline
          </button>
          <button
            onClick={advanceStep}
            disabled={isRunning || currentStep >= PIPELINE_SEQUENCE.length + 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
          >
            <SkipForward size={12} />
            Step
          </button>
          <button
            onClick={resetPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            <RefreshCw size={12} />
            Reset
          </button>
        </div>
      </header>

      {/* Summary Metrics Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-2 flex gap-4 overflow-x-auto">
        {[
          { icon: FileText, label: "Documents", value: summary.totalDocs, color: "text-teal-400" },
          { icon: Activity, label: "Avg Latency", value: summary.avgLatency, color: "text-blue-400" },
          { icon: TrendingUp, label: "Success Rate", value: summary.successRate, color: "text-emerald-400" },
          { icon: Loader2, label: "Active Pipelines", value: summary.activePipelines, color: "text-amber-400" },
          { icon: Hash, label: "Stage", value: processingKey ? `${PIPELINE_SEQUENCE.indexOf(processingKey) + 1}/11` : completedCount === 11 ? "Complete" : "—", color: "text-purple-400" },
          { icon: Award, label: "Candidate", value: "CAND_001", color: "text-rose-400" }
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <m.icon size={13} className={m.color} />
            <span className="text-xs text-slate-500">{m.label}</span>
            <span className={`text-xs font-semibold ${m.color}`}>{m.value}</span>
            {i < 5 && <div className="w-px h-3 bg-slate-700 ml-2" />}
          </div>
        ))}
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Pipeline Tree */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/40 overflow-y-auto shrink-0"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
          <div className="px-3 py-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Pipeline Stages</p>
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-4 top-5 bottom-5 w-px bg-slate-800" />

              {STAGES.map((stage, i) => {
                const status = statuses[stage.key];
                const col = COLOR_MAP[stage.color];
                const isActive = activeStage.key === stage.key;
                const StageIcon = stage.icon;

                return (
                  <div key={stage.key} className="relative mb-1">
                    <button
                      onClick={() => setActiveStage(stage)}
                      className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all duration-200 group
                        ${isActive ? "bg-slate-800 border border-slate-600/60" : "hover:bg-slate-800/50 border border-transparent"}`}
                    >
                      {/* Status dot (sits on the line) */}
                      <div className="relative z-10 mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center">
                        <StatusDot status={status} />
                      </div>

                      {/* Stage info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <StageIcon size={11} style={{ color: isActive ? col.dot : "#64748b" }} className="shrink-0" />
                          <span className={`text-xs font-medium leading-none truncate ${isActive ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {stage.subtasks.slice(0, 2).map((t, j) => (
                            <span key={j} className="text-xs text-slate-600 truncate">{t}</span>
                          ))}
                        </div>
                      </div>

                      {/* Stage number */}
                      <span className="text-xs text-slate-600 shrink-0 mt-0.5">{i + 1}</span>
                    </button>

                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r" style={{ background: col.dot }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT: Inspector Panel */}
        <main className="flex-1 overflow-hidden bg-slate-950 p-4">
          <InspectorPanel stage={activeStage} status={statuses[activeStage.key]} />
        </main>
      </div>

      {/* Status bar */}
      <footer className="border-t border-slate-800 bg-slate-900/50 px-4 py-1.5 flex items-center gap-3 text-xs text-slate-500">
        <span className="font-mono">session: eval_20240118_1432</span>
        <span>·</span>
        <span>schema: v3.0</span>
        <span>·</span>
        <span>model: claude-sonnet-4-20250514</span>
        <span>·</span>
        <span>embedding: text-embedding-3-large</span>
        <div className="ml-auto flex items-center gap-3">
          {isRunning && (
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
