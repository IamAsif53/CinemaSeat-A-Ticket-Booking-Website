import { pool, redis, getHoldTTL } from '../db/index.js';
import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:9000';
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';

let isMockMode = false;
export function setMockMode(val: boolean) {
  isMockMode = val;
  if (val) {
    console.log('⚠️ Running in Local Memory Mock Mode (No Postgres/Redis required)');
    initMockStore();
  }
}

// 35+ Curated Blockbuster Movies Dataset
const mockMovies = [
  {
    id: 'movie-spiderman',
    title: 'Spider-Man: Brand New Day',
    description: 'Zayan has been waiting months for this. The midnight premiere seats just went live at 8 PM sharp.',
    poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&q=80',
    duration_mins: 150,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    release_date: '2026-08-08',
    imdb_rating: 9.2,
    badge: 'HOT RUSH'
  },
  {
    id: 'movie-oppenheimer',
    title: 'Oppenheimer',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
    duration_mins: 180,
    genre: 'Biography / Drama',
    rating: 'R',
    release_date: '2026-08-07',
    imdb_rating: 8.9,
    badge: 'FEATURED'
  },
  {
    id: 'movie-avatar-3',
    title: 'Avatar: Fire and Ash',
    description: 'Return to Pandora for an epic new journey into uncharted volcanic territories.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
    duration_mins: 192,
    genre: 'Adventure / Sci-Fi',
    rating: 'PG-13',
    release_date: '2026-12-18',
    imdb_rating: 8.8,
    badge: 'IMAX 3D'
  },
  {
    id: 'movie-dune-2',
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
    duration_mins: 166,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    release_date: '2024-03-01',
    imdb_rating: 8.6,
    badge: 'IMAX 3D'
  },
  {
    id: 'movie-deadpool-wolverine',
    title: 'Deadpool & Wolverine',
    description: 'Wolverine is recovering from his injuries when he crosses paths with the loudmouth Deadpool.',
    poster_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&q=80',
    duration_mins: 128,
    genre: 'Action / Comedy',
    rating: 'R',
    release_date: '2024-07-26',
    imdb_rating: 7.8,
    badge: 'HOT RUSH'
  },
  {
    id: 'movie-dark-knight',
    title: 'The Dark Knight',
    description: 'When the menace known as the Joker wreaks havoc and chaos on Gotham, Batman must accept one of the greatest psychological tests.',
    poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
    duration_mins: 152,
    genre: 'Action / Crime',
    rating: 'PG-13',
    release_date: '2008-07-18',
    imdb_rating: 9.0,
    badge: 'FEATURED'
  },
  {
    id: 'movie-interstellar',
    title: 'Interstellar',
    description: 'When Earth becomes uninhabitable, a team of ex-pilots and scientists travel through a wormhole in search of a new home.',
    poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
    duration_mins: 169,
    genre: 'Adventure / Sci-Fi',
    rating: 'PG-13',
    release_date: '2014-11-07',
    imdb_rating: 8.7,
    badge: 'IMAX 3D'
  },
  {
    id: 'movie-inception',
    title: 'Inception',
    description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
    poster_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
    duration_mins: 148,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    release_date: '2010-07-16',
    imdb_rating: 8.8,
    badge: 'FEATURED'
  },
  {
    id: 'movie-avengers-endgame',
    title: 'Avengers: Endgame',
    description: 'After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more.',
    poster_url: 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=600&q=80',
    duration_mins: 181,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    release_date: '2019-04-26',
    imdb_rating: 8.4,
    badge: 'HOT RUSH'
  },
  {
    id: 'movie-spider-verse-2',
    title: 'Spider-Man: Across the Spider-Verse',
    description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its existence.',
    poster_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&q=80',
    duration_mins: 140,
    genre: 'Animation / Action',
    rating: 'PG',
    release_date: '2023-06-02',
    imdb_rating: 8.7,
    badge: 'FEATURED'
  },
  {
    id: 'movie-gladiator-2',
    title: 'Gladiator II',
    description: 'Years after witnessing the death of Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered.',
    poster_url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600&q=80',
    duration_mins: 148,
    genre: 'Action / Drama',
    rating: 'R',
    release_date: '2024-11-22',
    imdb_rating: 7.7,
    badge: 'PREMIERE'
  },
  {
    id: 'movie-joker-2',
    title: 'Joker: Folie à Deux',
    description: 'Failed comedian Arthur Fleck meets the love of his life, Harley Quinn, while incarcerated at Arkham State Hospital.',
    poster_url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?w=600&q=80',
    duration_mins: 138,
    genre: 'Crime / Drama',
    rating: 'R',
    release_date: '2024-10-04',
    imdb_rating: 5.3,
    badge: 'PREMIERE'
  },
  {
    id: 'movie-moana-2',
    title: 'Moana 2',
    description: 'After receiving an unexpected call from her wayfinding ancestors, Moana journeys to the far seas of Oceania.',
    poster_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    duration_mins: 100,
    genre: 'Animation / Adventure',
    rating: 'PG',
    release_date: '2024-11-27',
    imdb_rating: 7.1,
    badge: 'FEATURED'
  },
  {
    id: 'movie-wicked',
    title: 'Wicked: Part One',
    description: 'Elphaba, a misunderstood young woman because of her green skin, discovers her true power.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
    duration_mins: 160,
    genre: 'Fantasy / Musical',
    rating: 'PG',
    release_date: '2024-11-22',
    imdb_rating: 8.0,
    badge: 'PREMIERE'
  },
  {
    id: 'movie-alien-romulus',
    title: 'Alien: Romulus',
    description: 'While scavenging the deep ends of a derelict space station, a group of young space colonizers come face to face with the most terrifying life form in the universe.',
    poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
    duration_mins: 119,
    genre: 'Horror / Sci-Fi',
    rating: 'R',
    release_date: '2024-08-16',
    imdb_rating: 7.3,
    badge: 'HOT RUSH'
  },
  {
    id: 'movie-eeaao',
    title: 'Everything Everywhere All at Once',
    description: 'A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes.',
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
    duration_mins: 139,
    genre: 'Action / Sci-Fi',
    rating: 'R',
    release_date: '2022-03-25',
    imdb_rating: 8.8,
    badge: 'FEATURED'
  },
  {
    id: 'movie-matrix',
    title: 'The Matrix',
    description: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth about the simulated reality.',
    poster_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80',
    duration_mins: 136,
    genre: 'Action / Sci-Fi',
    rating: 'R',
    release_date: '1999-03-31',
    imdb_rating: 8.7,
    badge: 'FEATURED'
  },
  {
    id: 'movie-fight-club',
    title: 'Fight Club',
    description: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.',
    poster_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
    duration_mins: 139,
    genre: 'Drama',
    rating: 'R',
    release_date: '1999-10-15',
    imdb_rating: 8.8,
    badge: 'FEATURED'
  },
  {
    id: 'movie-pulp-fiction',
    title: 'Pulp Fiction',
    description: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    poster_url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600&q=80',
    duration_mins: 154,
    genre: 'Crime / Drama',
    rating: 'R',
    release_date: '1994-10-14',
    imdb_rating: 8.9,
    badge: 'FEATURED'
  },
  {
    id: 'movie-parasite',
    title: 'Parasite',
    description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    poster_url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?w=600&q=80',
    duration_mins: 132,
    genre: 'Drama / Thriller',
    rating: 'R',
    release_date: '2019-10-11',
    imdb_rating: 8.5,
    badge: 'FEATURED'
  },
  {
    id: 'movie-spirited-away',
    title: 'Spirited Away',
    description: 'During her family move to the suburbs, a 10-year-old girl wanders into a world ruled by gods, witches, and spirits.',
    poster_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    duration_mins: 125,
    genre: 'Animation / Adventure',
    rating: 'PG',
    release_date: '2001-07-20',
    imdb_rating: 8.6,
    badge: 'FEATURED'
  },
  {
    id: 'movie-whiplash',
    title: 'Whiplash',
    description: 'A promising young drummer enlists at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing.',
    poster_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
    duration_mins: 106,
    genre: 'Drama / Music',
    rating: 'R',
    release_date: '2014-10-10',
    imdb_rating: 8.5,
    badge: 'FEATURED'
  },
  {
    id: 'movie-blade-runner-2049',
    title: 'Blade Runner 2049',
    description: 'Young Blade Runner K discovers a long-buried secret that leads him to track down former Blade Runner Rick Deckard.',
    poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
    duration_mins: 164,
    genre: 'Action / Sci-Fi',
    rating: 'R',
    release_date: '2017-10-06',
    imdb_rating: 8.0,
    badge: 'IMAX 3D'
  },
  {
    id: 'movie-mad-max',
    title: 'Mad Max: Fury Road',
    description: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners.',
    poster_url: 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=600&q=80',
    duration_mins: 120,
    genre: 'Action / Sci-Fi',
    rating: 'R',
    release_date: '2015-05-15',
    imdb_rating: 8.1,
    badge: 'HOT RUSH'
  },
  {
    id: 'movie-into-spiderverse',
    title: 'Spider-Man: Into the Spider-Verse',
    description: 'Teen Miles Morales becomes the Spider-Man of his universe and must join with five spider-powered individuals from other dimensions.',
    poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&q=80',
    duration_mins: 117,
    genre: 'Animation / Action',
    rating: 'PG',
    release_date: '2018-12-14',
    imdb_rating: 8.4,
    badge: 'FEATURED'
  },
  {
    id: 'movie-prestige',
    title: 'The Prestige',
    description: 'After a tragic accident, two stage magicians in 1890s London engage in a battle to create the ultimate illusion while sacrificing everything.',
    poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
    duration_mins: 130,
    genre: 'Drama / Mystery',
    rating: 'PG-13',
    release_date: '2006-10-20',
    imdb_rating: 8.5,
    badge: 'FEATURED'
  },
  {
    id: 'movie-walle',
    title: 'WALL-E',
    description: 'In the distant future, a small waste-collecting robot inadvertently embarks on a space journey that will ultimately decide the fate of mankind.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
    duration_mins: 98,
    genre: 'Animation / Sci-Fi',
    rating: 'G',
    release_date: '2008-06-27',
    imdb_rating: 8.4,
    badge: 'FEATURED'
  },
  {
    id: 'movie-spiderman-no-way-home',
    title: 'Spider-Man: No Way Home',
    description: 'With Spider-Man identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds appear.',
    poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&q=80',
    duration_mins: 148,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    release_date: '2021-12-17',
    imdb_rating: 8.2,
    badge: 'HOT RUSH'
  },
  {
    id: 'movie-gotg',
    title: 'Guardians of the Galaxy',
    description: 'A group of intergalactic criminals must pull together to stop a fanatical warrior with plans to purge the universe.',
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
    duration_mins: 121,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    release_date: '2014-08-01',
    imdb_rating: 8.0,
    badge: 'FEATURED'
  },
  {
    id: 'movie-top-gun-maverick',
    title: 'Top Gun: Maverick',
    description: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past.',
    poster_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&q=80',
    duration_mins: 130,
    genre: 'Action / Drama',
    rating: 'PG-13',
    release_date: '2022-05-27',
    imdb_rating: 8.3,
    badge: 'IMAX 3D'
  },
  {
    id: 'movie-the-batman',
    title: 'The Batman',
    description: 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city corrupt underworld.',
    poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
    duration_mins: 176,
    genre: 'Action / Crime',
    rating: 'PG-13',
    release_date: '2022-03-04',
    imdb_rating: 7.8,
    badge: 'FEATURED'
  },
  {
    id: 'movie-lotr-return',
    title: 'The Lord of the Rings: Return of the King',
    description: 'Gandalf and Aragorn lead the World of Men against Sauron army to draw his gaze from Frodo and Sam as they approach Mount Doom.',
    poster_url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600&q=80',
    duration_mins: 201,
    genre: 'Action / Adventure',
    rating: 'PG-13',
    release_date: '2003-12-17',
    imdb_rating: 9.0,
    badge: 'FEATURED'
  },
  {
    id: 'movie-star-wars-5',
    title: 'Star Wars: The Empire Strikes Back',
    description: 'After the Rebels are brutally overpowered by the Empire, Luke Skywalker begins Jedi training with Yoda while his friends are pursued.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
    duration_mins: 124,
    genre: 'Action / Adventure',
    rating: 'PG',
    release_date: '1980-05-21',
    imdb_rating: 8.7,
    badge: 'FEATURED'
  },
  {
    id: 'movie-shawshank',
    title: 'The Shawshank Redemption',
    description: 'Over the course of several years, two convicts form a friendship, seeking consolation and eventual redemption through basic compassion.',
    poster_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
    duration_mins: 142,
    genre: 'Drama',
    rating: 'R',
    release_date: '1994-10-14',
    imdb_rating: 9.3,
    badge: 'FEATURED'
  },
  {
    id: 'movie-forrest-gump',
    title: 'Forrest Gump',
    description: 'The history of the United States from the 1950s to the 70s unfolds through the perspective of an Alabama man with an IQ of 75.',
    poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
    duration_mins: 142,
    genre: 'Drama / Romance',
    rating: 'PG-13',
    release_date: '1994-07-06',
    imdb_rating: 8.8,
    badge: 'FEATURED'
  }
];

