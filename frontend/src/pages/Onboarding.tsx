import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setupFromResume, confirmProfile, getFullProfile } from "../lib/profileApi";
import { Loader2, UploadCloud } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, setIsOnboarded } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: user?.user_metadata?.full_name || "",
    phone: "",
    email: user?.email || "",
    summary: "",
    college_name: "",
    photo_url: "",
    certifications: [] as any[],
    projects: [] as any[]
  });

  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    getFullProfile().then(data => {
      if (data && data.profile) {
        setFormData({
          full_name: data.profile.full_name || user?.user_metadata?.full_name || "",
          phone: data.profile.phone || "",
          email: data.profile.email || user?.email || "",
          summary: data.profile.summary || "",
          college_name: data.profile.college_name || "",
          photo_url: data.profile.photo_url || "",
          certifications: data.certifications || [],
          projects: data.projects || []
        });
      }
    }).catch(console.error).finally(() => setPageLoading(false));
  }, [user]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setResumeLoading(true);
    try {
      const data = await setupFromResume(file);
      setFormData(prev => ({
        ...prev,
        full_name: data.full_name || prev.full_name,
        phone: data.phone || prev.phone,
        email: data.email || prev.email,
        summary: data.summary || prev.summary,
        college_name: data.college_name || prev.college_name,
        certifications: data.certifications || prev.certifications,
        projects: data.projects || prev.projects
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to parse resume.");
    } finally {
      setResumeLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmProfile(formData);
      setIsOnboarded(true);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6 bg-radial-blur">
        <Loader2 className="animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 bg-radial-blur">
      <div className="max-w-2xl w-full glass-panel">
        <h1 className="text-2xl font-bold mb-2">Welcome to CursusPath</h1>
        <p className="text-muted text-sm mb-8">Set up your profile to personalize your experience. You can upload a resume to auto-fill the details, or fill them in manually.</p>
        
        <div className="mb-8 p-4 border border-border bg-surface-raised rounded-xl flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Fast-track setup</h3>
            <p className="text-xs text-muted mt-1">Upload your resume (PDF) to auto-extract your details using AI.</p>
          </div>
          <input 
            type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleResumeUpload}
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={resumeLoading}
            className="flex items-center gap-2 px-4 py-2 bg-teal/10 text-teal text-sm font-medium rounded-lg hover:bg-teal/20 transition"
          >
            {resumeLoading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {resumeLoading ? "Parsing..." : "Upload Resume"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Full Name</label>
              <input 
                required
                type="text" 
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm focus:border-teal outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Email</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm focus:border-teal outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Phone (Optional)</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm focus:border-teal outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">College Name</label>
              <input 
                type="text" 
                value={formData.college_name}
                onChange={e => setFormData({...formData, college_name: e.target.value})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm focus:border-teal outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Professional Summary</label>
            <textarea 
              value={formData.summary}
              onChange={e => setFormData({...formData, summary: e.target.value})}
              className="w-full h-24 bg-surface border border-border rounded-lg px-4 py-2 text-sm focus:border-teal outline-none"
              placeholder="A brief summary of your background and goals..."
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <button 
              type="submit"
              disabled={loading}
              className="flex items-center justify-center px-6 py-2 bg-teal text-bg font-medium rounded-lg hover:bg-teal/90 transition"
            >
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {loading ? "Saving..." : "Complete Setup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
