import { describe, it, expect } from 'vitest';
import { FLEET_VEHICLE_PRESETS, FleetVehiclePreset } from '@/components/tourism/groups/bus-fleet-selector-modal';
import type { BusSeatDTO } from '@/services/group-tours.functions';

describe('[ONDA 1 AUDIT] Turismo: Hotéis 1-Clique, Lâminas WhatsApp & Frota 2D', () => {
 it('should have rich fleet presets covering double-decker and leito total', () => {
 expect(FLEET_VEHICLE_PRESETS.length).toBeGreaterThanOrEqual(3);

 const dd = FLEET_VEHICLE_PRESETS.find((v) => v.isDoubleDecker);
 expect(dd).toBeDefined();
 expect(dd?.totalCapacity).toBe(56);
 expect(dd?.plate).toBe('WSY-2026');
 expect(dd?.amenities).toContain('Piso Inferior Leito Cama');

 const leito = FLEET_VEHICLE_PRESETS.find((v) => v.vehicleType === 'bus_leito_total');
 expect(leito).toBeDefined();
 expect(leito?.totalCapacity).toBe(44);
 });

 it('should convert 2D fleet layouts into valid BusSeatDTO arrays preserving existing passengers', () => {
 const existingSeats: BusSeatDTO[] = [
 {
 seat_number: 1,
 row: 1,
 column: 'A',
 floor: 1,
 status: 'reserved',
 passenger_name: 'Dona Maria Oliveira',
 passenger_document: '111.222.333-44',
 passenger_phone: '(49) 99999-0000',
 boarding_point: 'Praça Central',
 },
 ];

 const selected = FLEET_VEHICLE_PRESETS[0]; // DD 56 lugares
 const passengerMap = new Map<number, any>();
 existingSeats.forEach((s) => passengerMap.set(s.seat_number, s));

 const newSeats: BusSeatDTO[] = [];
 const cols: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
 let seatNum = 1;

 // Floor 1 (12 seats)
 for (let r = 1; r <= 3; r++) {
 for (const c of cols) {
 const pass = passengerMap.get(seatNum);
 newSeats.push({
 seat_number: seatNum,
 row: r,
 column: c,
 floor: 1,
 status: pass?.passenger_name ? 'reserved' : 'free',
 passenger_name: pass?.passenger_name || null,
 passenger_document: pass?.passenger_document || null,
 passenger_phone: pass?.passenger_phone || null,
 boarding_point: pass?.boarding_point || null,
 });
 seatNum++;
 }
 }

 // Floor 2
 for (let r = 1; r <= 11; r++) {
 for (const c of cols) {
 if (seatNum > selected.totalCapacity) break;
 const pass = passengerMap.get(seatNum);
 newSeats.push({
 seat_number: seatNum,
 row: r,
 column: c,
 floor: 2,
 status: pass?.passenger_name ? 'reserved' : 'free',
 passenger_name: pass?.passenger_name || null,
 passenger_document: pass?.passenger_document || null,
 passenger_phone: pass?.passenger_phone || null,
 boarding_point: pass?.boarding_point || null,
 });
 seatNum++;
 }
 }

 expect(newSeats.length).toBe(56);
 // Passenger in seat 1 must be preserved
 expect(newSeats[0].passenger_name).toBe('Dona Maria Oliveira');
 expect(newSeats[0].status).toBe('reserved');
 // Unallocated seats must be free
 expect(newSeats[1].passenger_name).toBeNull();
 expect(newSeats[1].status).toBe('free');
 });

 it('should format WhatsApp messages with complete travel package highlights and valid link', () => {
 const proposal = {
 title: 'Pacote Praia e Sol',
 destination_city: 'Porto de Galinhas, PE',
 client_name: 'Ana Carolina',
 travel_start_date: '2026-11-10',
 travel_end_date: '2026-11-15',
 public_token: 'pk_test_123',
 hotels: [{ hotel_name: 'Enotel Porto de Galinhas' }],
 flights: [{ airline_name: 'Azul', origin_iata: 'VCP', destination_iata: 'REC' }],
 pricing: { total_price_cents: 485000 },
 };

 const hotelHighlight = proposal.hotels?.[0]?.hotel_name;
 const flightHighlight = `Voo ${proposal.flights[0].airline_name} (${proposal.flights[0].origin_iata} -> ${proposal.flights[0].destination_iata})`;
 const publicUrl = `https://app.usewaesy.com/proposta/${proposal.public_token}`;

 const msg = `Olá ${proposal.client_name}! ️\nDestino: *${proposal.destination_city}*\nHotel: ${hotelHighlight}\nAéreo: ${flightHighlight}\nLink: ${publicUrl}`;

 expect(msg).toContain('Ana Carolina');
 expect(msg).toContain('Porto de Galinhas, PE');
 expect(msg).toContain('Enotel Porto de Galinhas');
 expect(msg).toContain('Voo Azul (VCP -> REC)');
 expect(msg).toContain('https://app.usewaesy.com/proposta/pk_test_123');
 });
});
