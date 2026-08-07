import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildParticipantsWorkbook } from "@/lib/reports";
import { slugify } from "@/lib/utils";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/eventos/[id]/relatorios/inscritos">,
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { id }, select: { name: true } });
  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  const buffer = await buildParticipantsWorkbook(id);
  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inscritos-${slugify(event.name)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
