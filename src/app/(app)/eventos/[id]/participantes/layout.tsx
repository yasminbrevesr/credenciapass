import { requireAdmin } from "@/lib/auth";

export default async function ParticipantsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
