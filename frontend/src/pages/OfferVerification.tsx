import { useState, useEffect, useRef, type DragEvent } from "react";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  ChevronDown,
  Trash2,
} from "lucide-react";
import TrustRing from "../components/TrustRing";
import {
  verifyOfferLetter,
  getOfferHistory,
  deleteOffer,
  ApiError,
  type OfferAnalysisResult,
  type OfferHistoryItem,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";

const ACCEPTED_TYPES = [".pdf", ".png", ".jpg", ".jpeg"];

function ResultDetail({
  companyName,
  summary,
  redFlags,
  positiveSignals,
  timeline,
}: {
  companyName: string;
  summary: string;
  redFlags: string[];
  positiveSignals: string[];
  timeline: string;
}) {
  return (
    <div className="flex-1">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
        {companyName}
      </p>
      <p className="text-slate-200 mb-3">{summary}</p>

      <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-4">
        <Clock size={13} />
        <span>{timeline}</span>
      </div>

      {redFlags.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-danger font-medium mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Red flags
          </p>
          <ul className="space-y-1">
            {redFlags.map((flag, i) => (
              <li key={i} className="text-sm text-muted pl-4 relative">
                <span className="absolute left-0 text-danger">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {positiveSignals.length > 0 && (
        <div>
          <p className="text-xs text-teal font-medium mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Looks legitimate because
          </p>
          <ul className="space-y-1">
            {positiveSignals.map((signal, i) => (
              <li key={i} className="text-sm text-muted pl-4 relative">
                <span className="absolute left-0 text-teal">•</span>
                {signal}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function OfferVerification() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OfferAnalysisResult | null>(null);
  const [history, setHistory] = useState<OfferHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const loadHistory = async () => {
    if (!user) return;
    const cacheKey = `offerHistoryCache_${user.id}`;
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
      const items = await getOfferHistory();
      setHistory(items);
      localStorage.setItem(cacheKey, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to load offer history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const analysis = await verifyOfferLetter(file);
      setResult(analysis);
      await loadHistory();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Something went wrong analyzing this file.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const initiateDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      await deleteOffer(id);
      setHistory((prev) => {
        const newHistory = prev.filter((item) => item.id !== id);
        if (user) {
          localStorage.setItem(`offerHistoryCache_${user.id}`, JSON.stringify(newHistory));
        }
        return newHistory;
      });
      if (expandedId === id) setExpandedId(null);
    } catch (e) {
      console.error("Failed to delete offer:", e);
      setError(
        e instanceof ApiError ? e.message : "Could not delete this record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="text-slate-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
          Offer Verification
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xl">
          Upload an offer letter (PDF, JPG, or PNG). We'll extract the text and
          check it for red flags — trust score included.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
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
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="animate-spin text-cyan-400 mb-3" size={32} />
            <p className="text-sm text-slate-200 font-medium">
              Extracting text and analyzing…
            </p>
            <p className="text-xs text-slate-500 mt-1">
              This can take 5–15 seconds
            </p>
          </>
        ) : (
          <>
            <UploadCloud className="text-slate-500 mb-3" size={32} />
            <p className="text-sm text-slate-200 font-medium">
              Drag & drop your offer letter, or click to browse
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PDF, JPG, or PNG — up to 10MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-start gap-6">
            <TrustRing
              score={result.trust_score}
              sublabel="Trust score"
              size={110}
            />
            <ResultDetail
              companyName={result.company_name}
              summary={result.summary}
              redFlags={result.red_flags}
              positiveSignals={result.positive_signals}
              timeline={result.estimated_joining_timeline}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-800">
            Analyzed by {result.provider_used === "groq" ? "Groq (fallback)" : "Gemini"}
          </p>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">
          Past verifications
        </h2>
        {historyLoading ? (
          <p className="text-sm text-slate-500">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500">
            No offer letters verified yet. Upload one above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : item.id)
                    }
                  >
                    <TrustRing
                      score={item.trust_score}
                      size={44}
                      strokeWidth={5}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-slate-200 font-medium flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-500" />
                        {item.company_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString(
                          undefined,
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                        {item.red_flags.length > 0 &&
                          ` · ${item.red_flags.length} red flag${
                            item.red_flags.length === 1 ? "" : "s"
                          }`}
                      </p>
                    </div>
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-sm text-red-500 font-medium mr-1 hidden sm:inline">Sure?</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete();
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateDelete(item.id);
                        }}
                        disabled={deletingId === item.id}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                        title="Delete this record"
                      >
                        {deletingId === item.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-slate-500 shrink-0 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800">
                      <ResultDetail
                        companyName={item.company_name}
                        summary={item.summary}
                        redFlags={item.red_flags}
                        positiveSignals={item.positive_signals}
                        timeline={item.estimated_joining_timeline}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
