import { Movie, Showtime, Seat } from '../types';

export class MovieFallback {
  static getMovies(): Movie[] {
    return [
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
        id: 'movie-alien-romulus',
        title: 'Alien: Romulus',
        description: 'While scavenging the deep ends of a derelict space station, a group of young space colonizers come face to face with the most terrifying life form in the universe.',
        poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
        duration_mins: 119,
        genre: 'Horror / Sci-Fi',
        rating: 'R',
        release_date: '2024-08-16',
        imdb_rating: 7.3,
        badge: 'PREMIERE'
      },
      {
        id: 'movie-matrix',
        title: 'The Matrix',
        description: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth about his reality.',
        poster_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80',
        duration_mins: 136,
        genre: 'Action / Sci-Fi',
        rating: 'R',
        release_date: '1999-03-31',
        imdb_rating: 8.7,
        badge: 'FEATURED'
      },
      {
        id: 'movie-joker',
        title: 'Joker',
        description: 'During the 1980s, a failed stand-up comedian is driven insane and turns to a life of crime and chaos in Gotham City.',
        poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
        duration_mins: 122,
        genre: 'Crime / Drama',
        rating: 'R',
        release_date: '2019-10-04',
        imdb_rating: 8.4,
        badge: 'FEATURED'
      },
      {
        id: 'movie-godzilla-kong',
        title: 'Godzilla x Kong: The New Empire',
        description: 'Two ancient titans, Godzilla and Kong, clash in an epic battle as humans unravel their intertwined origins and connection to Skull Island.',
        poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
        duration_mins: 115,
        genre: 'Action / Sci-Fi',
        rating: 'PG-13',
        release_date: '2024-03-29',
        imdb_rating: 6.7,
        badge: 'IMAX 3D'
      },
      {
        id: 'movie-inside-out-2',
        title: 'Inside Out 2',
        description: 'Follow Riley in her teenage years as new emotions enter Mind Headquarters.',
        poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
        duration_mins: 96,
        genre: 'Animation / Family',
        rating: 'PG',
        release_date: '2024-06-14',
        imdb_rating: 7.6,
        badge: 'FEATURED'
      },
      {
        id: 'movie-wicked',
        title: 'Wicked',
        description: 'Elphaba, a misunderstood young woman because of her green skin, meets Glinda, a popular young woman gilded by privilege.',
        poster_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
        duration_mins: 160,
        genre: 'Fantasy / Musical',
        rating: 'PG',
        release_date: '2024-11-22',
        imdb_rating: 7.8,
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
        id: 'movie-mufasa',
        title: 'Mufasa: The Lion King',
        description: 'Mufasa, an orphaned cub, meets a sympathetic lion named Taka, the heir to a royal bloodline.',
        poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
        duration_mins: 118,
        genre: 'Animation / Adventure',
        rating: 'PG',
        release_date: '2024-12-20',
        imdb_rating: 7.0,
        badge: 'PREMIERE'
      },
      {
        id: 'movie-fast-x',
        title: 'Fast X',
        description: 'Dom Toretto and his family are targeted by the vengeful son of drug kingpin Hernan Reyes.',
        poster_url: 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=600&q=80',
        duration_mins: 141,
        genre: 'Action / Crime',
        rating: 'PG-13',
        release_date: '2023-05-19',
        imdb_rating: 5.8,
        badge: 'HOT RUSH'
      },
      {
        id: 'movie-top-gun-maverick',
        title: 'Top Gun: Maverick',
        description: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past.',
        poster_url: 'https://images.unsplash.com/photo-1519074069444-1ba4eff56024?w=600&q=80',
        duration_mins: 130,
        genre: 'Action / Drama',
        rating: 'PG-13',
        release_date: '2022-05-27',
        imdb_rating: 8.3,
        badge: 'FEATURED'
      },
      {
        id: 'movie-batman-2022',
        title: 'The Batman',
        description: 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city hidden corruption.',
        poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
        duration_mins: 176,
        genre: 'Action / Crime',
        rating: 'PG-13',
        release_date: '2022-03-04',
        imdb_rating: 7.8,
        badge: 'HOT RUSH'
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
        poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
        duration_mins: 154,
        genre: 'Crime / Drama',
        rating: 'R',
        release_date: '1994-10-14',
        imdb_rating: 8.9,
        badge: 'FEATURED'
      },
      {
        id: 'movie-shawshank',
        title: 'The Shawshank Redemption',
        description: 'Over the course of several years, two convicts form a friendship, seeking consolation and eventual redemption through basic compassion.',
        poster_url: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600&q=80',
        duration_mins: 142,
        genre: 'Drama',
        rating: 'R',
        release_date: '1994-10-14',
        imdb_rating: 9.3,
        badge: 'FEATURED'
      }
    ];
  }

  static getInitialShowtime(): Showtime {
    return {
      id: 'showtime-spiderman-8pm',
      movie_id: 'movie-spiderman',
      hall_name: 'Grand Hall IMAX 1',
      start_time: '2026-08-08T20:00:00Z',
      price_amount: 450
    };
  }

  static getInitialSeats(): Seat[] {
    const rows = ['A', 'B', 'C', 'D', 'E'];
    const seatsPerRow = 8;
    const seats: Seat[] = [];

    rows.forEach(r => {
      for (let i = 1; i <= seatsPerRow; i++) {
        const code = `${r}${i}`;
        let status: 'AVAILABLE' | 'HELD' | 'BOOKED' = 'AVAILABLE';

        if (code === 'A3' || code === 'A4') {
          status = 'BOOKED';
        }

        seats.push({
          id: `seat-${code.toLowerCase()}`,
          showtime_id: 'showtime-spiderman-8pm',
          seat_code: code,
          status,
          held_by_user_id: null,
          hold_expires_at: null
        });
      }
    });

    return seats;
  }
}