const mockShowtimes = [
  {
    id: 'showtime-spiderman-8pm',
    movie_id: 'movie-spiderman',
    theatre_id: 'theatre-cuet',
    screen_name: 'Hall 1 (IMAX)',
    start_time: '2026-08-08T20:00:00Z',
    price_amount: 450,
    movie_title: 'Spider-Man: Brand New Day',
    poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&q=80',
    duration_mins: 150,
    genre: 'Action / Sci-Fi',
    rating: 'PG-13',
    theatre_name: 'CUET Grand Cinema',
    location: 'CUET Campus, Chittagong'
  }
];

const mockSeatsMap = new Map<string, any>();
const mockBookingsMap = new Map<string, any>();
const mockCallbacksMap = new Map<string, any>();

function initMockStore() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const r of rows) {
    for (let num = 1; num <= 15; num++) {
      const code = `${r}${num}`;
      mockSeatsMap.set(code, {
        seat_code: code,
        row_label: r,
        seat_number: num,
        status: 'AVAILABLE',
        held_by_user_id: null,
        hold_expires_at: null,
        booking_ref: null
      });
    }
  }
}

export interface SeatHoldResult {
  success: boolean;
  message: string;
  booking_ref?: string;
  hold_expires_at?: string;
  ttl_seconds?: number;
}

