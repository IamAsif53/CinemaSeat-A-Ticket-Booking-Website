-- CinemaSeat Database Schema

CREATE TABLE IF NOT EXISTS movies (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    poster_url TEXT,
    duration_mins INT NOT NULL,
    genre VARCHAR(100),
    rating VARCHAR(20),
    release_date VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS theatres (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    total_screens INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS showtimes (
    id VARCHAR(50) PRIMARY KEY,
    movie_id VARCHAR(50) REFERENCES movies(id) ON DELETE CASCADE,
    theatre_id VARCHAR(50) REFERENCES theatres(id) ON DELETE CASCADE,
    screen_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    price_amount INT NOT NULL DEFAULT 450,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seats (
    id VARCHAR(50) PRIMARY KEY,
    theatre_id VARCHAR(50) REFERENCES theatres(id) ON DELETE CASCADE,
    row_label VARCHAR(10) NOT NULL,
    seat_number INT NOT NULL,
    seat_code VARCHAR(20) NOT NULL,
    UNIQUE(theatre_id, row_label, seat_number)
);

CREATE TABLE IF NOT EXISTS showtime_seats (
    id VARCHAR(50) PRIMARY KEY,
    showtime_id VARCHAR(50) REFERENCES showtimes(id) ON DELETE CASCADE,
    seat_id VARCHAR(50) REFERENCES seats(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'HELD', 'BOOKED'
    held_by_user_id VARCHAR(100),
    hold_expires_at TIMESTAMP WITH TIME ZONE,
    booking_ref VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(showtime_id, seat_id)
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_ref VARCHAR(100) PRIMARY KEY,
    showtime_id VARCHAR(50) REFERENCES showtimes(id),
    seat_id VARCHAR(50) REFERENCES seats(id),
    user_id VARCHAR(100) NOT NULL,
    user_phone VARCHAR(50),
    amount INT NOT NULL,
    currency VARCHAR(10) DEFAULT 'BDT',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED'
    payment_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gateway_callbacks (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100),
    booking_ref VARCHAR(100),
    payment_id VARCHAR(100),
    status VARCHAR(50),
    amount INT,
    payload JSONB,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
