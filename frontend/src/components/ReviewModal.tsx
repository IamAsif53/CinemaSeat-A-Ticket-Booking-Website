import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, AlertTriangle, Send, X } from 'lucide-react';
import axios from 'axios';

export interface ReviewItem {
  id: string;
  movie_id: string;
  author_name: string;
  rating: number;
  comment: string;
  verified_purchaser: boolean;
  created_at: string;
  isNew?: boolean;
}

interface ReviewModalProps {
  movieId: string;
  movieTitle: string;
  onClose: () => void;
  onReviewsUpdated?: (avgRating: number, totalCount: number) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  movieId,
  movieTitle,
  onClose,
  onReviewsUpdated
}) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [avgRating, setAvgRating] = useState<number>(4.8);
  const [totalReviews, setTotalReviews] = useState<number>(5);
  const [breakdown, setBreakdown] = useState<Record<number, number>>({ 5: 4, 4: 1, 3: 0, 2: 0, 1: 0 });

  // Form State
  const [authorName, setAuthorName] = useState('Zayan Ahmed');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch reviews & rating statistics
  const fetchReviews = async () => {
    try {
      const res = await axios.get(`/api/movies/${movieId}/reviews`);
      setReviews(res.data.recent_reviews || []);
      setAvgRating(res.data.avg_rating || 4.8);
      setTotalReviews(res.data.total_reviews || 5);
      setBreakdown(res.data.breakdown || { 5: 4, 4: 1, 3: 0, 2: 0, 1: 0 });

      if (onReviewsUpdated) {
        onReviewsUpdated(res.data.avg_rating, res.data.total_reviews);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [movieId]);

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!comment.trim()) {
      setErrorMsg('Please write your review thoughts before submitting.');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`/api/movies/${movieId}/reviews`, {
        author_name: authorName.trim() || 'Anonymous Moviegoer',
        rating,
        comment: comment.trim()
      });

      if (res.data.success) {
        setComment('');

        // Update local state instantly with new review marked as NEW
        const newRev: ReviewItem = { ...res.data.new_review, isNew: true };
        setReviews([newRev, ...res.data.recent_reviews.slice(0, 4)]);
        setAvgRating(res.data.avg_rating);
        setTotalReviews(res.data.total_reviews);

        if (onReviewsUpdated) {
          onReviewsUpdated(res.data.avg_rating, res.data.total_reviews);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  // Helper for relative time string
  const getRelativeTime = (isoDate: string) => {
    const diffMins = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
        {/* Top Header with Prominent Close Controls */}
        <div className="bg-gradient-to-r from-dark-800 to-dark-900 p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight font-sans">
                Movie Reviews & Ratings
              </h3>
              <p className="text-xs text-gray-400 line-clamp-1">{movieTitle}</p>
            </div>
          </div>

          {/* Prominent Close Button */}
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-gray-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 no-scrollbar">
          {/* Rating Summary Box */}
          <div className="p-5 rounded-2xl bg-dark-800/90 border border-gray-800 flex flex-col sm:flex-row items-center gap-6">
            {/* Big Score Card */}
            <div className="text-center sm:text-left shrink-0">
              <div className="text-4xl font-black text-white font-sans tracking-tight">
                {avgRating} <span className="text-base font-normal text-gray-400">/ 5.0</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1 text-amber-400 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 font-semibold">{totalReviews} Verified Audience Reviews</p>
            </div>

            {/* Rating Bar Graph */}
            <div className="flex-1 w-full space-y-1.5 text-xs text-gray-400">
              {[5, 4, 3, 2, 1].map((s) => {
                const cnt = breakdown[s] || 0;
                const pct = totalReviews > 0 ? Math.round((cnt / totalReviews) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className="w-6 font-bold text-gray-300 text-[11px]">{s} ★</span>
                    <div className="flex-1 h-2 rounded-full bg-dark-900 overflow-hidden border border-gray-800">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-brand-500 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="w-8 text-right text-[10px] text-gray-500 font-mono">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form: Write Your Review */}
          <div className="p-5 rounded-2xl glass-card border border-brand-500/30 space-y-4">
            <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" />
              <span>Write Your Review & Give Rating</span>
            </h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Author Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-300">Your Name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Zayan Ahmed"
                    className="w-full bg-dark-800 text-white px-3.5 py-2 rounded-xl border border-gray-700 text-xs focus:border-brand-500 focus:outline-none min-h-[40px]"
                    required
                  />
                </div>

                {/* Interactive Star Picker */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-300">Your Star Rating</label>
                  <div className="flex items-center gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const active = (hoverRating !== null ? hoverRating : rating) >= s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="p-1 hover:scale-125 transition transform"
                        >
                          <Star
                            className={`w-6 h-6 ${active ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-black text-amber-400 text-xs">{rating}.0 / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Review Textarea */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-300">Your Review Experience</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Share your thoughts about the movie plot, IMAX visuals, sound design, or seating..."
                  className="w-full bg-dark-800 text-white p-3 rounded-xl border border-gray-700 text-xs focus:border-brand-500 focus:outline-none leading-relaxed"
                  required
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-extrabold text-xs shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Posting Review...' : 'Post Movie Review'}</span>
              </button>
            </form>
          </div>

          {/* List of 5 Most Recent Reviews */}
          <div className="space-y-4 pt-2">
            <h4 className="font-extrabold text-white text-sm flex items-center justify-between">
              <span>5 Most Recent Audience Reviews</span>
              <span className="text-xs text-gray-400 font-normal">Real-Time Feed</span>
            </h4>

            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className={`p-4 rounded-2xl bg-dark-800/80 border transition-all duration-300 ${
                      rev.isNew
                        ? 'border-emerald-500/80 shadow-lg shadow-emerald-500/20 bg-emerald-950/20'
                        : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow">
                          {rev.author_name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{rev.author_name}</span>
                            {rev.verified_purchaser && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Verified Buyer</span>
                              </span>
                            )}
                            {rev.isNew && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                🔥 NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">{getRelativeTime(rev.created_at)}</span>
                        </div>
                      </div>

                      {/* Star Rating Display */}
                      <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed pl-10">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-gray-500">
                No reviews posted yet. Be the first to review this movie!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
