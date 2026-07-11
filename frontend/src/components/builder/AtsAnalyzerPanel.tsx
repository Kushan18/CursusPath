import { CheckCircle2, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

interface AtsAnalyzerPanelProps {
  scoreResult: any;
  onRunCheck: () => void;
  isRunning: boolean;
}

export default function AtsAnalyzerPanel({ scoreResult, onRunCheck, isRunning }: AtsAnalyzerPanelProps) {
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-teal border-teal';
    if (score >= 60) return 'text-amber-500 border-amber-500';
    return 'text-danger border-danger';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-teal/10';
    if (score >= 60) return 'bg-amber-500/10';
    return 'bg-danger/10';
  };

  const overallScore = scoreResult ? (scoreResult.parseability_score + (scoreResult.job_match_score || scoreResult.parseability_score)) / 2 : 0;
  const isGood = overallScore >= 80;

  return (
    <div className="w-[320px] flex-shrink-0 bg-surface border-r border-border flex flex-col h-full overflow-hidden shadow-xl z-20 relative">
      <div className="p-4 border-b border-border flex justify-between items-center bg-surface-raised sticky top-0 z-10">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <CheckCircle2 size={16} className="text-teal" /> ATS ANALYZER
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Score Display */}
        <div className="flex flex-col items-center justify-center">
          {scoreResult ? (
            <>
              <div className={`w-32 h-32 rounded-full border-[6px] flex items-center justify-center ${getScoreColor(overallScore)} ${getScoreBg(overallScore)} mb-4`}>
                <span className="text-4xl font-display font-bold">{Math.round(overallScore)}</span>
              </div>
              <p className="text-sm font-medium text-gray-300">
                {isGood ? "Good foundation — keep improving!" : "Needs work to pass ATS."}
              </p>
            </>
          ) : (
            <div className="text-center py-8 opacity-50">
              <div className="w-32 h-32 rounded-full border-[6px] border-border bg-bg flex items-center justify-center mb-4 mx-auto">
                <span className="text-4xl font-display font-bold text-muted">--</span>
              </div>
              <p className="text-sm text-muted">Run check to see score</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button 
          onClick={onRunCheck}
          disabled={isRunning}
          className="w-full py-3 bg-[#11161d] border border-teal/30 hover:border-teal text-teal font-medium rounded-lg shadow-[0_0_15px_rgba(45,212,191,0.1)] hover:shadow-[0_0_20px_rgba(45,212,191,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isRunning ? (
            <><RefreshCw size={16} className="animate-spin" /> Analyzing...</>
          ) : (
            <><CheckCircle2 size={16} /> Run ATS Check</>
          )}
        </button>

        {scoreResult && (
          <div className="space-y-6">
            
            {/* Parseability Details */}
            <div>
              <h4 className="text-xs uppercase text-teal font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} /> Parseability Checks
              </h4>
              <div className="space-y-3 pl-1 border-l-2 border-border ml-1">
                <div className="flex gap-2 items-start relative before:absolute before:-left-[7px] before:top-1.5 before:w-3 before:h-[2px] before:bg-border">
                  <div className="w-4 h-4 rounded-full bg-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={10} className="text-teal" />
                  </div>
                  <p className="text-[11px] text-gray-400">Standard sections detected</p>
                </div>
                <div className="flex gap-2 items-start relative before:absolute before:-left-[7px] before:top-1.5 before:w-3 before:h-[2px] before:bg-border">
                  <div className="w-4 h-4 rounded-full bg-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={10} className="text-teal" />
                  </div>
                  <p className="text-[11px] text-gray-400">No complex tables or columns</p>
                </div>
              </div>
            </div>

            {/* Deductions / Missing Keywords */}
            {scoreResult.deductions?.length > 0 && (
              <div>
                <h4 className="text-xs uppercase text-danger font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} /> Missing Elements
                </h4>
                <div className="flex flex-wrap gap-2">
                  {scoreResult.deductions.map((ded: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-danger/10 border border-danger/20 text-danger rounded text-[10px] flex items-center gap-1">
                      <XCircle size={10} /> {ded}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {scoreResult.improvements?.length > 0 && (
              <div>
                <h4 className="text-xs uppercase text-amber-500 font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} /> Recommendations
                </h4>
                <ul className="space-y-2">
                  {scoreResult.improvements.map((imp: string, i: number) => (
                    <li key={i} className="text-[11px] text-gray-400 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
