import React from 'react';
import { Movie, Showtime } from '../types';
import { Calendar, Clock, MapPin, Sparkles } from 'lucide-react';

interface MovieHeaderProps {
  movie: Movie;
  showtime: Showtime;
}

export const MovieHeader: React.FC<MovieHeaderProps> = ({ movie, showtime }) => {
  return (
    <div className="relative rounded-2xl overflow-hidden glass-card border border-white/10 mb-8 p-6 sm:p-8">
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start relative z-10">
        {/* Poster */}
        <div className="relative group shrink-0">
          <div className="w-36 h-52 sm:w-44 sm:h-64 rounded-xl overflow-hidden shadow-2xl border border-white/20 relative">
            <img 
              src={movie.poster_url} 
              alt={movie.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent"></div>
          </div>
          <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-bold bg-brand-600 text-white rounded-md shadow-lg">
            {movie.rating}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Midnight Premiere Rush — High Demand</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            {movie.title}
          </h1>

          <p className="text-gray-400 text-sm max-w-2xl mb-6 leading-relaxed">
            {movie.description}
          </p>

          {/* Meta Info Pills */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-medium text-gray-300">
            <div className="flex items-center gap-1.5 bg-dark-800/80 px-3 py-1.5 rounded-lg border border-gray-800">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>{movie.duration_mins} Mins</span>
            </div>

            <div className="flex items-center gap-1.5 bg-dark-800/80 px-3 py-1.5 rounded-lg border border-gray-800">
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Tonight at 8:00 PM Sharp</span>
            </div>

            <div className="flex items-center gap-1.5 bg-dark-800/80 px-3 py-1.5 rounded-lg border border-gray-800">
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>{showtime.theatre_name || 'CUET Cinema'}, {showtime.screen_name || 'Hall 1'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
