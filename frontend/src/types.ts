export interface Movie {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  duration_mins: number;
  genre: string;
  rating: string;
  release_date: string;
  imdb_rating?: number;
  badge?: 'HOT RUSH' | 'FEATURED' | 'IMAX 3D' | 'PREMIERE' | 'DOLBY ATMOS';
}

export interface Showtime {
  id: string;
  movie_id: string;
  theatre_id?: string;
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
  hall_name?: string;
}

export interface Seat {
  id?: string;
  showtime_id?: string;
  seat_code: string;
  row_label?: string;
  seat_number?: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  held_by_user_id?: string | null;
  hold_expires_at?: string | null;
  booking_ref?: string | null;
}

export interface SnackItem {
  id: string;
  name: string;
  category: 'Popcorn' | 'Drinks' | 'Combos' | 'Snacks';
  price: number;
  image_url: string;
  quantity: number;
  badge?: string;
}

export interface Booking {
  id?: string;
  booking_ref: string;
  showtime_id: string;
  seat_id?: string;
  user_id?: string;
  user_phone?: string;
  amount: number;
  currency?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  payment_id?: string;
  seat_code?: string;
  screen_name?: string;
  movie_title?: string;
  poster_url?: string;
  created_at?: string;
  snacks?: SnackItem[];
}
