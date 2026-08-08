import React, { useState, useEffect } from 'react';
import { Movie, Showtime } from '../types';
import { Clock, Calendar, MapPin, Sparkles, ChevronRight, Star, MessageSquare } from 'lucide-react';
import { ReviewModal } from './ReviewModal';
import axios from 'axios';

interface MovieHeaderProps {
  movies: Movie[];
  selectedMovie: Movie;
  showtime: Showtime;
  onSelectMovie: (movie: Movie) => void;
}

export const MovieHeader: React.FC<MovieHeaderProps> = ({
  movies,
  selectedMovie,
  showtime,
  onSelectMovie
}) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [avgRating, setAvgRating] = useState<number>(selectedMovie.imdb_rating || 4.8);
  const [totalReviews, setTotalReviews] = useState<number>(128);

  useEffect(() => {
    // Fetch live rating stats for selected movie
    const fetchStats = async () => {
      try {
        const res = await axios.get(`/api/movies/${selectedMovie.id}/reviews`);
        if (res.data) {
          setAvgRating(res.data.avg_rating || selectedMovie.imdb_rating || 4.8);
          setTotalReviews(res.data.total_reviews || 128);
        }
      } catch (err) {
        // Fallback
      }
    };
    fetchStats();
  }, [selectedMovie]);

  return (
    <header className="relative rounded-2xl sm:rounded-3xl overflow-hidden glass-card border border-white/10 p-5 sm:p-8 shadow-2xl">
      {/* Ambient Background Glow */}
      <div className="absolute -right-20 -top-20 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start relative z-10">
        {/* Movie Poster Thumbnail */}
        <div className="shrink-0 relative group">
          <div className="w-36 h-52 sm:w-44 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 relative transform group-hover:scale-105 transition-all duration-300">
            <img 
              src={selectedMovie.poster_url} 
              alt={selectedMovie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent"></div>
          </div>
          <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-black bg-brand-600 text-white rounded-lg shadow-lg">
            {selectedMovie.rating}
          </span>
        </div>

        {/* Movie Metadata & Content */}
        <div className="flex-1 text-center md:text-left space-y-4 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Midnight Premiere Rush — High Demand</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center md:items-start justify-between gap-3">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {selectedMovie.title}
            </h1>

            {/* Selector Dropdown for Movies */}
            <div className="flex items-center gap-2 bg-dark-800/90 px-3 py-1.5 rounded-xl border border-gray-700 text-xs shrink-0">
              <span className="text-gray-400 font-semibold">Switch Movie:</span>
              <select
                value={selectedMovie.id}
                onChange={(e) => {
                  const m = movies.find(m => m.id === e.target.value);
                  if (m) onSelectMovie(m);
                }}
                className="bg-dark-900 text-gray-200 border border-gray-700 rounded-lg px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
              >
                {movies.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-gray-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            {selectedMovie.description}
          </p>

          {/* Info Badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 text-xs text-gray-300 font-semibold pt-1">
            <div className="flex items-center gap-1.5 bg-dark-800/80 px-3 py-1.5 rounded-xl border border-gray-800">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>{selectedMovie.duration_mins || 150} Mins</span>
            </div>

            <div className="flex items-center gap-1.5 bg-dark-800/80 px-3 py-1.5 rounded-xl border border-gray-800">
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Tonight at 8:00 PM Sharp</span>
            </div>

            <div className="flex items-center gap-1.5 bg-dark-800/80 px-3 py-1.5 rounded-xl border border-gray-800">
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>CUET Grand Cinema, Hall 1 (IMAX)</span>
            </div>
          </div>

          {/* Review & Rating Action Buttons Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
            {/* Button 1: See Reviews */}
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-2 transition shadow-md hover:scale-105"
            >
              <div className="flex items-center gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`}
                  />
                ))}
              </div>
              <span>★ {avgRating} / 5.0 ({totalReviews} Reviews)</span>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>

            {/* Button 2: Write a Review */}
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-200 hover:text-white font-bold text-xs border border-gray-700 flex items-center gap-2 transition hover:border-brand-500/50"
            >
              <MessageSquare className="w-4 h-4 text-brand-400" />
              <span>Write a Review</span>
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          movieId={selectedMovie.id}
          movieTitle={selectedMovie.title}
          onClose={() => setShowReviewModal(false)}
          onReviewsUpdated={(newAvg, newCount) => {
            setAvgRating(newAvg);
            setTotalReviews(newCount);
          }}
        />
      )}
    </header>
  );
};
