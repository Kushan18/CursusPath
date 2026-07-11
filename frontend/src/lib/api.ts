import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError("Not signed in.", 401);
  }
  return { Authorization: `Bearer ${token}` };
}

export interface OfferAnalysisResult {
  id: string;
  trust_score: number;
  company_name: string;
  red_flags: string[];
  positive_signals: string[];
  estimated_joining_timeline: string;
  summary: string;
  provider_used: string;
}

export interface OfferHistoryItem {
  id: string;
  company_name: string;
  trust_score: number;
  red_flags: string[];
  positive_signals: string[];
  estimated_joining_timeline: string;
  summary: string;
  created_at: string;
}

export async function verifyOfferLetter(
  file: File
): Promise<OfferAnalysisResult> {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/v1/offers/verify`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.detail || `Request failed with status ${res.status}`,
      res.status
    );
  }

  return res.json();
}

export async function getOfferHistory(): Promise<OfferHistoryItem[]> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/v1/offers/history`, {
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.detail || `Request failed with status ${res.status}`,
      res.status
    );
  }

  return res.json();
}

export async function deleteOffer(offerId: string): Promise<void> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/v1/offers/${offerId}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.detail || `Request failed with status ${res.status}`,
      res.status
    );
  }
}

export interface ResumeAnalysisResult {
  id: string;
  ats_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  formatting_issues: string[];
  structure_issues: string[];
  summary: string;
  provider_used: string;
}

export interface ResumeHistoryItem {
  id: string;
  ats_score: number;
  analysis_report: {
    matched_keywords: string[];
    missing_keywords: string[];
    formatting_issues: string[];
    structure_issues: string[];
    summary: string;
    job_description_provided: boolean;
  };
  created_at: string;
}

export async function analyzeResume(file: File, jobDescription: string = ""): Promise<ResumeAnalysisResult> {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("job_description", jobDescription);

  const res = await fetch(`${API_BASE_URL}/api/v1/resumes/analyze`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Request failed with status ${res.status}`, res.status);
  }

  return res.json();
}

export async function getResumeHistory(): Promise<ResumeHistoryItem[]> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/resumes/history`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Request failed with status ${res.status}`, res.status);
  }
  return res.json();
}

export async function deleteResume(resumeId: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/resumes/${resumeId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Request failed with status ${res.status}`, res.status);
  }
}

export async function buildResume(file: File, companyName: string, jobDescription: string): Promise<Blob> {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("company_name", companyName);
  formData.append("job_description", jobDescription);

  const res = await fetch(`${API_BASE_URL}/api/v1/resumes/build`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Request failed with status ${res.status}`, res.status);
  }

  return res.blob();
}
