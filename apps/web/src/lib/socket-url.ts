const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function getSocketUrl() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (socketUrl) return socketUrl.replace(/\/$/, "");
  return API_URL.replace(/\/api\/?$/, "");
}
