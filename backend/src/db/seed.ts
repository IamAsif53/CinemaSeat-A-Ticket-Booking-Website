import { pool, initDb } from './index.js';

export async function seedDb() {
  await initDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert Movies
    await client.query(`
      INSERT INTO movies (id, title, description, poster_url, duration_mins, genre, rating, release_date)
      VALUES 
      (
        'movie-spiderman',
        'Spider-Man: Brand New Day',
        'Zayan has been waiting months for this. The midnight premiere seats just went live at 8 PM sharp.',
        'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&q=80',
        150,
        'Action / Sci-Fi',
        'PG-13',
        '2026-08-08'
      ),
      (
        'movie-oppenheimer',
        'Oppenheimer',
        'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
        180,
        'Biography / Drama',
        'R',
        '2026-08-07'
      ),
      (
        'movie-avatar',
        'Avatar: Fire and Ash',
        'Return to Pandora for an epic new journey into uncharted territories.',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
        192,
        'Adventure / Sci-Fi',
        'PG-13',
        '2026-12-18'
      )
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, poster_url = EXCLUDED.poster_url;
    `);

    // 2. Insert Theatre
    await client.query(`
      INSERT INTO theatres (id, name, location, total_screens)
      VALUES ('theatre-cuet', 'CUET Grand Cinema', 'CUET Campus, Chittagong', 3)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `);

    // 3. Insert Showtimes
    await client.query(`
      INSERT INTO showtimes (id, movie_id, theatre_id, screen_name, start_time, price_amount)
      VALUES 
      ('showtime-spiderman-8pm', 'movie-spiderman', 'theatre-cuet', 'Hall 1 (IMAX)', '2026-08-08T20:00:00Z', 450),
      ('showtime-spiderman-11pm', 'movie-spiderman', 'theatre-cuet', 'Hall 1 (IMAX)', '2026-08-08T23:00:00Z', 450),
      ('showtime-oppenheimer-6pm', 'movie-oppenheimer', 'theatre-cuet', 'Hall 2 (VIP)', '2026-08-08T18:00:00Z', 400)
      ON CONFLICT (id) DO UPDATE SET price_amount = EXCLUDED.price_amount;
    `);

    // 4. Insert Seats (Rows A through F, Seats 1 through 15)
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seatCountPerRow = 15;

    for (const r of rows) {
      for (let num = 1; num <= seatCountPerRow; num++) {
        const seatId = `seat-${r}${num}`;
        const seatCode = `${r}${num}`;
        
        await client.query(`
          INSERT INTO seats (id, theatre_id, row_label, seat_number, seat_code)
          VALUES ($1, 'theatre-cuet', $2, $3, $4)
          ON CONFLICT (theatre_id, row_label, seat_number) DO NOTHING;
        `, [seatId, r, num, seatCode]);
      }
    }

    // 5. Populate showtime_seats for all showtimes
    const showtimesRes = await client.query(`SELECT id FROM showtimes;`);
    const seatsRes = await client.query(`SELECT id FROM seats WHERE theatre_id = 'theatre-cuet';`);

    for (const st of showtimesRes.rows) {
      for (const s of seatsRes.rows) {
        const stSeatId = `sts-${st.id}-${s.id}`;
        await client.query(`
          INSERT INTO showtime_seats (id, showtime_id, seat_id, status)
          VALUES ($1, $2, $3, 'AVAILABLE')
          ON CONFLICT (showtime_id, seat_id) DO NOTHING;
        `, [stSeatId, st.id, s.id]);
      }
    }

    await client.query('COMMIT');
    console.log('[DB Seed] Pre-populated movies, theatres, showtimes, seats successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB Seed] Seeding error:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].includes('seed')) {
  seedDb().then(() => process.exit(0)).catch(() => process.exit(1));
}
