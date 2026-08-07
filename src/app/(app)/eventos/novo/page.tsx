import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_QUALIFICATIONS, toInputDate } from "@/lib/utils";

import { CERTIFICATE_PLACEHOLDER, EventForm } from "../event-form";

export const metadata = { title: "Novo evento" };

export default async function NewEventPage() {
  await requireAdmin();
  const today = toInputDate(new Date());

  return (
    <>
      <PageHeader title="Novo evento" subtitle="Preencha os dados básicos — tudo pode ser ajustado depois." />
      <EventForm
        cancelHref="/"
        values={{
          name: "",
          description: "",
          location: "",
          organizer: "",
          startDate: today,
          endDate: today,
          workloadHours: "",
          qualifications: DEFAULT_QUALIFICATIONS.join("\n"),
          certificateText: CERTIFICATE_PLACEHOLDER,
          minAttendanceDays: 0,
        }}
      />
    </>
  );
}
