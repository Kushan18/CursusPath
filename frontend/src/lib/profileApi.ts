import { supabase } from "./supabaseClient";

const API_BASE_URL = "";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json"
  };
}

export async function checkIsOnboarded(): Promise<boolean> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/profile/onboarded`, { headers });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
  const data = await res.json();
  return data.is_onboarded;
}

export async function setupFromResume(file: File): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");
  
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/v1/profile/setup-from-resume`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`
    },
    body: formData,
  });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match) return JSON.parse(match[1]);
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, ""));
  }
}

export async function confirmProfile(data: any): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/profile/confirm`, {
    method: "POST",
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
}

export async function generateSummary(resume_text: string, projects_text: string): Promise<string> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/profile/generate-summary`, {
    method: "POST",
    headers,
    body: JSON.stringify({ resume_text, projects_text })
  });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
  const data = await res.json();
  return data.summary || "";
}

export async function getFullProfile(): Promise<any> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/v1/profile/full`, { headers });
  if (!res.ok) throw new ApiError(`Error: ${res.status}`, res.status);
  return res.json();
}
