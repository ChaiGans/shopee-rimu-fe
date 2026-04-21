// src/api/axios.ts
import axios from "axios";

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "") || undefined;

const api = axios.create({
  // Default to same-origin requests so production can rely on the reverse proxy.
  // VITE_API_URL remains available as an optional override for local development.
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
    }

    return Promise.reject(error);
  }
);

export default api;
