import React, { useEffect } from 'react';
import { Play, X, Star, Clock, Calendar, Ticket, User, Film } from 'lucide-react';
import { Movie } from '../types';

interface TrailerModalProps {
  movie: Movie;
  onClose: () => void;
  onBookNow: (movie: Movie) => void;
}

const TRAILER_MAP: Record<string, { embedUrl: string; cast: string[]; director: string }> = {
  'movie-spiderman': {
    embedUrl: 'https://www.youtube-nocookie.com/embed/aWzlQ2N6qqg?autoplay=1',
    cast: ['Tom Holland', 'Zendaya', 'Jacob Batalon', 'Benedict Cumberbatch'],
    director: 'Jon Watts'
  },
  'movie-oppenheimer': {
    embedUrl: 'https://www.youtube-nocookie.com/embed/uYPbbksJxIg?autoplay=1',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.'],
    director: 'Christopher Nolan'
  },
  'movie-avatar-3': {
    embedUrl: 'https://www.youtube-nocookie.com/embed/d9MyW72ELq0?autoplay=1',
    cast: ['Sam Worthington', 'Zoe Saldaña', 'Sigourney Weaver', 'Stephen Lang'],
    director: 'James Cameron'
  },
  'movie-dune-2': {
    embedUrl: 'https://www.youtube-nocookie.com/embed/Way9Dexny3w?autoplay=1',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem'],
    director: 'Denis Villeneuve'
  },
  'movie-deadpool-wolverine': {
    embedUrl: 'https://www.youtube-nocookie.com/embed/73_1biulkYk?autoplay=1',
    cast: ['Ryan Reynolds', 'Hugh Jackman', 'Emma Corrin', 'Morena Baccarin'],
    director: 'Shawn Levy'
  },
  'movie-dark-knight': {
    embedUrl: 'https://www.youtube-nocookie.com/embed/EXeTwQWrcwY?autoplay=1',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine'],
    director: 'Christopher Nolan'
  },
  'movie-interstellar': {
    embedUrl: 'https://www.youtube-nocookie.com/embed/zSWdZVtXT7E?autoplay=1',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
    director: 'Christopher Nolan'
  }
};

const DEFAULT_TRAILER = {
  embedUrl: 'https://www.youtube-nocookie.com/embed/aWzlQ2N6qqg?autoplay=1',
  cast: ['Hollywood All-Star Cast', 'Leading Actors'],
  director: 'Blockbuster Director'
};

export const TrailerModal: React.FC<TrailerModalProps> = ({ movie, onClose, onBookNow }) => {
  const trailerData = TRAILER_MAP[movie.id] || DEFAULT_TRAILER;

  // Esc key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-fade-in cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden cursor-default"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-dark-800 to-dark-900 p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight font-sans">
                Official Movie Trailer
              </h3>
              <p className="text-xs text-gray-400 line-clamp-1">{movie.title}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-800 hover:bg-rose-600 text-gray-400 hover:text-white border border-gray-700 transition"
            title="Close Trailer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 no-scrollbar">
          {/* HD 16:9 Video Player Container */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
            <iframe
              src={trailerData.embedUrl}
              title={`${movie.title} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          {/* Movie Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Details & Synopsis */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 text-xs font-extrabold bg-brand-600/30 text-brand-300 border border-brand-500/40 rounded-lg">
                    {movie.genre}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-dark-800 text-gray-300 border border-gray-700 rounded-lg">
                    {movie.rating}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{movie.imdb_rating || 9.2} IMDb</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white font-sans">{movie.title}</h2>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
                  {movie.description}
                </p>
              </div>

              {/* Director & Cast */}
              <div className="p-4 rounded-2xl bg-dark-800/80 border border-gray-800 space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <User className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="font-bold text-white">Director:</span>
                  <span className="text-gray-400">{trailerData.director}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-bold text-white block">Starring Cast:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {trailerData.cast.map((actor, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-dark-900 text-gray-300 text-[11px] font-medium border border-gray-700">
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Poster & CTA Button */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-gray-700 shadow-lg relative group">
                <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent"></div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onBookNow(movie);
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2 transition transform hover:scale-105 active:scale-95"
              >
                <Ticket className="w-4 h-4" />
                <span>Book Tickets Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
