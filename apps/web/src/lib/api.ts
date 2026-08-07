const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ims_token");
}

/** API origin without `/api` — used for static assets such as avatars. */
export function getApiOrigin(): string {
  const socket = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, "");
  if (socket) return socket;
  return API_URL.replace(/\/api\/?$/, "");
}

/** Resolve a stored media path (e.g. `/uploads/avatars/...`) to an absolute URL. */
export function resolveMediaUrl(
  path: string | null | undefined,
  cacheKey?: string | number | null
): string | null {
  if (!path) return null;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  const origin = getApiOrigin();
  const absolute = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  if (cacheKey == null || cacheKey === "") return absolute;
  const sep = absolute.includes("?") ? "&" : "?";
  return `${absolute}${sep}v=${encodeURIComponent(String(cacheKey))}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiClientError(
      "Cannot reach API. Is the server running on port 4000?",
      0
    );
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : res.status === 500
          ? "Server error — check API logs and database connection"
          : "Request failed";
    throw new ApiClientError(message, res.status, data.details);
  }

  return data as T;
}

/** Multipart upload helper — does not force JSON Content-Type. */
export function apiUpload<T>(
  path: string,
  formData: FormData,
  options?: { onProgress?: (percent: number) => void; signal?: AbortSignal }
): Promise<T> {
  const token = getToken();
  const url = `${API_URL}${path}`;

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options?.onProgress) return;
      options.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let data: { error?: string; details?: unknown } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}") as typeof data;
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
        return;
      }
      reject(
        new ApiClientError(
          typeof data.error === "string" ? data.error : "Upload failed",
          xhr.status,
          data.details
        )
      );
    };

    xhr.onerror = () => {
      reject(
        new ApiClientError("Cannot reach API. Is the server running on port 4000?", 0)
      );
    };

    xhr.onabort = () => {
      reject(new ApiClientError("Upload cancelled", 0));
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(formData);
  });
}
