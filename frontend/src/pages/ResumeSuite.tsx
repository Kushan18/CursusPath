import { useState, useEffect, useRef, type DragEvent } from "react";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Trash2,
  Download,
  Briefcase
} from "lucide-react";
import TrustRing from "../components/TrustRing";
import {
  analyzeResume,
  buildResume,
  getResumeHistory,
  deleteResume,
  ApiError,
  type ResumeAnalysisResult,
  type ResumeHistoryItem,
} from "../lib/api";
import { parseResumeForBuilder, generateContent, saveBuiltResume } from "../lib/builderApi";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ACCEPTED_TYPES = [".pdf", ".png", ".jpg", ".jpeg", ".docx"];

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

function AnalysisDetail({
  summary,
  matchedKeywords,
  missingKeywords,
  formattingIssues,
  structureIssues,
}: {
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  structureIssues: string[];
}) {
  return (
    <div className="flex-1">
      <p className="text-text mb-4">{summary}</p>

      {matchedKeywords.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-teal font-medium mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Matched Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matchedKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-1 bg-teal/10 text-teal rounded text-xs">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {missingKeywords.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-danger font-medium mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Missing Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-1 bg-danger/10 text-danger rounded text-xs">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {formattingIssues.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-danger font-medium mb-1.5">Formatting Issues</p>
          <ul className="space-y-1">
            {formattingIssues.map((issue, i) => (
              <li key={i} className="text-sm text-muted pl-4 relative">
                <span className="absolute left-0 text-danger">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {structureIssues.length > 0 && (
        <div>
          <p className="text-xs text-danger font-medium mb-1.5">Structure Issues</p>
          <ul className="space-y-1">
            {structureIssues.map((issue, i) => (
              <li key={i} className="text-sm text-muted pl-4 relative">
                <span className="absolute left-0 text-danger">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ResumeSuite() {
  const [activeTab, setActiveTab] = useState<"analyzer" | "builder">("analyzer");
  
  // Shared state
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Analyzer state
  const [jdText, setJdText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  
  // Builder state
  const [targetCompany, setTargetCompany] = useState("");
  const [buildMode, setBuildMode] = useState<"direct" | "verify">("direct");
  
  // History state
  const [history, setHistory] = useState<ResumeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadHistory = async () => {
    if (!user) return;
    const cacheKey = `resumeHistoryCache_${user.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setHistory(JSON.parse(cached));
        setHistoryLoading(false);
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    } else {
      setHistoryLoading(true);
    }
    
    try {
      const items = await getResumeHistory();
      setHistory(items);
      localStorage.setItem(cacheKey, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to load resume history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "analyzer" && user) {
      loadHistory();
    }
  }, [activeTab, user]);

  const handleAction = async (mode: "direct" | "verify") => {
    if (!selectedFile) {
      setError("Please select a resume file first.");
      return;
    }
    setError(null);
    setUploading(true);
    setBuildMode(mode);
    setAnalysisResult(null);

    try {
      if (activeTab === "analyzer") {
        const result = await analyzeResume(selectedFile, jdText);
        setAnalysisResult(result);
        await loadHistory();
      } else {
        if (mode === "direct") {
          const pdfBlob = await buildResume(selectedFile, targetCompany, jdText);
          downloadBlob(pdfBlob, "Tailored_Resume.pdf");
        } else {
          // Verify mode: Parse -> Tailor -> Save -> Redirect
          const parsedJson = await parseResumeForBuilder(selectedFile, targetCompany, jdText);

          const saved = await saveBuiltResume({
            resume_name: `Tailored: ${targetCompany || 'New Role'}`,
            target_role: targetCompany,
            job_description: jdText,
            resume_data: parsedJson.resume_data || parsedJson,
            skipped_fields: [],
            template_id: "modern",
            parseability_score: 0,
            job_match_score: 0,
            score_deductions: []
          });

          navigate(`/resume-builder/${saved.id}`);
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const initiateDelete = (id: string) => setConfirmDeleteId(id);

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      await deleteResume(id);
      setHistory((prev) => {
        const newHistory = prev.filter((item) => item.id !== id);
        if (user) {
          localStorage.setItem(`resumeHistoryCache_${user.id}`, JSON.stringify(newHistory));
        }
        return newHistory;
      });
      if (expandedId === id) setExpandedId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete record.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="text-slate-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">Resume Suite</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xl">
          Analyze your resume against an ATS, or let the AI build you a perfectly tailored,
          clean PDF based on a target job description.
        </p>
      </div>

      <div className="flex border-b border-slate-800 mb-6">
        <button
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "analyzer"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
          }`}
          onClick={() => {
            setActiveTab("analyzer");
            setError(null);
            setAnalysisResult(null);
          }}
        >
          ATS Analyzer
        </button>
        <button
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "builder"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
          }`}
          onClick={() => {
            setActiveTab("builder");
            setError(null);
          }}
        >
          Tailored Builder
        </button>
      </div>

      <div className="flex flex-col gap-8">
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors mb-4 ${
              dragActive
                ? "border-cyan-500 bg-cyan-900/20"
                : "border-slate-800 bg-slate-900 hover:border-slate-600"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setError(null);
                }
                e.target.value = "";
              }}
            />
            {selectedFile ? (
              <>
                <FileText className="text-cyan-400 mb-3" size={32} />
                <p className="text-sm text-slate-200 font-medium">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 mt-1">Click or drag to replace</p>
              </>
            ) : (
              <>
                <UploadCloud className="text-slate-500 mb-3" size={32} />
                <p className="text-sm text-slate-200 font-medium">Upload your Resume</p>
                <p className="text-xs text-slate-500 mt-1">PDF, DOCX, JPG, PNG (Max 10MB)</p>
              </>
            )}
          </div>

          {activeTab === "builder" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Target Company (Optional)
              </label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-text mb-1">
              Job Description (Optional but recommended)
            </label>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the target job description here..."
              className="w-full h-32 bg-surface border border-border rounded-lg p-4 text-text text-sm resize-none focus:outline-none focus:border-teal transition-colors"
            />
          </div>

          {activeTab === "analyzer" ? (
            <button
              onClick={() => handleAction("direct")}
              disabled={!selectedFile || uploading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-cyan-500/40"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing ATS Score...
                </>
              ) : (
                "Analyze Resume"
              )}
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleAction("verify")}
                disabled={!selectedFile || uploading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-cyan-500/40"
              >
                {uploading && buildMode === "verify" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Preparing AI Builder...
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Verify & Edit in AI Builder
                  </>
                )}
              </button>
              <button
                onClick={() => handleAction("direct")}
                disabled={!selectedFile || uploading}
                className="flex-1 flex items-center justify-center gap-2 bg-surface text-text border border-border py-3 rounded-xl font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                {uploading && buildMode === "direct" ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-muted" />
                    Building PDF...
                  </>
                ) : (
                  <>
                    <Download size={18} className="text-muted" />
                    Direct Download
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-lg px-4 py-3">
              <AlertTriangle className="text-danger shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
        </div>

        {activeTab === "analyzer" && (
          <div>
            {resultContent()}
          </div>
        )}
      </div>

      {activeTab === "analyzer" && historyContent()}
    </div>
  );

  function resultContent() {
    if (!analysisResult) return null;
    return (
      <div className="bg-surface border border-border rounded-xl p-6 h-full animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-start gap-6 mb-4">
          <TrustRing score={analysisResult.ats_score} sublabel="ATS Score" size={110} />
          <AnalysisDetail
            summary={analysisResult.summary}
            matchedKeywords={analysisResult.matched_keywords}
            missingKeywords={analysisResult.missing_keywords}
            formattingIssues={analysisResult.formatting_issues}
            structureIssues={analysisResult.structure_issues}
          />
        </div>
        <p className="text-[11px] text-muted pt-3 border-t border-border">
          Analyzed by {analysisResult.provider_used === "groq" ? "Groq (fallback)" : "Gemini"}
        </p>
      </div>
    );
  }

  function historyContent() {
    return (
      <div className="mt-12">
        <h2 className="font-display text-lg font-medium text-text mb-4">Past ATS Analyses</h2>
        {historyLoading ? (
          <p className="text-sm text-muted">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">No resumes analyzed yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <TrustRing score={item.ats_score} size={44} strokeWidth={5} />
                    <div className="flex-1">
                      <p className="text-sm text-text font-medium flex items-center gap-1.5">
                        <Briefcase size={14} className="text-muted" />
                        {item.analysis_report.job_description_provided ? "Tailored Analysis" : "General Analysis"}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                        {item.analysis_report.structure_issues.length > 0 &&
                          ` · ${item.analysis_report.structure_issues.length} structural issues`}
                      </p>
                    </div>
                    
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-sm text-danger font-medium mr-1 hidden sm:inline">Sure?</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          className="px-2.5 py-1.5 text-xs font-medium text-text bg-surface border border-border rounded hover:bg-surface-hover"
                        >Cancel</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); confirmDelete(); }}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-danger rounded hover:bg-danger/90"
                        >Delete</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); initiateDelete(item.id); }}
                        disabled={deletingId === item.id}
                        className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-40"
                      >
                        {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                    <ChevronDown size={16} className={`text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-border">
                      <AnalysisDetail
                        summary={item.analysis_report.summary}
                        matchedKeywords={item.analysis_report.matched_keywords}
                        missingKeywords={item.analysis_report.missing_keywords}
                        formattingIssues={item.analysis_report.formatting_issues}
                        structureIssues={item.analysis_report.structure_issues}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
