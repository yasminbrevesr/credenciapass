import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inscritos");
  sheet.columns = [
    { header: "Nome", key: "name", width: 30 },
    { header: "Documento", key: "document", width: 20 },
    { header: "E-mail", key: "email", width: 30 },
    { header: "Telefone", key: "phone", width: 18 },
    { header: "Qualificação", key: "qualification", width: 18 },
    { header: "Instituição", key: "organization", width: 28 },
    { header: "Cargo", key: "position", width: 22 },
    { header: "Observações", key: "notes", width: 32 },
  ];
  sheet.addRow({
    name: "Maria da Silva",
    document: "123.456.789-00",
    email: "maria@exemplo.com",
    phone: "(11) 99999-9999",
    qualification: "Participante",
    organization: "Instituição Exemplo",
    position: "Analista",
    notes: "",
  });
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-inscritos.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
