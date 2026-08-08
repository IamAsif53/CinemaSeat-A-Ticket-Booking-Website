export interface Review {
  id: string;
  movie_id: string;
  author_name: string;
  rating: number; // 1 to 5
  comment: string;
  verified_purchaser: boolean;
  created_at: string;
}

// Initial Pre-populated Seed Reviews for Popular Movies
const initialReviews: Record<string, Review[]> = {
  'movie-spiderman': [
    {
      id: 'rev-1',
      movie_id: 'movie-spiderman',
      author_name: 'Tanvir Hossain',
      rating: 5,
      comment: 'Absolute masterpiece! The IMAX 3D visuals and Dolby Atmos sound at CUET Grand Cinema blew my mind. Seat F12 was indeed the perfect spot!',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
    },
    {
      id: 'rev-2',
      movie_id: 'movie-spiderman',
      author_name: 'Anika Rahman',
      rating: 5,
      comment: 'Best Spider-Man premiere ever! Fast seat booking system with zero lag.',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() // 3 hours ago
    },
    {
      id: 'rev-3',
      movie_id: 'movie-spiderman',
      author_name: 'Fahim Chowdhury',
      rating: 4,
      comment: 'Stunning action sequences! Highly recommended to watch in IMAX.',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString()
    },
    {
      id: 'rev-4',
      movie_id: 'movie-spiderman',
      author_name: 'Saima Islam',
      rating: 5,
      comment: 'The cliffhanger was insane. 10/10 movie experience!',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString()
    },
    {
      id: 'rev-5',
      movie_id: 'movie-spiderman',
      author_name: 'Zayan Ahmed',
      rating: 5,
      comment: 'Held my seat in under 50ms during the midnight rush. Flawless ticketing app!',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString()
    }
  ],
  'movie-oppenheimer': [
    {
      id: 'rev-opp-1',
      movie_id: 'movie-oppenheimer',
      author_name: 'Mahmudul Hasan',
      rating: 5,
      comment: 'Christopher Nolan has outdone himself. The Trinity test scene gave me chills!',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      id: 'rev-opp-2',
      movie_id: 'movie-oppenheimer',
      author_name: 'Nusrat Jahan',
      rating: 5,
      comment: 'Cillian Murphy delivered an Oscar-worthy performance. Must watch in theaters.',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 200).toISOString()
    },
    {
      id: 'rev-opp-3',
      movie_id: 'movie-oppenheimer',
      author_name: 'Abrar Shahriar',
      rating: 4,
      comment: 'Sublime Ludwig Göransson sound score. High tension throughout 3 hours.',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 500).toISOString()
    },
    {
      id: 'rev-opp-4',
      movie_id: 'movie-oppenheimer',
      author_name: 'Taskin Ahmed',
      rating: 5,
      comment: 'Cinematic storytelling at its finest. Sound design in IMAX is unreal!',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 900).toISOString()
    },
    {
      id: 'rev-opp-5',
      movie_id: 'movie-oppenheimer',
      author_name: 'Mehedi Hasan',
      rating: 5,
      comment: 'Loved how easy it was to select my seat and scan the QR ticket.',
      verified_purchaser: true,
      created_at: new Date(Date.now() - 1000 * 60 * 1200).toISOString()
    }
  ]
};

const reviewsStore = new Map<string, Review[]>();

// Populate initial store
Object.entries(initialReviews).forEach(([movieId, list]) => {
  reviewsStore.set(movieId, [...list]);
});

export function getMovieReviews(movieId: string) {
  let list = reviewsStore.get(movieId);
  if (!list || list.length === 0) {
    // Generate default reviews for any movie in the catalog
    list = [
      {
        id: `rev-${movieId}-1`,
        movie_id: movieId,
        author_name: 'Shakib Al Hasan',
        rating: 5,
        comment: 'Fantastic cinematic presentation! Great sound quality and seating.',
        verified_purchaser: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      },
      {
        id: `rev-${movieId}-2`,
        movie_id: movieId,
        author_name: 'Rafiul Islam',
        rating: 4,
        comment: 'Really enjoyed the storyline and visual effects in 4K IMAX.',
        verified_purchaser: true,
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString()
      },
      {
        id: `rev-${movieId}-3`,
        movie_id: movieId,
        author_name: 'Sadia Sultana',
        rating: 5,
        comment: 'Smooth seat booking experience and quick OTP verification!',
        verified_purchaser: true,
        created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString()
      },
      {
        id: `rev-${movieId}-4`,
        movie_id: movieId,
        author_name: 'Imtiaz Ahmed',
        rating: 5,
        comment: 'Top tier entertainment! Loved watching with friends.',
        verified_purchaser: true,
        created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString()
      },
      {
        id: `rev-${movieId}-5`,
        movie_id: movieId,
        author_name: 'Nabil Hasan',
        rating: 4,
        comment: 'Great atmosphere at the theater hall. Will book again soon.',
        verified_purchaser: true,
        created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString()
      }
    ];
    reviewsStore.set(movieId, list);
  }

  // Calculate statistics
  const totalCount = list.length;
  const sumRating = list.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = totalCount > 0 ? Number((sumRating / totalCount).toFixed(1)) : 5.0;

  // Star breakdown count
  const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  list.forEach(r => {
    if (breakdown[r.rating] !== undefined) breakdown[r.rating]++;
  });

  // Return top 5 most recent reviews
  const recent5 = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return {
    total_reviews: totalCount,
    avg_rating: avgRating,
    breakdown,
    recent_reviews: recent5
  };
}

export function addMovieReview(movieId: string, authorName: string, rating: number, comment: string) {
  const newReview: Review = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    movie_id: movieId,
    author_name: authorName.trim() || 'Anonymous Moviegoer',
    rating: Math.min(5, Math.max(1, rating)),
    comment: comment.trim(),
    verified_purchaser: true,
    created_at: new Date().toISOString()
  };

  const list = reviewsStore.get(movieId) || [];
  list.unshift(newReview); // Prepend as most recent review
  reviewsStore.set(movieId, list);

  return {
    success: true,
    message: 'Review posted successfully!',
    new_review: newReview,
    ...getMovieReviews(movieId)
  };
}
