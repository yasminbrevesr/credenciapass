import "server-only";

import ExcelJS from "exceljs";

import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatDocument, formatPhone, parseQualifications } from "@/lib/utils";

export type ReportEvent = NonNullable<Awaited<ReturnType<typeof loadEventForReports>>>;

export async function loadEventForReports(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: { days: { orderBy: { date: "asc" } } },
  });
}

export async function loadParticipants(eventId: string) {
  return prisma.participant.findMany({
    where: { eventId },
    orderBy: { name: "asc" },
    include: { attendances: true },
  });
}

export type QualificationSummary = { qualification: string; total: number; percent: number };

export function summarizeByQualification(
  event: { qualifications: string },
  participants: Array<{ qualification: string }>,
): QualificationSummary[] {
  const counts = new Map<string, number>();
  for (const qualification of parseQualifications(event.qualifications)) counts.set(qualification, 0);
  for (const participant of participants) {
    counts.set(participant.qualification, (counts.get(participant.qualification) ?? 0) + 1);
  }

  const total = participants.length || 1;
  return [...counts.entries()]
    .map(([qualification, count]) => ({
      qualification,
      total: count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

export type DaySummary = {
  id: string;
  date: Date;
  present: number;
  absent: number;
  percent: number;
};

export function summarizeByDay(
  days: Array<{ id: string; date: Date }>,
  participants: Array<{ attendances: Array<{ eventDayId: string }> }>,
): DaySummary[] {
  const total = participants.length;
  return days.map((day) => {
    const present = participants.filter((participant) =>
      participant.attendances.some((attendance) => attendance.eventDayId === day.id),
    ).length;
    return {
      id: day.id,
      date: day.date,
      present,
      absent: total - present,
      percent: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  });
}

function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CredenciaPass";
  workbook.created = new Date();
  return workbook;
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4BD8" } };
  header.alignment = { vertical: "middle" };
  header.height = 20;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildParticipantsWorkbook(eventId: string): Promise<ExcelJS.Buffer> {
  const event = await loadEventForReports(eventId);
  if (!event) throw new Error("Evento não encontrado");
  const participants = await loadParticipants(eventId);

  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet("Inscritos");
  sheet.columns = [
    { header: "Nome", key: "name", width: 34 },
    { header: "Documento", key: "document", width: 20 },
    { header: "Qualificação", key: "qualification", width: 18 },
    { header: "E-mail", key: "email", width: 30 },
    { header: "Celular", key: "phone", width: 18 },
    { header: "Instituição / empresa", key: "organization", width: 28 },
    { header: "Cargo / função", key: "position", width: 22 },
    { header: "Código do crachá", key: "code", width: 16 },
    { header: "Presenças", key: "attendances", width: 12 },
    { header: "Inscrito em", key: "createdAt", width: 18 },
  ];
  for (const participant of participants) {
    sheet.addRow({
      name: participant.name || "S/N",
      document: formatDocument(participant.document) || "S/N",
      qualification: participant.qualification || "S/N",
      email: participant.email || "S/N",
      phone: formatPhone(participant.phone) || "S/N",
      organization: participant.organization || "S/N",
      position: participant.position || "S/N",
      code: participant.code || "S/N",
      attendances: participant.attendances.length,
      createdAt: formatDateTime(participant.createdAt),
    });
  }
  styleHeader(sheet);

  const summary = workbook.addWorksheet("Por qualificação");
  summary.columns = [
    { header: "Qualificação", key: "qualification", width: 26 },
    { header: "Inscritos", key: "total", width: 12 },
    { header: "% do total", key: "percent", width: 12 },
  ];
  for (const row of summarizeByQualification(event, participants)) {
    summary.addRow({ qualification: row.qualification || "S/N", total: row.total, percent: `${row.percent}%` });
  }
  summary.addRow({ qualification: "TOTAL", total: participants.length, percent: "100%" }).font = { bold: true };
  styleHeader(summary);

  return workbook.xlsx.writeBuffer();
}

export async function buildAttendanceWorkbook(eventId: string): Promise<ExcelJS.Buffer> {
  const event = await loadEventForReports(eventId);
  if (!event) throw new Error("Evento não encontrado");
  const participants = await loadParticipants(eventId);

  const workbook = createWorkbook();
  const perDay = workbook.addWorksheet("Resumo por dia");
  perDay.columns = [
    { header: "Dia", key: "date", width: 16 },
    { header: "Presentes", key: "present", width: 12 },
    { header: "Ausentes", key: "absent", width: 12 },
    { header: "% presença", key: "percent", width: 12 },
  ];
  for (const day of summarizeByDay(event.days, participants)) {
    perDay.addRow({ date: formatDate(day.date), present: day.present, absent: day.absent, percent: `${day.percent}%` });
  }
  styleHeader(perDay);

  const matrix = workbook.addWorksheet("Presença geral");
  matrix.columns = [
    { header: "Nome", key: "name", width: 34 },
    { header: "Documento", key: "document", width: 20 },
    { header: "Qualificação", key: "qualification", width: 18 },
    ...event.days.map((day) => ({ header: formatDate(day.date), key: day.id, width: 13 })),
    { header: "Total de dias", key: "total", width: 14 },
  ];
  for (const participant of participants) {
    const row: Record<string, string | number> = {
      name: participant.name || "S/N",
      document: formatDocument(participant.document) || "S/N",
      qualification: participant.qualification || "S/N",
      total: participant.attendances.length,
    };
    for (const day of event.days) {
      const attendance = participant.attendances.find((item) => item.eventDayId === day.id);
      row[day.id] = attendance ? formatDateTime(attendance.checkedInAt) : "Ausente";
    }
    matrix.addRow(row);
  }
  styleHeader(matrix);

  for (const day of event.days) {
    const sheet = workbook.addWorksheet(`Dia ${formatDate(day.date).replace(/\//g, "-")}`);
    sheet.columns = [
      { header: "Nome", key: "name", width: 34 },
      { header: "Documento", key: "document", width: 20 },
      { header: "Qualificação", key: "qualification", width: 18 },
      { header: "Situação", key: "status", width: 14 },
      { header: "Horário do check-in", key: "time", width: 20 },
      { header: "Forma", key: "method", width: 16 },
    ];
    for (const participant of participants) {
      const attendance = participant.attendances.find((item) => item.eventDayId === day.id);
      sheet.addRow({
        name: participant.name || "S/N",
        document: formatDocument(participant.document) || "S/N",
        qualification: participant.qualification || "S/N",
        status: attendance ? "Presente" : "Ausente",
        time: attendance ? formatDateTime(attendance.checkedInAt) : "S/N",
        method: attendance ? (attendance.method === "QRCODE" ? "Leitura de código" : "Manual") : "S/N",
      });
    }
    styleHeader(sheet);
  }

  return workbook.xlsx.writeBuffer();
}