export async function holdSeat(
  showtimeId: string,
  seatCode: string,
  userId: string
): Promise<SeatHoldResult> {
  const ttl = getHoldTTL();
  const code = seatCode.toUpperCase();

  if (isMockMode) {
    const s = mockSeatsMap.get(code);
    if (!s) return { success: false, message: 'Invalid seat' };

    const now = Date.now();
    if (s.status === 'BOOKED' || (s.status === 'HELD' && new Date(s.hold_expires_at).getTime() > now)) {
      return { success: false, message: `Seat ${code} is already held or booked by another user.` };
    }

    const bookingRef = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(now + ttl * 1000).toISOString();

    s.status = 'HELD';
    s.held_by_user_id = userId;
    s.hold_expires_at = expiresAt;
    s.booking_ref = bookingRef;

    mockBookingsMap.set(bookingRef, {
      booking_ref: bookingRef,
      showtime_id: showtimeId,
      seat_code: code,
      user_id: userId,
      amount: 450,
      status: 'PENDING',
      movie_title: 'Spider-Man: Brand New Day',
      screen_name: 'Hall 1 (IMAX)'
    });

    return {
      success: true,
      message: `Seat ${code} successfully held for ${ttl} seconds.`,
      booking_ref: bookingRef,
      hold_expires_at: expiresAt,
      ttl_seconds: ttl
    };
  }

  // Postgres + Redis mode
  const redisKey = `seat_hold:${showtimeId}:${code}`;
  const bookingRef = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const holdPayload = JSON.stringify({ userId, bookingRef, showtimeId, seatCode: code });

  const acquired = await redis.set(redisKey, holdPayload, 'EX', ttl, 'NX');
  if (!acquired) {
    return { success: false, message: `Seat ${code} is already held or booked by another user.` };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const seatRes = await client.query(
      `SELECT s.id FROM seats s JOIN showtimes st ON st.theatre_id = s.theatre_id WHERE st.id = $1 AND s.seat_code = $2`,
      [showtimeId, code]
    );

    if (seatRes.rows.length === 0) {
      await redis.del(redisKey);
      await client.query('ROLLBACK');
      return { success: false, message: 'Invalid showtime or seat code' };
    }

    const seatId = seatRes.rows[0].id;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const stSeatRes = await client.query(
      `SELECT status FROM showtime_seats WHERE showtime_id = $1 AND seat_id = $2 FOR UPDATE`,
      [showtimeId, seatId]
    );

    if (stSeatRes.rows.length > 0 && stSeatRes.rows[0].status === 'BOOKED') {
      await redis.del(redisKey);
      await client.query('ROLLBACK');
      return { success: false, message: `Seat ${code} is already permanently booked.` };
    }

    await client.query(
      `UPDATE showtime_seats SET status = 'HELD', held_by_user_id = $1, hold_expires_at = $2, booking_ref = $3, updated_at = NOW() WHERE showtime_id = $4 AND seat_id = $5`,
      [userId, expiresAt, bookingRef, showtimeId, seatId]
    );

    await client.query(
      `INSERT INTO bookings (booking_ref, showtime_id, seat_id, user_id, amount, status) VALUES ($1, $2, $3, $4, 450, 'PENDING') ON CONFLICT DO NOTHING`,
      [bookingRef, showtimeId, seatId, userId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: `Seat ${code} successfully held for ${ttl} seconds.`,
      booking_ref: bookingRef,
      hold_expires_at: expiresAt,
      ttl_seconds: ttl
    };
  } catch (err) {
    await client.query('ROLLBACK');
    await redis.del(redisKey);
    throw err;
  } finally {
    client.release();
  }
}

export async function releaseSeatHold(bookingRef: string) {
  if (isMockMode) {
    const bk = mockBookingsMap.get(bookingRef);
    if (bk) {
      bk.status = 'CANCELLED';
      const s = mockSeatsMap.get(bk.seat_code);
      if (s) {
        s.status = 'AVAILABLE';
        s.held_by_user_id = null;
        s.hold_expires_at = null;
        s.booking_ref = null;
      }
    }
    return { success: true, message: 'Seat hold cancelled and returned to AVAILABLE' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bkRes = await client.query(`SELECT * FROM bookings WHERE booking_ref = $1 FOR UPDATE`, [bookingRef]);
    if (bkRes.rows.length === 0) {
      await client.query('COMMIT');
      return { success: false, message: 'Booking not found' };
    }

    const booking = bkRes.rows[0];
    if (booking.status === 'CONFIRMED') {
      await client.query('COMMIT');
      return { success: false, message: 'Cannot cancel a confirmed booking' };
    }

    await client.query(`UPDATE bookings SET status = 'CANCELLED', updated_at = NOW() WHERE booking_ref = $1`, [bookingRef]);

    await client.query(
      `UPDATE showtime_seats SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_ref = NULL, updated_at = NOW() WHERE showtime_id = $1 AND seat_id = $2`,
      [booking.showtime_id, booking.seat_id]
    );

    const seatRes = await client.query(`SELECT seat_code FROM seats WHERE id = $1`, [booking.seat_id]);
    if (seatRes.rows.length > 0) {
      const redisKey = `seat_hold:${booking.showtime_id}:${seatRes.rows[0].seat_code}`;
      await redis.del(redisKey);
    }

    await client.query('COMMIT');
    return { success: true, message: 'Seat hold cancelled and returned to AVAILABLE' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getSeatMap(showtimeId: string) {
  await syncExpiredHolds(showtimeId);

  if (isMockMode) {
    return Array.from(mockSeatsMap.values());
  }

  const query = `
    SELECT s.seat_code, s.row_label, s.seat_number, COALESCE(sts.status, 'AVAILABLE') as status, sts.held_by_user_id, sts.hold_expires_at, sts.booking_ref
    FROM seats s
    JOIN showtimes st ON st.theatre_id = s.theatre_id
    LEFT JOIN showtime_seats sts ON sts.seat_id = s.id AND sts.showtime_id = st.id
    WHERE st.id = $1
    ORDER BY s.row_label ASC, s.seat_number ASC;
  `;
  const res = await pool.query(query, [showtimeId]);
  return res.rows;
}

export async function syncExpiredHolds(showtimeId?: string) {
  const now = Date.now();
  if (isMockMode) {
    for (const [, s] of mockSeatsMap.entries()) {
      if (s.status === 'HELD' && s.hold_expires_at && new Date(s.hold_expires_at).getTime() < now) {
        s.status = 'AVAILABLE';
        s.held_by_user_id = null;
        s.hold_expires_at = null;
        if (s.booking_ref && mockBookingsMap.has(s.booking_ref)) {
          mockBookingsMap.get(s.booking_ref).status = 'EXPIRED';
        }
        s.booking_ref = null;
      }
    }
    return;
  }

  try {
    const whereClause = showtimeId 
      ? `WHERE showtime_id = $1 AND status = 'HELD' AND hold_expires_at < NOW()`
      : `WHERE status = 'HELD' AND hold_expires_at < NOW()`;
    
    const params = showtimeId ? [showtimeId] : [];

    const res = await pool.query(
      `UPDATE showtime_seats SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_ref = NULL ${whereClause} RETURNING booking_ref`,
      params
    );

    if (res.rows.length > 0) {
      const expiredRefs = res.rows.map(r => r.booking_ref).filter(Boolean);
      if (expiredRefs.length > 0) {
        await pool.query(`UPDATE bookings SET status = 'EXPIRED' WHERE booking_ref = ANY($1) AND status = 'PENDING'`, [expiredRefs]);
      }
    }
  } catch (err) {
    // Ignore error in fallback
  }
}

export async function initiatePayment(
  bookingRef: string,
  userPhone: string,
  headersMap: Record<string, string> = {}
) {
  if (isMockMode) {
    const bk = mockBookingsMap.get(bookingRef);
    if (!bk) throw new Error('Booking not found');
    bk.user_phone = userPhone;
    bk.status = 'CONFIRMED';
    const s = mockSeatsMap.get(bk.seat_code);
    if (s) s.status = 'BOOKED';

    return { payment_id: `pay_${Date.now()}`, status: 'CONFIRMED', booking_ref: bookingRef };
  }

  const bkRes = await pool.query(`SELECT * FROM bookings WHERE booking_ref = $1`, [bookingRef]);
  if (bkRes.rows.length === 0) throw new Error('Booking not found');
  const booking = bkRes.rows[0];

  const callbackUrl = process.env.CALLBACK_URL || `${BACKEND_URL}/api/payments/callback`;
  const forwardHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headersMap)) {
    if (k.toLowerCase().startsWith('x-mock-')) forwardHeaders[k] = v;
  }

  try {
    const payload = { amount: booking.amount, currency: booking.currency || 'BDT', booking_ref: bookingRef, callback_url: callbackUrl };
    const gatewayRes = await axios.post(`${GATEWAY_URL}/charge`, payload, { headers: { 'Content-Type': 'application/json', ...forwardHeaders }, timeout: 5000 });
    const { payment_id, status } = gatewayRes.data;

    await pool.query(`UPDATE bookings SET payment_id = $1, user_phone = $2, updated_at = NOW() WHERE booking_ref = $3`, [payment_id, userPhone, bookingRef]);
    return { payment_id, status: status || 'PENDING', booking_ref: bookingRef };
  } catch (err: any) {
    await pool.query(`UPDATE bookings SET user_phone = $1, updated_at = NOW() WHERE booking_ref = $2`, [userPhone, bookingRef]);
    return { payment_id: `pay_pending_${Date.now()}`, status: 'PENDING', booking_ref: bookingRef };
  }
}

export async function handleGatewayCallback(payload: any) {
  const { event_id, booking_ref, status } = payload;
  if (!booking_ref || !status) return { processed: false };

  if (isMockMode) {
    const bk = mockBookingsMap.get(booking_ref);
    if (bk) {
      bk.status = status === 'SUCCEEDED' ? 'CONFIRMED' : 'FAILED';
      const s = mockSeatsMap.get(bk.seat_code);
      if (s) s.status = status === 'SUCCEEDED' ? 'BOOKED' : 'AVAILABLE';
    }
    return { processed: true };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (event_id) {
      const existingCb = await client.query(`SELECT id FROM gateway_callbacks WHERE event_id = $1`, [event_id]);
      if (existingCb.rows.length > 0) {
        await client.query('COMMIT');
        return { processed: true, duplicate: true };
      }
      await client.query(`INSERT INTO gateway_callbacks (event_id, booking_ref, payment_id, status, amount) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`, [event_id, booking_ref, payload.payment_id, status, payload.amount]);
    }

    const bkRes = await client.query(`SELECT * FROM bookings WHERE booking_ref = $1 FOR UPDATE`, [booking_ref]);
    if (bkRes.rows.length === 0) {
      await client.query('COMMIT');
      return { processed: false };
    }

    const booking = bkRes.rows[0];
    if (status === 'SUCCEEDED') {
      await client.query(`UPDATE bookings SET status = 'CONFIRMED', payment_id = $1 WHERE booking_ref = $2`, [payload.payment_id, booking_ref]);
      await client.query(`UPDATE showtime_seats SET status = 'BOOKED' WHERE showtime_id = $1 AND seat_id = $2`, [booking.showtime_id, booking.seat_id]);
    } else {
      await client.query(`UPDATE bookings SET status = 'FAILED' WHERE booking_ref = $1`, [booking_ref]);
      await client.query(`UPDATE showtime_seats SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_ref = NULL WHERE showtime_id = $1 AND seat_id = $2`, [booking.showtime_id, booking.seat_id]);
    }

    await client.query('COMMIT');
    return { processed: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function getMockMovies() { return mockMovies; }
export function getMockShowtime(id: string) { return mockShowtimes.find(s => s.id === id) || mockShowtimes[0]; }
export function getMockBooking(ref: string) { return mockBookingsMap.get(ref); }
