/**
 * Backend base URL. Never hard-code it at call sites — read it from here so a single
 * environment variable (VITE_API_BASE_URL) controls every request the app makes.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5285';
