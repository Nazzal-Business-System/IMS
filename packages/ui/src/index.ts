export const theme = {
  colors: {
    navy950: "#0a0e1a",
    navy900: "#0f1629",
    navy800: "#151d35",
    navy700: "#1e2a4a",
    teal400: "#2dd4bf",
    teal500: "#14b8a6",
    blue400: "#60a5fa",
    purple400: "#a78bfa",
    purple500: "#8b5cf6",
  },
};

export const DEMO_NOTICE =
  "This is a demo environment. Data may reset periodically.";

export const DEMO_CREDENTIALS = [
  { role: "Admin", email: "admin@nazzal.demo", password: "admin123" },
  { role: "Manager", email: "manager@nazzal.demo", password: "manager123" },
  { role: "Viewer", email: "viewer@nazzal.demo", password: "viewer123" },
] as const;
