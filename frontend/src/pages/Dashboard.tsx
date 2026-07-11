import { useState, useEffect } from "react";
import { getFullProfile, generateSummary } from "../lib/profileApi";
import { getBuiltResumes } from "../lib/builderApi";
import { Loader2, Sparkles, Phone, Mail, GraduationCap, ExternalLink } from "lucide-react";

export default function Dashboard() {
  const [profileData, setProfileData] = useState<any>(() => {
    const cached = sessionStorage.getItem("cursus_dashboard_profile");
    return cached ? JSON.parse(cached) : null;
  });
  const [resumes, setResumes] = useState<any[]>(() => {
    const cached = sessionStorage.getItem("cursus_dashboard_resumes");
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(!profileData);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    Promise.all([
      getFullProfile().catch(e => {
        console.error("Failed to fetch profile:", e);
        return null;
      }), 
      getBuiltResumes().catch(e => {
        console.error("Failed to fetch resumes:", e);
        return null;
      })
    ])
      .then(([profile, resumesList]) => {
        if (profile) {
          setProfileData(profile);
          sessionStorage.setItem("cursus_dashboard_profile", JSON.stringify(profile));
        }
        if (resumesList) {
          setResumes(resumesList);
          sessionStorage.setItem("cursus_dashboard_resumes", JSON.stringify(resumesList));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRegenerateSummary = async () => {
    if (!profileData) return;
    setGeneratingSummary(true);
    try {
      // In a real app we'd fetch the active resume text, but we'll mock the text input for now based on projects
      const summary = await generateSummary(
        "Experienced professional looking for roles.",
        JSON.stringify(profileData.projects)
      );
      setProfileData({
        ...profileData,
        profile: { ...profileData.profile, summary, summary_source: "ai_generated" }
      });
    } catch (e) {
      console.error(e);
      alert("Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const { profile, certifications, projects } = profileData || { profile: {}, certifications: [], projects: [] };

  if (loading) {
    return (
      <div className="dashboard-layout animate-in fade-in duration-500 max-w-7xl mx-auto opacity-50">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-teal w-10 h-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="main-content w-full">
        {/* Profile Card */}
        <div className="glass-panel" data-theme="resume">
          <div className="profile-card flex flex-col md:flex-row items-start md:items-center gap-6">
            <img 
              src={profile?.photo_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'User'}&background=7c3aed&color=fff`} 
              alt="Profile" 
              className="profile-photo w-24 h-24 rounded-full border-2 border-violet"
            />
            <div className="flex justify-between items-start w-full">
              <div>
                <h2 className="text-2xl font-bold">{profile?.full_name || "Anonymous User"}</h2>
                <div className="profile-contact flex flex-wrap gap-4 mt-2 text-sm text-muted">
                  {profile?.phone && (
                    <span className="flex items-center gap-1"><Phone size={14}/> {profile.phone}</span>
                  )}
                  {profile?.email && (
                    <span className="flex items-center gap-1"><Mail size={14}/> {profile.email}</span>
                  )}
                  {profile?.college_name && (
                    <span className="flex items-center gap-1"><GraduationCap size={14}/> {profile.college_name}</span>
                  )}
                </div>
              </div>
              <a href="/onboarding" className="text-xs text-violet hover:underline flex items-center gap-1">
                Edit Profile
              </a>
            </div>
          </div>

          {/* Summary Block */}
          <div className="summary-block mt-6 pt-6 border-t border-border">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">About Me</h3>
              <button 
                onClick={handleRegenerateSummary}
                disabled={generatingSummary}
                className="ai-regenerate-btn flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg"
              >
                {generatingSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Regenerate with AI
              </button>
            </div>
            <p className="text-muted text-sm leading-relaxed">
              {profile?.summary || "No summary provided."}
            </p>
            {profile?.summary_source === "ai_generated" && (
              <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-violet bg-violet/10 px-2 py-0.5 rounded">
                AI Generated
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects */}
          <div className="glass-panel">
            <h3 className="panel-title text-lg font-medium mb-4">Projects</h3>
            <div className="project-grid flex flex-col gap-4">
              {projects?.length > 0 ? projects.map((p: any) => (
                <div key={p.id} className="project-card p-4 rounded-xl">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-sm">{p.title}</h4>
                    {p.github_url && (
                      <a href={p.github_url} target="_blank" rel="noreferrer" className="text-muted hover:text-teal transition">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-2 line-clamp-2">{p.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {p.tech_stack?.map((tech: string, i: number) => (
                      <span key={i} className="tech-chip text-[10px] px-2 py-1 rounded-md text-muted border border-border">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )) : <p className="text-xs text-muted">No projects added yet.</p>}
            </div>
          </div>

          {/* Certifications */}
          <div className="glass-panel">
            <h3 className="panel-title text-lg font-medium mb-4">Certifications</h3>
            <div className="cert-list flex flex-col gap-3">
              {certifications?.length > 0 ? certifications.map((c: any) => (
                <div key={c.id} className="cert-item p-3 rounded-lg border border-border/50 flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-sm">{c.title}</h4>
                    <p className="text-xs text-muted">{c.issuer} {c.issue_date && `• ${c.issue_date}`}</p>
                  </div>
                  {c.credential_url && (
                    <a href={c.credential_url} target="_blank" rel="noreferrer" className="text-xs text-teal hover:underline">
                      View
                    </a>
                  )}
                </div>
              )) : <p className="text-xs text-muted">No certifications added yet.</p>}
            </div>
          </div>
        </div>

        {/* Campus Intelligence Mock */}
        <div className="glass-panel" data-theme="campus">
          <h3 className="panel-title text-lg font-medium mb-4 flex items-center gap-2">
            Campus Intelligence
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
              {profile?.college_name || "University"}
            </span>
          </h3>
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-value">84%</div>
              <div className="metric-label">Placement Rate</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">+12%</div>
              <div className="metric-label">YOY Trend</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">420</div>
              <div className="metric-label">Students Placed</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">₹8.5L</div>
              <div className="metric-label">Avg Package</div>
            </div>
          </div>
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-muted">Top Hiring Partners</h4>
            <div className="partner-grid">
              {['Microsoft', 'Amazon', 'TCS', 'Infosys', 'Accenture'].map(c => (
                <div key={c} className="partner-card">
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resume Vault (Pill Layout) */}
        <div className="glass-panel mt-6" data-theme="resume">
          <div className="flex justify-between items-center mb-4">
            <h3 className="panel-title text-lg font-medium mb-0">Resume Vault</h3>
            <a href="/resume-builder" className="text-xs text-violet hover:underline flex items-center gap-1">
              + Add Resume
            </a>
          </div>
          {/* Render dynamic pills */}
          <div className="resume-pill-group">
            {resumes.map((r, i) => (
              <div key={r.id} className={`resume-pill ${i === 0 ? 'active' : ''}`}>
                {r.target_role || r.resume_name} {i === 0 ? '(Active)' : ''}
              </div>
            ))}
            {resumes.length === 0 && (
              <div className="text-xs text-muted">No resumes yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
