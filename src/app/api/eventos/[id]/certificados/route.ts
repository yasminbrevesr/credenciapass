import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { buildCertificatePdf, type CertificateData } from "@/lib/certificate";
import { prepareCertificate } from "@/lib/certificate-service";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

/** Gera um único PDF com o certificado de vários inscritos (uma página cada). */
export async function GET(request: Request, ctx: RouteContext<"/api/eventos/[id]/certificados">) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  const qualification = searchParams.get("qualificacao") ?? "";

  const participants = await prisma.participant.findMany({
    where: {
      eventId: id,
      ...(ids.length > 0 ? { id: { in: ids } } : {}),
      ...(qualification ? { qualification } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true },
  });

  const items: CertificateData[] = [];
  for (const participant of participants) {
    const data = await prepareCertificate(id, participant.id, user.id);
    if (data) items.push(data);
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Nenhum inscrito elegível para certificado nesta seleção." },
      { status: 404 },
    );
  }

  const pdf = await buildCertificatePdf(items);

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificados-${slugify(event.name)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
