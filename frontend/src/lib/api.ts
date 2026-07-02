import { clearToken, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ItemStatus = "queued" | "processing" | "done" | "failed";
export type JobStatus = "processing" | "completed";

export interface JobCounts {
  queued: number;
  processing: number;
  done: number;
  failed: number;
}

export interface Item {
  id: string;
  status: ItemStatus;
  attempts: number;
  input_text: string;
  category: string | null;
  priority: string | null;
  sentiment: string | null;
  summary: string | null;
  suggested_reply: string | null;
  error: string | null;
  updated_at: string;
  retryable?: boolean;
}

export interface JobSummary {
  id: string;
  status: JobStatus;
  total_items: number;
  created_at: string;
  counts: JobCounts;
  progress: number;
}

export interface JobDetail extends JobSummary {
  items: Item[];
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function formatApiDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && "msg" in entry) {
          return String((entry as { msg: string }).msg);
        }
        return JSON.stringify(entry);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "Request failed";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = formatApiDetail(body.detail ?? body.message ?? detail);
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  submitBatch: (items: string[], locale: string = "en") =>
    request<{ id: string; status: JobStatus; total_items: number }>("/jobs", {
      method: "POST",
      body: JSON.stringify({ items, locale }),
    }),

  listJobs: () => request<JobSummary[]>("/jobs"),

  getJob: (jobId: string) => request<JobDetail>(`/jobs/${jobId}`),

  retryItem: (jobId: string, itemId: string) =>
    request<Item>(`/jobs/${jobId}/items/${itemId}/retry`, { method: "POST" }),
};

export { API_URL };
