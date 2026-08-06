"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { buildCertificatePdf } from "@/lib/certificate";
import { prepareCertificate } from "@/lib/certificate-service";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

function messageUrl(eventId: string, type: "ok" | "erro", message: string) {
  return `/eventos/${eventId}/certificados?${type}=${encodeURIComponent(message)}`;
}

export async function sendCertificateEmailAction(formData: FormData) {
  const user = await requireUser();
  const eventId = String(formData.get("eventId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    redirect(messageUrl(eventId, "erro", "Configure RESEND_API_KEY e EMAIL_FROM no arquivo .env."));
  }

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, eventId },
    include: { event: true },
  });
  if (!participant?.email) {
    redirect(messageUrl(eventId, "erro", "O participante não possui e-mail cadastrado."));
  }

  const data = await prepareCertificate(eventId, participantId, user.id);
  if (!data) {
    redirect(messageUrl(eventId, "erro", "Participante sem a presença mínima para certificado."));
  }

  const certificate = await prisma.certificate.findUnique({ where: { participantId } });
  if (!certificate) {
    redirect(messageUrl(eventId, "erro", "Não foi possível preparar o certificado."));
  }

  const history = await prisma.certificateEmail.create({
    data: {
      certificateId: certificate.id,
      participantId,
      sentById: user.id,
      recipient: participant.email,
      status: "PENDING",
    },
  });

  try {
    const pdf = await buildCertificatePdf([data]);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [participant.email],
        subject: `Certificado — ${participant.event.name}`,
        html: `<p>Olá, ${participant.name}.</p><p>Segue em anexo o seu certificado do evento <strong>${participant.event.name}</strong>.</p><p>Código de validação: <strong>${certificate.code}</strong></p>`,
        attachments: [
          {
            filename: `certificado-${slugify(participant.name)}.pdf`,
            content: Buffer.from(pdf).toString("base64"),
          },
        ],
      }),
    });

    const result = (await response.json()) as { id?: string; message?: string; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(result.message ?? result.error?.message ?? "Falha no provedor de e-mail.");
    }

    await prisma.certificateEmail.update({
      where: { id: history.id },
      data: { status: "SENT", providerId: result.id ?? null, sentAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao enviar e-mail.";
    await prisma.certificateEmail.update({
      where: { id: history.id },
      data: { status: "FAILED", errorMessage: message },
    });
    redirect(messageUrl(eventId, "erro", `Falha ao enviar: ${message}`));
  }

  redirect(messageUrl(eventId, "ok", `Certificado enviado para ${participant.email}.`));
}
