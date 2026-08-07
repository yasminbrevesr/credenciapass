import { requireAdmin } from "@/lib/auth";

export default async function LabelsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
