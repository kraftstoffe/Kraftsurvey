import { AdminShell } from "@/components/admin-shell";

export default function SurveysLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
