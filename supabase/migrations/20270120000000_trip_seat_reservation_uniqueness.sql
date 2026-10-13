-- W11/W4: a mesma poltrona não pode ter duas reservas ativas para a mesma experiência.
-- O índice parcial torna a garantia atômica no banco; o BFF traduz 23505 para erro de domínio.
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_seat_reservations_active_seat
  ON public.trip_seat_reservations (experience_id, seat_number)
  WHERE status IN ('reserved', 'confirmed', 'boarded');
