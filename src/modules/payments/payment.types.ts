export interface CreateBookingInput {
  facilityId: string;
  courtId: string;
  bookingDate: string;
  startTime: string;
}

export interface CancelBookingInput {
  reason?: string;
}
