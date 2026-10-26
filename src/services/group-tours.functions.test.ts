import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @tanstack/react-start
vi.mock("@tanstack/react-start", () => ({
  createServerFn: vi.fn(() => {
    const fnBuilder: any = {
      validator: vi.fn((validatorFn: any) => {
        fnBuilder._validator = validatorFn;
        return fnBuilder;
      }),
      handler: vi.fn((handlerFn: any) => {
        const callable = async (args: any) => {
          let data = args?.data;
          if (fnBuilder._validator && data !== undefined) {
            data = typeof fnBuilder._validator === "function"
              ? fnBuilder._validator(data)
              : fnBuilder._validator.parse(data);
          }
          return handlerFn({ data });
        };
        callable.handler = handlerFn;
        return callable;
      }),
    };
    return fnBuilder;
  }),
}));

// Mock Supabase Server Client
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

const createQueryBuilder = () => {
  const builder: any = {
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  };
  return builder;
};

const clientInstance = createQueryBuilder();

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => clientInstance,
  getAnonServerClient: () => clientInstance,
}));

vi.mock("@/services/identity.functions", () => ({
  getServerIdentity: () => Promise.resolve({ id: "agent-123", email: "agente@waesy.com" }),
}));

import {
  generateDefaultBusSeats,
  validateGroupTourAccessPassword,
  autoPairSharedRooms,
  bookGroupTourReservation,
} from "./group-tours.functions";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("Group Tours Contract & Engine Shield (Microfase 75B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gera mapa padrão de 46 assentos com corredores e numeração correta", () => {
    const seats = generateDefaultBusSeats(46);
    expect(seats).toHaveLength(46);

    // Primeiro assento é 1, janela esquerda (A) piso 1
    expect(seats[0]).toMatchObject({
      seat_number: 1,
      row: 1,
      column: "A",
      floor: 1,
      status: "free",
      passenger_name: null,
    });

    // Último assento é 46
    expect(seats[45]).toMatchObject({
      seat_number: 46,
      floor: 1,
      status: "free",
      passenger_name: null,
    });
  });

  it("garante que todos os assentos comecem livres e sem dados pessoais", () => {
    const seats = generateDefaultBusSeats(40);
    expect(seats).toHaveLength(40);
    expect(seats.every((s) => s.passenger_name === null)).toBe(true);
    expect(seats.every((s) => s.passenger_document === null)).toBe(true);
    expect(seats.every((s) => s.passenger_phone === null)).toBe(true);
    expect(seats.every((s) => s.boarding_point === null)).toBe(true);
    expect(seats.every((s) => s.status === "free")).toBe(true);
  });

  it("valida proteção de senha para grupos restritos", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: VALID_UUID,
        description: JSON.stringify({
          access_password: "SEGREDO",
          visibility_mode: "password_protected",
        }),
      },
      error: null,
    });

    const resCorrect = await validateGroupTourAccessPassword({
      data: { tourId: VALID_UUID, password: "SEGREDO" },
    });
    expect(resCorrect.authorized).toBe(true);

    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: VALID_UUID,
        description: JSON.stringify({
          access_password: "SEGREDO",
          visibility_mode: "password_protected",
        }),
      },
      error: null,
    });

    const resWrong = await validateGroupTourAccessPassword({
      data: { tourId: VALID_UUID, password: "ERRADA" },
    });
    expect(resWrong.authorized).toBe(false);
  });

  it("calcula reserva com quarto compartilhado sem suplemento single e delega tokens de acompanhantes", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: VALID_UUID,
        title: "Excursão Serra Gaúcha",
        price_cents: 80000,
        total_seats: 46,
        available_seats: 40,
        store_id: VALID_UUID,
        seats: [
          { seat_number: 5, status: "free" },
          { seat_number: 6, status: "free" },
        ],
      },
      error: null,
    });

    // Segunda chamada para o token do acompanhante
    mockSingle.mockResolvedValueOnce({
      data: { token: "tok-acompanhante-1" },
      error: null,
    });

    const result = await bookGroupTourReservation({
      data: {
        tourId: VALID_UUID,
        primaryContact: {
          name: "Joao Silva",
          email: "joao@exemplo.com",
          phone: "49999999999",
          document: "123.456.789-00",
        },
        adultsCount: 2,
        childrenCount: 0,
        childrenAges: [],
        roomPreference: "shared",
        selectedSeats: [5, 6],
        delegateCompanionForms: true,
        paymentMethod: "pix",
      },
    });

    expect(result.success).toBe(true);
    expect(result.companionTokens).toHaveLength(1);
    expect(result.totalCents).toBe(160000); // 2 adultos * 80000 (sem taxa single)
  });

  it("executa pareamento automático de quartos compartilhados no rooming list", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: VALID_UUID,
        rooms: [],
        seats: [
          { seat_number: 1, status: "reserved", passenger_name: "Carlos Solo" },
          { seat_number: 2, status: "reserved", passenger_name: "Marcos Solo" },
        ],
      },
      error: null,
    });

    const pairResult = await autoPairSharedRooms({
      data: { tourId: VALID_UUID },
    });

    expect(pairResult.success).toBe(true);
    expect(pairResult.pairedCount).toBe(2);
    expect(pairResult.roomsCreated).toBe(1);
  });
});
