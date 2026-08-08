import React from 'react';
import { Movie } from '../types';
import { Sparkles, Calendar, Clock, Ticket, Flame } from 'lucide-react';

interface HeroBannerProps {
  featuredMovie: Movie;
  onBookNow: (movie: Movie) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ featuredMovie, onBookNow }) => {
  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden glass-card border border-white/10 mb-6 sm:mb-10 p-5 sm:p-10 shadow-2xl">
      {/* Background Gradient Glow */}
      <div className="absolute -right-20 -top-20 w-72 h-72 sm:w-[500px] sm:h-[500px] bg-brand-600/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-20 -bottom-20 w-60 h-60 sm:w-[400px] sm:h-[400px] bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col-reverse lg:flex-row gap-6 sm:gap-8 items-center relative z-10">
        {/* Left Info Column */}
        <div className="flex-1 text-center lg:text-left space-y-3 sm:space-y-4 w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span>Midnight Premiere Rush — 8:00 PM Tonight</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {featuredMovie.title}
          </h1>

          <p className="text-gray-300 text-xs sm:text-base max-w-2xl leading-relaxed line-clamp-3 sm:line-clamp-none">
            {featuredMovie.description}
          </p>

          {/* Metadata Pills */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 text-xs font-semibold text-gray-300 pt-1">
            <div className="flex items-center gap-1.5 bg-dark-800/90 px-3 py-1.5 rounded-xl border border-gray-800 text-[11px] sm:text-xs">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              <span>{featuredMovie.duration_mins} Mins</span>
            </div>

            <div className="flex items-center gap-1.5 bg-dark-800/90 px-3 py-1.5 rounded-xl border border-gray-800 text-[11px] sm:text-xs">
              <Calendar className="w-3.5 h-3.5 text-brand-400" />
              <span>IMAX 3D Experience</span>
            </div>

            <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 font-bold text-[11px] sm:text-xs">
              <span>★ {featuredMovie.imdb_rating || 9.2} IMDb</span>
            </div>
          </div>

          {/* CTA Action */}
          <div className="pt-3 sm:pt-4 flex justify-center lg:justify-start">
            <button
              onClick={() => onBookNow(featuredMovie)}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2.5 transition transform hover:scale-105 active:scale-95 min-h-[48px]"
            >
              <Ticket className="w-5 h-5" />
              <span>Book Premiere Seats Now (Seat F12)</span>
            </button>
          </div>
        </div>

        {/* Right Hero Image Card */}
        <div className="shrink-0 relative group">
          <div className="w-36 h-52 sm:w-60 sm:h-88 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 relative transform group-hover:scale-105 transition-all duration-500">
            <img 
              src={featuredMovie.poster_url} 
              alt={featuredMovie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent"></div>
          </div>
          <span className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black bg-brand-600 text-white rounded-lg shadow-lg">
            {featuredMovie.rating}
          </span>
        </div>
      </div>
    </div>
  );
};
