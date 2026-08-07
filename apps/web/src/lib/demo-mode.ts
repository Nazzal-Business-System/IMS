/**
 * Demo UI flags (public, build-time).
 * Production deployments should set NEXT_PUBLIC_SHOW_DEMO_LOGIN=false
 * (and optionally NEXT_PUBLIC_SHOW_DEMO_BANNER=false) on Vercel.
 */
export function showDemoLogin(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false";
}

export function showDemoBanner(): boolean {
  const banner = process.env.NEXT_PUBLIC_SHOW_DEMO_BANNER;
  if (banner === "false") return false;
  if (banner === "true") return true;
  // Default follows login panel visibility
  return showDemoLogin();
}
