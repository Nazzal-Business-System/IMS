import { PremiumShell } from "@/components/layout/premium-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PremiumShell>{children}</PremiumShell>;
}
