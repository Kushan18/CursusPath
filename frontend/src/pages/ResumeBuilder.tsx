import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, Download, Loader2, Sparkles, AlertTriangle, CheckCircle2
} from "lucide-react";
import { 
  getBuiltResume, saveBuiltResume, updateBuiltResume, generateContent, scoreBuilderResume
} from "../lib/builderApi";
import { getFullProfile } from "../lib/profileApi";
// @ts-ignore
import html2pdf from "html2pdf.js";
import ResumeFormEditor from "../components/builder/ResumeFormEditor";
import AtsAnalyzerPanel from "../components/builder/AtsAnalyzerPanel";
import AiChatWidget from "../components/builder/AiChatWidget";
export default function ResumeBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [phase, setPhase] = useState<'init' | 'missing_fields' | 'generating' | 'chat'>('init');
  const [loading, setLoading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showAts, setShowAts] = useState(false);
  
  const [profileData, setProfileData] = useState<any>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  
  const [missingFields, setMissingFields] = useState<{field: string, reason: string, type: string}[]>([]);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string, options?: string[]}[]>([]);
  const [templateId, setTemplateId] = useState<"strict_ats" | "modern" | "minimalist">("strict_ats");
  const [refining, setRefining] = useState(false);
  
  const [scoreResult, setScoreResult] = useState<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const runScore = async () => {
    if (!id || !resumeData) return;
    setIsScoring(true);
    try {
      const textForScoring = JSON.stringify(resumeData);
      const score = await scoreBuilderResume(textForScoring, jobDescription || "");
      setScoreResult(score);
      
      await updateBuiltResume(id, {
        parseability_score: score.parseability_score,
        job_match_score: score.job_match_score,
        score_deductions: score.deductions
      } as any);
    } catch (e) {
      console.error("Scoring failed", e);
    } finally {
      setIsScoring(false);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      getBuiltResume(id).then(data => {
        setTargetRole(data.target_role || "");
        setJobDescription(data.job_description || "");
        if (data.resume_data) {
          setResumeData(data.resume_data);
          if (data.template_id) {
            setTemplateId(data.template_id as any);
          }
          if (data.parseability_score === 0) {
            runMissingFieldsAnalysis(data.resume_data, data.target_role || "");
          } else {
            setPhase('chat');
          }
        }
        if (data.parseability_score > 0) {
          setScoreResult({
            parseability_score: data.parseability_score,
            job_match_score: data.job_match_score,
            deductions: data.score_deductions,
            improvements: data.score_deductions // Mocked for old saves
          });
        }
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [id]);

  const runMissingFieldsAnalysis = async (data: any, role: string) => {
    // Instant heuristic check for missing fields to achieve lightning speed
    const missing: {field: string, reason: string, type: string}[] = [];
    
    if (!data.contact?.linkedin) {
      missing.push({ field: "LinkedIn Profile", reason: "Recruiters use LinkedIn to verify your professional background.", type: "input" });
    }
    if (!data.summary || data.summary.trim() === "") {
      missing.push({ field: "Professional Summary", reason: "A summary helps ATS systems quickly categorize your profile.", type: "textarea" });
    }
    if (!data.skills || data.skills.length < 3) {
      missing.push({ field: "Core Skills", reason: "ATS systems heavily weigh skills. Add at least 5-6 key skills.", type: "input" });
    }
    if (role.toLowerCase().includes("engineer") || role.toLowerCase().includes("developer")) {
      if (!data.contact?.github && !data.contact?.portfolio) {
        missing.push({ field: "GitHub/Portfolio URL", reason: "Tech roles require proof of work. A GitHub link is highly recommended.", type: "input" });
      }
    }
    
    if (missing.length > 0) {
      setMissingFields(missing);
      setPhase('missing_fields');
    } else {
      generateInitialReview(data);
    }
  };

  const handleStartGeneration = async () => {
    setLoading(true);
    try {
      let prof = profileData;
      if (!prof) {
        prof = await getFullProfile();
        setProfileData(prof);
      }
      
      const missing = [];
      if (!prof.profile?.linkedin && !userInputs.linkedin) missing.push("LinkedIn Profile");
      if (prof.certifications?.length === 0 && !userInputs.certifications && (targetRole.toLowerCase().includes("cloud") || targetRole.toLowerCase().includes("engineer"))) {
        missing.push("Relevant Certifications (e.g., AWS, GCP)");
      }

      if (missing.length > 0 && phase === 'init') {
        setMissingFields(missing.map(m => ({field: m, reason: "Highly recommended for ATS optimization", type: "input"})));
        setPhase('missing_fields');
        setLoading(false);
        return;
      }

      await executeGeneration(prof);
    } catch (e) {
      console.error(e);
      alert("Failed to start generation.");
      setLoading(false);
    }
  };

  const generateInitialReview = async (data: any) => {
    setPhase('chat');
    setRefining(true);
    try {
      const res = await generateContent("generate_review", JSON.stringify(data), targetRole, jobDescription);
      const reviewText = typeof res === 'string' ? JSON.parse(res).review : res.review;
      setChatHistory([{ role: 'ai', text: reviewText }]);
    } catch(e) {
      setChatHistory([{ role: 'ai', text: "I've processed your resume! Let me know if you want to change styles or edit any content." }]);
    } finally {
      setRefining(false);
    }
  };

  const handleMissingFieldsSubmit = async () => {
    if (!id) {
       await executeGeneration(profileData);
       return;
    }
    const hasInputs = Object.values(userInputs).some(v => v.trim() !== "");
    if (hasInputs && resumeData) {
      setPhase('generating');
      setLoading(true);
      try {
        const instruction = `The user has provided the following missing details to add to their resume: ${JSON.stringify(userInputs)}. Please integrate them naturally into the appropriate sections.`;
        const res = await generateContent("refine_resume", JSON.stringify(resumeData), targetRole, jobDescription, instruction);
        const updatedData = typeof res === 'string' ? JSON.parse(res) : res;
        const newData = updatedData.resume_data || updatedData;
        setResumeData(newData);
        generateInitialReview(newData);
        if (id) await updateBuiltResume(id, { resume_data: newData, template_id: templateId } as any);
        setTimeout(runScore, 1000);
      } catch (e) {
        console.error(e);
        generateInitialReview(resumeData);
      } finally {
        setLoading(false);
      }
    } else {
      generateInitialReview(resumeData);
      setTimeout(runScore, 1000);
    }
  };

  const executeGeneration = async (prof: any) => {
    setPhase('generating');
    
    // Merge user inputs into profile payload
    const mergedProfile = {
      ...prof,
      additional_inputs: userInputs
    };

    try {
      const res = await generateContent("create_from_profile", JSON.stringify(mergedProfile), targetRole, jobDescription);
      const generatedData = typeof res === 'string' ? JSON.parse(res) : res;
      setResumeData(generatedData);
      
      generateInitialReview(generatedData);
      
      // Auto-save
      if (!id) {
        const saved = await saveBuiltResume({
          resume_name: `${targetRole} Resume`,
          target_role: targetRole,
          job_description: jobDescription,
          resume_data: generatedData,
          template_id: templateId,
          skipped_fields: []
        } as any);
        navigate(`/resume-builder/${saved.id}`, { replace: true });
      } else {
        await updateBuiltResume(id, { resume_data: generatedData, template_id: templateId } as any);
      }

      // Auto-score
      setTimeout(runScore, 1000);
    } catch (e) {
      console.error(e);
      alert("AI Generation failed.");
      setPhase('init');
    }
  };

  const handleChatSubmit = async (userMsg: string) => {
    if (refining) return;
    
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setRefining(true);
    
    try {
      const res = await generateContent("refine_resume", JSON.stringify(resumeData), targetRole, jobDescription, userMsg);
      const updatedData = typeof res === 'string' ? JSON.parse(res) : res;
      
      if (updatedData.resume_data) {
        setResumeData(updatedData.resume_data);
      } else {
        setResumeData(updatedData); // Fallback
      }
      
      const responseText = updatedData.chat_response || "I've updated the resume based on your instructions! How does it look now?";
      const options = updatedData.show_template_options ? ["Strict ATS", "Modern Professional", "Minimalist"] : undefined;
      
      setChatHistory(prev => [...prev, { role: 'ai', text: responseText, options }]);
      
      if (id && updatedData.resume_data) {
        await updateBuiltResume(id, { resume_data: updatedData.resume_data, template_id: templateId } as any);
      }
      setTimeout(runScore, 1000);
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'ai', text: "Sorry, I ran into an error trying to update that. Can you try again?" }]);
    } finally {
      setRefining(false);
    }
  };



  const exportPDF = () => {
    if (!previewRef.current) return;
    const element = previewRef.current as HTMLElement;
    const opt: any = {
      margin:       0.5,
      filename:     `${targetRole || 'Resume'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportTXT = () => {
    if (!resumeData) return;
    const data = resumeData;
    let text = `${data.contact?.fullName || 'Name'}\n${data.contact?.email || ''} | ${data.contact?.phone || ''} | ${data.contact?.location || ''}\n\n`;
    if (data.summary) text += `SUMMARY\n${data.summary}\n\n`;
    if (data.experience?.length > 0) {
      text += `EXPERIENCE\n`;
      data.experience.forEach((e: any) => {
        text += `${e.title} at ${e.company} (${e.dates})\n`;
        e.bullets?.forEach((b: string) => text += `- ${b}\n`);
        text += `\n`;
      });
    }
    if (data.education?.length > 0) {
      text += `EDUCATION\n`;
      data.education.forEach((e: any) => {
        text += `${e.degree} - ${e.school} (${e.dates})\n\n`;
      });
    }
    if (data.skills?.length > 0) {
      text += `SKILLS\n${data.skills.join(', ')}\n\n`;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetRole || 'Resume'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDocxHandler = async () => {
    if (!resumeData) return;
    try {
      const { exportDocx } = await import('../lib/builderApi');
      const blob = await exportDocx(resumeData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${targetRole || 'Resume'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export DOCX");
    }
  };

  const LivePreview = () => {
    if (!resumeData) return null;
    const { contact, summary, experience, education, skills, projects, certifications } = resumeData;
    
    const font = templateId === 'modern' ? 'Inter, sans-serif' : templateId === 'minimalist' ? 'Helvetica, sans-serif' : 'Arial, sans-serif';
    const headerAlign = templateId === 'modern' ? 'text-left flex flex-col' : 'text-center';
    
    return (
      <div 
        ref={previewRef}
        className="bg-white text-black p-8 shadow-2xl mx-auto"
        style={{ width: '794px', minHeight: '1123px', fontFamily: font }}
      >
        <div 
          className={`${headerAlign} mb-6 pb-4`} 
          style={{ 
            borderBottomWidth: templateId === 'modern' ? '2px' : templateId === 'minimalist' ? '1px' : '1.5px', 
            borderBottomColor: templateId === 'minimalist' ? '#9ca3af' : templateId === 'modern' ? '#00E5A0' : '#000' 
          }}
        >
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-2" style={{ color: templateId === 'modern' ? '#00E5A0' : '#000' }}>
            {contact?.fullName || "Your Name"}
          </h1>
          <p className="text-[13px]">
            {[contact?.email, contact?.phone, contact?.location, contact?.linkedin, contact?.github].filter(Boolean).join(" | ")}
          </p>
        </div>
        
        {summary && (
          <div className="mb-4">
            <h2 className="text-[15px] font-bold uppercase border-b mb-2" style={{ borderBottomColor: '#d1d5db' }}>Professional Summary</h2>
            <p className="text-[13px] leading-relaxed">{summary}</p>
          </div>
        )}
        
        {experience?.length > 0 && (
          <div className="mb-4">
            <h2 className="text-[15px] font-bold uppercase border-b mb-2" style={{ borderBottomColor: '#d1d5db', pageBreakAfter: 'avoid' }}>Experience</h2>
            {experience.map((exp: any, i: number) => (
              <div key={i} className="mb-3" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex justify-between font-bold text-[13px]">
                  <span>{exp.title}</span>
                  <span>{exp.dates}</span>
                </div>
                <div className="flex justify-between text-[13px] italic mb-1">
                  <span>{exp.company}</span>
                  <span>{exp.location}</span>
                </div>
                <ul className="list-disc pl-5 text-[13px] space-y-1">
                  {exp.bullets?.map((b: string, j: number) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {projects?.length > 0 && (
          <div className="mb-4">
            <h2 className="text-[15px] font-bold uppercase border-b mb-2" style={{ borderBottomColor: '#d1d5db', pageBreakAfter: 'avoid' }}>Projects</h2>
            {projects.map((proj: any, i: number) => (
              <div key={i} className="mb-3" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex justify-between font-bold text-[13px]">
                  <span>
                    {proj.title}
                    {proj.link && (
                      <span className="font-normal ml-2 italic">
                        | <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: '#0f766e' }}>
                          {proj.link.replace(/^https?:\/\//, '')}
                        </a>
                      </span>
                    )}
                  </span>
                  <span>{proj.dates}</span>
                </div>
                <ul className="list-disc pl-5 text-[13px] space-y-1 mt-1">
                  {proj.bullets?.map((b: string, j: number) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {education?.length > 0 && (
          <div className="mb-4">
            <h2 className="text-[15px] font-bold uppercase border-b mb-2" style={{ borderBottomColor: '#d1d5db', pageBreakAfter: 'avoid' }}>Education</h2>
            {education.map((edu: any, i: number) => (
              <div key={i} className="mb-2" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex justify-between font-bold text-[13px]">
                  <span>{edu.degree} {edu.gpa && <span className="font-normal italic">| {edu.gpa}</span>}</span>
                  <span>{edu.dates}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span>{edu.school}</span>
                  <span>{edu.location}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {skills?.length > 0 && (
          <div className="mb-4">
            <h2 className="text-[15px] font-bold uppercase border-b mb-2" style={{ borderBottomColor: '#d1d5db' }}>Skills</h2>
            <div className="text-[13px] space-y-1">
              {(() => {
                let currentSkills = skills;
                if (skills.length > 0 && typeof skills[0] === 'string') {
                  currentSkills = [{ category: 'Core Skills', items: skills }];
                }
                return currentSkills.map((skillCat: any, i: number) => (
                  <div key={i}>
                    <span className="font-bold">{skillCat.category}:</span> {skillCat.items?.join(", ")}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {certifications?.length > 0 && (
          <div className="mb-4">
            <h2 className="text-[15px] font-bold uppercase border-b mb-2" style={{ borderBottomColor: '#d1d5db' }}>Certifications</h2>
            <div className="space-y-3">
              {(() => {
                let currentCerts = certifications;
                if (currentCerts.length > 0 && typeof currentCerts[0] === 'string') {
                  currentCerts = currentCerts.map((c: string) => {
                    const parts = c.split('-');
                    return {
                      name: parts[0]?.trim() || c,
                      issuer: parts[1]?.trim() || '',
                      date: '',
                      summary: ''
                    };
                  });
                }
                
                return currentCerts.map((c: any, i: number) => (
                  <div key={i} style={{ pageBreakInside: 'avoid' }}>
                    <div className="font-bold text-[13px]">{c.name}</div>
                    {(c.issuer || c.date) && (
                      <div className="text-[13px] italic mb-1 text-gray-700">
                        {c.issuer} {c.issuer && c.date && '|'} {c.date && `Issued: ${c.date}`}
                      </div>
                    )}
                    {c.summary && (
                      <p className="text-[13px] leading-relaxed">{c.summary}</p>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading && phase === 'init') {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-teal w-12 h-12" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-[#11161d] flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/resume-suite')} className="text-muted hover:text-text transition-colors flex items-center gap-1 font-semibold text-xs tracking-wider">
            <ChevronLeft size={16} /> BACK
          </button>
          <div className="h-4 w-[1px] bg-border mx-2"></div>
          <h1 className="font-display font-semibold text-lg flex items-center gap-2">
            <Sparkles className="text-teal" size={18} /> 
            AI Resume Builder
          </h1>
        </div>
        {phase === 'chat' && (
          <div className="flex gap-3 items-center">
            <button 
              onClick={() => {
                setShowAts(!showAts);
                if (!showAts && !scoreResult) runScore(); // auto run score if opening for first time
              }}
              className={`px-4 py-2 text-xs font-bold rounded border transition-colors flex items-center gap-2 shadow-sm ${showAts ? 'bg-teal text-[#11161d] border-teal' : 'bg-surface border-border text-teal hover:border-teal'}`}
            >
              <CheckCircle2 size={14} /> {showAts ? 'HIDE ATS SCORE' : 'ATS SCORE'}
            </button>
            <div className="flex items-center gap-2 mx-2 border-r border-border pr-4">
              <span className="text-xs text-muted font-medium">TEMPLATE</span>
              <select
                value={templateId}
                onChange={e => {
                  setTemplateId(e.target.value as any);
                  if (id) updateBuiltResume(id, { template_id: e.target.value } as any);
                }}
                className="bg-[#1b222c] border border-border text-sm rounded px-3 py-1.5 focus:border-teal outline-none"
              >
                <option value="strict_ats">Strict ATS</option>
                <option value="modern">Modern Professional</option>
                <option value="minimalist">Minimalist</option>
              </select>
            </div>
            <button onClick={exportTXT} className="px-3 py-2 bg-surface text-muted text-xs font-semibold border border-border rounded hover:text-text transition-colors shadow-sm">
              TXT
            </button>
            <button onClick={exportDocxHandler} className="px-3 py-2 bg-surface text-muted text-xs font-semibold border border-border rounded hover:text-text transition-colors shadow-sm">
              DOCX
            </button>
            <button onClick={exportPDF} className="px-4 py-2 bg-teal text-[#11161d] rounded flex items-center gap-2 text-sm font-bold hover:bg-teal/90 transition-colors shadow-lg shadow-teal/20">
              Export PDF <Download size={16} />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden relative bg-[#11161d]">
        {phase === 'chat' ? (
          <>
            {/* Left Column: Form Editor */}
            <div className="w-[380px] h-full overflow-hidden flex-shrink-0 flex flex-col z-10 relative">
               <ResumeFormEditor resumeData={resumeData} setResumeData={setResumeData} />
            </div>

            {/* Middle Column: ATS Analyzer (Conditionally Rendered) */}
            {showAts && (
              <AtsAnalyzerPanel 
                scoreResult={scoreResult} 
                onRunCheck={runScore} 
                isRunning={isScoring} 
              />
            )}

            {/* Right Column: PDF Preview */}
            <div className="flex-1 h-full bg-[#232a35] overflow-auto flex justify-center py-8 relative custom-scrollbar">
              <div 
                className="animate-in fade-in zoom-in-95 duration-700 shadow-2xl origin-top"
                style={{ transform: showAts ? 'scale(0.8)' : 'scale(1.0)', transition: 'transform 0.3s ease-in-out' }}
              >
                 <LivePreview />
              </div>
            </div>

            {/* Floating Chat Widget */}
            <AiChatWidget 
              chatHistory={chatHistory}
              handleChatSubmit={handleChatSubmit}
              refining={refining}
              templateId={templateId}
              onSelectTemplate={(tid) => {
                setTemplateId(tid as any);
                if (id) updateBuiltResume(id, { template_id: tid } as any);
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            {phase === 'init' && (
              <div className="w-[500px] p-8 bg-surface-raised rounded-2xl shadow-2xl border border-border">
                <h2 className="text-2xl font-semibold mb-2 font-display">Let's craft a perfect resume.</h2>
                <p className="text-sm text-muted mb-8 leading-relaxed">
                  Tell me the role you're targeting, and I'll generate a 1-page ATS-optimized resume based on your profile.
                </p>
                
                <div className="space-y-6 text-left">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Target Role</label>
                    <input 
                      placeholder="e.g. Full Stack Developer" 
                      value={targetRole} 
                      onChange={e => setTargetRole(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center justify-between">
                      Target Job Description <span className="text-[10px] text-teal uppercase tracking-wider bg-teal/10 px-2 py-0.5 rounded">Highly Recommended</span>
                    </label>
                    <textarea 
                      placeholder="Paste the job description here to optimize ATS keyword matching..." 
                      value={jobDescription} 
                      onChange={e => setJobDescription(e.target.value)}
                      className="w-full h-40 bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-all resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleStartGeneration}
                    disabled={!targetRole}
                    className="w-full py-4 bg-teal text-[#11161d] rounded-xl font-bold shadow-lg shadow-teal/20 hover:bg-teal/90 hover:scale-[1.02] transition-all flex justify-center items-center gap-2"
                  >
                    Generate Resume <Sparkles size={18} />
                  </button>
                </div>
              </div>
            )}

            {phase === 'missing_fields' && (
              <div className="w-[500px] p-8 bg-surface-raised rounded-2xl shadow-2xl border border-border">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-amber-500" size={24} />
                </div>
                <h2 className="text-xl font-semibold mb-2 font-display">Missing Key Details</h2>
                <p className="text-sm text-muted mb-6">
                  To maximize your ATS score for <b>{targetRole}</b>, it's highly recommended you add these fields.
                </p>
                
                <div className="space-y-4 mb-8 text-left">
                  {missingFields.map((fieldObj, i) => (
                    <div key={i} className="bg-bg p-3 rounded-xl border border-border">
                      <label className="block text-sm font-medium mb-1 text-gray-200">{fieldObj.field}</label>
                      <p className="text-[11px] text-muted mb-2">{fieldObj.reason}</p>
                      <input 
                        onChange={e => setUserInputs({...userInputs, [fieldObj.field]: e.target.value})}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                        placeholder={`Enter your ${fieldObj.field}...`}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleMissingFieldsSubmit}
                    className="flex-1 py-3 bg-teal text-[#11161d] rounded-lg font-bold hover:bg-teal/90 transition-colors text-sm"
                  >
                    Continue & Generate
                  </button>
                  <button 
                    onClick={handleMissingFieldsSubmit}
                    className="px-4 py-3 bg-surface text-muted border border-border rounded-lg font-medium hover:bg-border transition-colors text-sm"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {phase === 'generating' && (
              <div className="text-center animate-in fade-in zoom-in">
                <div className="relative mb-6 mx-auto w-20 h-20">
                  <div className="w-20 h-20 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal" size={24} />
                </div>
                <h3 className="text-xl font-bold font-display mb-2">Crafting your resume...</h3>
                <p className="text-sm text-muted max-w-sm mx-auto">Applying human-like heuristics, structuring for ATS, and integrating your profile.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
