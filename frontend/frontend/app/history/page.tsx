'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type ReviewItem = {
  id: string;
  input_code: string;
  review: string;
  created_at: string;
  language?: string;
  focus?: string;
  tags?: string[];
  effort_estimation_minutes?: number;
};

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedFocus, setSelectedFocus] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  
  // Expanded review
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        router.push('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user?.email) {
      fetchReviews();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [reviews, searchQuery, selectedLanguage, selectedFocus, selectedTag]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?user_email=${encodeURIComponent(user.email)}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to fetch reviews');
        return;
      }

      setReviews(result.data || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Failed to load review history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = reviews;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.input_code?.toLowerCase().includes(query) ||
        r.review?.toLowerCase().includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(r => r.language === selectedLanguage);
    }

    if (selectedFocus !== 'all') {
      filtered = filtered.filter(r => r.focus === selectedFocus);
    }

    if (selectedTag !== 'all') {
      filtered = filtered.filter(r => r.tags?.includes(selectedTag));
    }

    setFilteredReviews(filtered);
  };

  const uniqueLanguages = Array.from(new Set(reviews.map(r => r.language).filter(Boolean)));
  const uniqueFocuses = Array.from(new Set(reviews.map(r => r.focus).filter(Boolean)));
  const allTags = Array.from(new Set(reviews.flatMap(r => r.tags || [])));

  const deleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/reviews?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReviews(reviews.filter(r => r.id !== id));
        setError(''); // Clear any previous errors
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete review');
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
      setError('Failed to delete review. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-gray-400">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="text-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                📜 Review History
              </h1>
              <p className="text-gray-400">View and manage your code review history</p>
            </div>
            <p className="text-sm text-gray-400">
              {filteredReviews.length} of {reviews.length} reviews
            </p>
          </div>
        </div>
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl mb-8">
          <h2 className="text-xl font-semibold mb-4">🔍 Filter Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code or review..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Languages</option>
                {uniqueLanguages.map(lang => (
                  <option key={lang} value={lang}>{lang?.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Focus</label>
              <select
                value={selectedFocus}
                onChange={(e) => setSelectedFocus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Focus Areas</option>
                {uniqueFocuses.map(focus => (
                  <option key={focus} value={focus}>
                    {focus?.charAt(0).toUpperCase()}{focus?.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tag</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-lg">
              {reviews.length === 0 ? 'No reviews yet' : 'No reviews match your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review, index) => (
              <div
                key={review.id}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors"
              >
                {/* Review Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-gray-500">
                          #{reviews.length - filteredReviews.indexOf(review)}
                        </span>
                        {review.language && (
                          <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                            {review.language.toUpperCase()}
                          </span>
                        )}
                        {review.focus && (
                          <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded">
                            {review.focus}
                          </span>
                        )}
                        {review.effort_estimation_minutes && review.effort_estimation_minutes > 0 && (
                          <span className="text-xs bg-orange-900/50 text-orange-300 px-2 py-1 rounded">
                            ⏱️ {review.effort_estimation_minutes}m
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(expandedId === review.id ? null : review.id)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        {expandedId === review.id ? 'Collapse' : 'Expand'}
                      </button>
                      <button
                        onClick={() => deleteReview(review.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {review.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Code Preview */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 mb-4">
                    <p className="text-xs text-gray-400 mb-2 font-semibold">Code:</p>
                    <div className="text-sm text-gray-300 font-mono overflow-x-auto">
                      {expandedId === review.id ? (
                        <SyntaxHighlighter
                          language={review.language || 'python'}
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, background: 'transparent', fontSize: '0.875rem' }}
                        >
                          {review.input_code}
                        </SyntaxHighlighter>
                      ) : (
                        <pre className="whitespace-pre-wrap">
                          {review.input_code.substring(0, 200)}
                          {review.input_code.length > 200 && '...'}
                        </pre>
                      )}
                    </div>
                  </div>

                  {/* Review */}
                  {expandedId === review.id && (
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-2 font-semibold">AI Review:</p>
                      <div className="prose prose-invert max-w-none text-sm text-gray-300 whitespace-pre-wrap">
                        {review.review}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
