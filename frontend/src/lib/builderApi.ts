import { supabase } from "./supabaseClient";
import { ApiError } from "./api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError("Not signed in.", 401);
  }
  return { Authorization: `Bearer ${token}` };
}

export interface BuiltResume {
  id: string;
  user_id: string;
  resume_name: string;
  target_role: string;
  job_description: string;
  resume_data: any;
  skipped_fields: any[];
  parseability_score: number;
  job_match_score: number;
  score_deductions: string[];
  template_id: string;
  created_at: string;
  updated_at: string;
}

export async function getBuiltResumes(): Promise<BuiltResume[]> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Error: ${res.status}`, res.status);
  }
  return res.json();
}

export async function getBuiltResume(id: string): Promise<BuiltResume> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder/${id}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Error: ${res.status}`, res.status);
  }
  return res.json();
}

export async function saveBuiltResume(data: Partial<BuiltResume>): Promise<BuiltResume> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Error: ${res.status}`, res.status);
  }
  return res.json();
}

export async function updateBuiltResume(id: string, data: Partial<BuiltResume>): Promise<BuiltResume> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder/${id}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
  return res.json();
}

export async function duplicateBuiltResume(id: string): Promise<BuiltResume> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder/${id}/duplicate`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
  return res.json();
}

export async function deleteBuiltResume(id: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Error: ${res.status}`, res.status);
  }
}

export async function generateContent(action: string, content: string, target_role: string, job_description: string, user_instruction?: string): Promise<any> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder/generate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action, content, target_role, job_description, user_instruction }),
  });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
  return res.json();
}

export async function scoreResume(pdfBlob: Blob, skippedFields: any[], jobDescription: string): Promise<{ parseability_score: number, job_match_score: number, deductions: string[] }> {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append("file", pdfBlob, "resume.pdf");
  formData.append("skipped_fields", JSON.stringify(skippedFields));
  formData.append("job_description", jobDescription);

  const res = await fetch(`${API_BASE_URL}/api/v1/builder/score`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
  return res.json();
}

export async function scoreBuilderResume(resumeText: string, jobDescription: string): Promise<any> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder/score_builder`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Error: ${res.status}`, res.status);
  }
  return res.json();
}

export async function parseResumeForBuilder(file: File, targetRole?: string, jdText?: string): Promise<any> {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);
  if (targetRole) formData.append("target_role", targetRole);
  if (jdText) formData.append("job_description", jdText);

  const res = await fetch(`${API_BASE_URL}/api/v1/builder/parse`, {
    method: "POST",
    headers, // Do not set Content-Type to application/json for FormData
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Error: ${res.status}`, res.status);
  }
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    // Sometimes AI returns markdown wrapped JSON
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, ""));
  }
}

export async function exportDocx(data: any): Promise<Blob> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/builder/export_docx`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Error: ${res.status}`, res.status);
  }
  return res.blob();
}
