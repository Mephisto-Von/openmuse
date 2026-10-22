import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_URL_STORAGE_KEY = "openmuse.apiUrl";
const DEFAULT_API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787")
).replace(/\/$/, "");

declare global {
  interface Window {
    /** Set by the desktop shell before the app bundle runs. */
    __OPENMUSE_API_URL__?: string;
  }
}

function runtimeApiUrl() {
  if (typeof window === "undefined") return undefined;
  const value = window.__OPENMUSE_API_URL__?.trim();
  return value || undefined;
}

export function normalizeApiUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+/i.test(trimmed))
    throw new Error("Enter the full server URL, starting with http:// or https://");
  return trimmed;
}

let currentApiUrl = normalizeApiUrl(runtimeApiUrl() || DEFAULT_API_URL);

export function getApiUrl() {
  return currentApiUrl;
}

/** Loads the address a person saved in the app, falling back to the build/runtime default. */
export async function loadStoredApiUrl() {
  try {
    const stored = await AsyncStorage.getItem(API_URL_STORAGE_KEY);
    if (stored) currentApiUrl = normalizeApiUrl(stored);
  } catch {
    // A broken or unavailable store must not stop the person from entering a server.
  }
  return currentApiUrl;
}

export async function saveApiUrl(value: string) {
  const url = normalizeApiUrl(value);
  currentApiUrl = url;
  try {
    await AsyncStorage.setItem(API_URL_STORAGE_KEY, url);
  } catch {
    // Keep the address for this run even if the device cannot persist it.
  }
  return url;
}

export class MuseApi {
  constructor(readonly token: string) {}
  async request<T>(path: string, body?: unknown, method?: string): Promise<T> {
    const response = await fetch(`${getApiUrl()}${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body === undefined || body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(
        typeof payload.error === "string" ? payload.error : `Request failed (${response.status})`,
      );
    return payload;
  }
  url(path: string) {
    return path.startsWith("http") ? path : `${getApiUrl()}${path}`;
  }
}

export async function createSession(
  accessKey?: string,
): Promise<{ token: string; mode: "sample" | "live" }> {
  const response = await fetch(`${getApiUrl()}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessKey }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Could not open your workspace.");
  return payload;
}
