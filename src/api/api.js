// src/api/index.js
import axios from 'axios';

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
});

// Call this whenever auth changes
export function setAuthToken(token) {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common.Authorization;
  }
}

// if you persist auth in localStorage (you do), bootstrap on load
try {
  const raw = localStorage.getItem('auth');
  const token = raw ? JSON.parse(raw).token : null;
  if (token) setAuthToken(token);
} catch {}
