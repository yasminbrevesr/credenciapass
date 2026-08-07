import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { buildCertificatePdf } from "@/lib/certificate";
import { prepareCertificate } from "@/lib/certificate-service";
import { slugify } from "@/lib/utils";

export async function GET(_request: Request, ctx: RouteContext<"/api/eventos/[id]/certificados/[participantId]">) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id, participantId } = await ctx.params;
  const data = await prepareCertificate(id, participantId, user.id);

  if (!data) {
    return NextResponse.json(
      { error: "Inscrito não encontrado ou sem a presença mínima exigida." },
      { status: 404 },
    );
  }

  const pdf = await buildCertificatePdf([data]);
  const fileName = `${slugify(data.participantName)}-certificado-${slugify(data.eventName)}.pdf`;
  const encodedName = encodeURIComponent(`${data.participantName} - Certificado - ${data.eventName}.pdf`);

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "no-store",
    },
  });
}
