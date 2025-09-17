export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 
      "Content-Type": "application/json", 
      ...authHeader,
      ...(options.headers || {})
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let errorMessage = text || `HTTP ${res.status}`;
    
    try {
      const errorData = JSON.parse(text);
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {}
    const err: any = new Error(errorMessage);
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      if (!res.ok) {
        const text = await res.text();
        let errorMessage = text || `HTTP ${res.status}`;
        try {
          const errorData = JSON.parse(text);
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {}
        throw new Error(errorMessage);
      }
      return res.json();
    },
    signup: (payload: { name: string; email: string; password: string; role?: "Admin" | "Estimator" | "Ops"; }) =>
      request("/api/v1/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
    me: () => request("/api/v1/users/me"),
    changePassword: (old_password: string, new_password: string) =>
      request("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify({ old_password, new_password }) }),
  },
  dashboard: {
    summary: () => request("/dashboard/summary"),
  },
  estimations: {
    list: () => request("/estimations"),
    get: (id: string) => request(`/estimations/${id}`),
    update: (id: string, updates: Record<string, unknown>) => request(`/estimations/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    delete: (id: string) => request(`/estimations/${id}`, { method: "DELETE" }),
    updateEnvelope: (id: string, envelope: any) => request(`/estimations/${id}/envelope`, { method: "PUT", body: JSON.stringify(envelope) }),
    importEnvelope: (envelope: any) => request(`/estimations/import-envelope`, { method: "POST", body: JSON.stringify(envelope) }),
    generateExcel: async (id: string) => {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/estimations/${id}/export-excel`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        let errorMessage = text || `HTTP ${res.status}`;
        try { const data = JSON.parse(text); if (data.detail) errorMessage = data.detail; } catch {}
        throw new Error(errorMessage);
      }
      return res.blob();
    },
    uploadExcel: async (id: string, file: File) => {
      const token = localStorage.getItem("access_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/estimations/${id}/upload-excel`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        let errorMessage = text || `HTTP ${res.status}`;
        try { const data = JSON.parse(text); if (data.detail) errorMessage = data.detail; } catch {}
        throw new Error(errorMessage);
      }
      return res.json();
    },
    populateFromExcel: (id: string, payload: any) => request(`/estimations/${id}/populate-from-excel`, { method: "POST", body: JSON.stringify(payload) }),
    setResources: (id: string, resources: any[]) => request(`/estimations/${id}/resources`, { method: "PUT", body: JSON.stringify(resources) }),
  },
  users: {
    list: () => request("/api/v1/users"),
    update: (userId: string, updates: Record<string, unknown>) =>
      request(`/api/v1/users/${userId}`, { method: "PATCH", body: JSON.stringify(updates) }),
    updateMe: (updates: Record<string, unknown>) => request(`/api/v1/users/me`, { method: "PATCH", body: JSON.stringify(updates) }),
  },
  resources: {
    list: () => request(`/resources`),
    create: (payload: any) => request(`/resources`, { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, updates: any) => request(`/resources/${id}`, { method: "PUT", body: JSON.stringify(updates) }),
    delete: (id: string) => request(`/resources/${id}`, { method: "DELETE" }),
  },
  pricing: {
    rates: {
      list: () => request("/pricing/rates"),
      create: (rate: any) => request("/pricing/rates", { method: "POST", body: JSON.stringify(rate) }),
      update: (rateId: string, updates: Record<string, unknown>) =>
        request(`/pricing/rates/${rateId}`, { method: "PUT", body: JSON.stringify(updates) }),
      delete: (rateId: string) => request(`/pricing/rates/${rateId}`, { method: "DELETE" }),
    },
    calc: (estimationId: string) => request("/pricing/calc", { method: "POST", body: JSON.stringify({ estimation_id: estimationId }) }),
  },
  tools: {
    processEstimation: async (jsonFile: File) => {
      const token = localStorage.getItem("access_token");
      const fd = new FormData();
      fd.append("json_file", jsonFile);
      const res = await fetch(`${API_URL}/tools/process-estimation`, { 
        method: "POST", 
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const text = await res.text();
        let errorMessage = text || `HTTP ${res.status}`;
        try {
          const errorData = JSON.parse(text);
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {}
        throw new Error(errorMessage);
      }
      return res.blob();
    },
  },
};


