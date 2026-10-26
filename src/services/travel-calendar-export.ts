/**
 * travel-calendar-export.ts — Gerador Canônico de iCalendar (.ics / RFC 5545)
 * Padrão Open-Source (Inspirado em davinoishi/my-trip-planner e Duffel API)
 * Exportação universal para Apple Calendar, Google Calendar e Outlook.
 */

export interface CalendarFlightEvent {
  direction?: string;
  airline: string;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  arrivalDate?: string;
  pnr?: string;
}

export interface CalendarHotelEvent {
  hotelName: string;
  hotelAddress?: string;
  checkinDate?: string;
  checkoutDate?: string;
  confirmationId?: string;
  mealPlan?: string;
}

export interface TripCalendarExportData {
  reservationCode: string;
  destination: string;
  operatorName: string;
  travelStartDate?: string;
  travelEndDate?: string;
  flights?: CalendarFlightEvent[];
  hotel?: CalendarHotelEvent;
}

/**
 * Formata data e hora para o formato iCalendar RFC 5545 (ex: 20261115T140000Z)
 */
function formatIcsDateTime(dateStr?: string, timeStr?: string, defaultHour = "12:00"): string {
  if (!dateStr) {
    const now = new Date();
    return now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  }

  // Se vier no formato DD/MM/YYYY, converter para YYYY-MM-DD
  let normalizedDate = dateStr.trim();
  if (normalizedDate.includes("/")) {
    const parts = normalizedDate.split("/");
    if (parts.length === 3) {
      normalizedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  const cleanTime = (timeStr || defaultHour).trim().replace(/h/i, ":");
  const timeParts = cleanTime.split(":");
  const hours = (timeParts[0] || "12").padStart(2, "0");
  const minutes = (timeParts[1] || "00").padStart(2, "0");

  const cleanDate = normalizedDate.replace(/-/g, "");
  return `${cleanDate}T${hours}${minutes}00`;
}

/**
 * Escapa caracteres reservados do padrão iCalendar
 */
function escapeIcsText(text: string): string {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Gera o conteúdo textual completo de um arquivo .ics
 */
export function generateTripIcsContent(data: TripCalendarExportData): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Waesy Turismo//Viagem Canônica//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Viagem para ${escapeIcsText(data.destination)} (#${escapeIcsText(data.reservationCode)})`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
  ];

  // 1. Eventos de Voo
  if (data.flights && data.flights.length > 0) {
    data.flights.forEach((fl, idx) => {
      const isOutbound = fl.direction === "ida" || idx === 0;
      const flightDate = fl.departureDate || (isOutbound ? data.travelStartDate : data.travelEndDate);
      const dtStart = formatIcsDateTime(flightDate, fl.departureTime, isOutbound ? "08:00" : "18:00");
      const dtEnd = formatIcsDateTime(flightDate, fl.arrivalTime, isOutbound ? "11:00" : "21:00");

      const uid = `flight-${data.reservationCode}-${fl.flightNumber || idx}-${idx}@waesy.app`;
      const summary = `Voo ${fl.airline} ${fl.flightNumber} (${fl.originIata} -> ${fl.destinationIata})`;
      const desc = `Localizador PNR: ${fl.pnr || "CONFIRMED"}\\nCompanhia: ${fl.airline}\\nOperadora: ${data.operatorName}\\nReserva Waesy: #${data.reservationCode}`;

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${desc}`,
        `LOCATION:Aeroporto de ${escapeIcsText(fl.originIata)}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });
  }

  // 2. Evento de Hospedagem / Hotel
  if (data.hotel && data.hotel.hotelName) {
    const checkin = data.hotel.checkinDate || data.travelStartDate;
    const checkout = data.hotel.checkoutDate || data.travelEndDate;
    const dtStart = formatIcsDateTime(checkin, "14:00");
    const dtEnd = formatIcsDateTime(checkout, "12:00");

    const uid = `hotel-${data.reservationCode}-${data.hotel.confirmationId || "ht"}@waesy.app`;
    const summary = `Hospedagem: ${data.hotel.hotelName}`;
    const desc = `Voucher de Hospedagem: ${data.hotel.confirmationId || data.reservationCode}\\nRegime: ${data.hotel.mealPlan || "Conforme Contrato"}\\nReserva: #${data.reservationCode}\\nOperadora: ${data.operatorName}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${escapeIcsText(data.hotel.hotelAddress || data.destination)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Dispara o download do arquivo .ics no navegador do viajante
 */
export function downloadTripIcsFile(data: TripCalendarExportData): void {
  const content = generateTripIcsContent(data);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeCode = (data.reservationCode || "reserva").replace(/[^a-zA-Z0-9_-]/g, "");
  link.download = `viagem-${safeCode}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
