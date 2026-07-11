import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Copy, Trash2, Edit2, Download, Loader2 } from "lucide-react";
import { getBuiltResumes, duplicateBuiltResume, deleteBuiltResume, type BuiltResume, exportDocx } from "../lib/builderApi";
import { useAuth } from "../context/AuthContext";

export default function YourResumes() {
  const [resumes, setResumes] = useState<BuiltResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadResumes = async () => {
    if (!user) return;
    try {
      const data = await getBuiltResumes();
      setResumes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [user]);

  const handleDuplicate = async (id: string) => {
    setActionLoading(`dup-${id}`);
    try {
      await duplicateBuiltResume(id);
      await loadResumes();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;
    setActionLoading(`del-${id}`);
    try {
      await deleteBuiltResume(id);
      await loadResumes();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async (resume: BuiltResume) => {
    setActionLoading(`exp-${resume.id}`);
    try {
      const blob = await exportDocx({ resume_data: resume.resume_data, contact: resume.resume_data.contact });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${resume.resume_name}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-text">Your Resumes</h2>
          <p className="text-muted text-sm mt-1">Manage and build tailored resumes</p>
        </div>
        <button 
          onClick={() => navigate('/resume-builder')}
          className="flex items-center gap-2 bg-teal text-white px-4 py-2 rounded-lg font-medium hover:bg-teal/90 transition-colors"
        >
          <Plus size={18} />
          Create New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-teal" size={24} />
        </div>
      ) : resumes.length === 0 ? (
        <div className="bg-surface border border-border border-dashed rounded-xl p-10 text-center">
          <FileText className="text-muted mx-auto mb-3" size={32} />
          <p className="text-text font-medium">No resumes yet</p>
          <p className="text-sm text-muted mt-1 mb-4">Create your first highly-optimized ATS resume.</p>
          <button 
            onClick={() => navigate('/resume-builder')}
            className="text-teal text-sm font-medium hover:underline"
          >
            Start Building →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map(resume => (
            <div key={resume.id} className="bg-surface border border-border rounded-xl p-5 hover:border-muted transition-colors flex flex-col">
              <div className="flex-1 mb-4">
                <h3 className="font-medium text-text mb-1 truncate" title={resume.resume_name}>
                  {resume.resume_name}
                </h3>
                <p className="text-xs text-muted mb-2">
                  Target: {resume.target_role || "General"}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-1 bg-surface-hover rounded-md text-text">
                    ATS: {resume.parseability_score}%
                  </span>
                  <span className="text-xs px-2 py-1 bg-surface-hover rounded-md text-text">
                    Match: {resume.job_match_score || "N/A"}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-[10px] text-muted">
                  {new Date(resume.updated_at).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => navigate(`/resume-builder/${resume.id}`)}
                    className="p-1.5 text-muted hover:text-teal hover:bg-teal/10 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleExport(resume)}
                    disabled={actionLoading === `exp-${resume.id}`}
                    className="p-1.5 text-muted hover:text-teal hover:bg-teal/10 rounded transition-colors"
                    title="Export DOCX"
                  >
                    {actionLoading === `exp-${resume.id}` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                  <button 
                    onClick={() => handleDuplicate(resume.id)}
                    disabled={actionLoading === `dup-${resume.id}`}
                    className="p-1.5 text-muted hover:text-teal hover:bg-teal/10 rounded transition-colors"
                    title="Duplicate"
                  >
                    {actionLoading === `dup-${resume.id}` ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                  </button>
                  <button 
                    onClick={() => handleDelete(resume.id)}
                    disabled={actionLoading === `del-${resume.id}`}
                    className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                    title="Delete"
                  >
                    {actionLoading === `del-${resume.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
