export interface Movie {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  duration_mins: number;
  genre: string;
  rating: string;
  release_date: string;
}

export interface Showtime {
  id: string;
  movie_id: string;
  theatre_id: string;
  screen_name: string;
  start_time: string;
  price_amount: number;
  movie_title?: string;
  poster_url?: string;
  duration_mins?: number;
  genre?: string;
  rating?: string;
  theatre_name?: string;
  location?: string;
}

export interface Seat {
  seat_code: string;
  row_label: string;
  seat_number: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  held_by_user_id?: string;
  hold_expires_at?: string;
  booking_ref?: string;
}

export interface Booking {
  booking_ref: string;
  showtime_id: string;
  seat_id: string;
  user_id: string;
  user_phone?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  payment_id?: string;
  seat_code?: string;
  screen_name?: string;
  movie_title?: string;
  created_at?: string;
}
