'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Exercise = {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  tags: string[];
  created_at: string;
};

export default function ExercisesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  // Filters
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Check auth
  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch exercises
  useEffect(() => {
    fetchExercises();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = exercises;

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty);
    }

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(ex => ex.language === selectedLanguage);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.title.toLowerCase().includes(query) ||
        ex.description.toLowerCase().includes(query) ||
        ex.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredExercises(filtered);
  }, [selectedDifficulty, selectedLanguage, searchQuery, exercises]);

  const fetchExercises = async () => {
    try {
      const response = await fetch('/api/exercises');
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to fetch exercises');
        setLoading(false);
        return;
      }

      setExercises(result.data || []);
      setFilteredExercises(result.data || []);
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-900/50 text-green-300 border-green-700';
      case 'intermediate':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'advanced':
        return 'bg-red-900/50 text-red-300 border-red-700';
      default:
        return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      python: 'bg-blue-900/50 text-blue-300',
      javascript: 'bg-yellow-900/50 text-yellow-300',
      typescript: 'bg-blue-800/50 text-blue-200',
      java: 'bg-orange-900/50 text-orange-300',
      csharp: 'bg-purple-900/50 text-purple-300',
      go: 'bg-cyan-900/50 text-cyan-300',
    };
    return colors[language.toLowerCase()] || 'bg-gray-800/50 text-gray-300';
  };

  // Get unique languages from exercises
  const availableLanguages = Array.from(new Set(exercises.map(ex => ex.language)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-gray-400">Loading exercises...</p>
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
                📚 Coding Exercises
              </h1>
              <p className="text-gray-400">Practice coding with AI-powered feedback</p>
            </div>
            {!user && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg px-4 py-2">
                <p className="text-sm text-blue-300">
                  <strong>Sign in</strong> to track your progress
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl mb-8">
          <h2 className="text-xl font-semibold mb-4">🔍 Filter Exercises</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, or tags..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Languages</option>
                {availableLanguages.map(lang => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing <strong className="text-white">{filteredExercises.length}</strong> of{' '}
              <strong className="text-white">{exercises.length}</strong> exercises
            </p>
            <button
              onClick={() => {
                setSelectedDifficulty('all');
                setSelectedLanguage('all');
                setSearchQuery('');
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Exercise Grid */}
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-400 text-lg">No exercises match your filters</p>
            <button
              onClick={() => {
                setSelectedDifficulty('all');
                setSelectedLanguage('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise) => (
              <div
                key={exercise.id}
                onClick={() => router.push(`/exercises/${exercise.id}`)}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all cursor-pointer shadow-lg hover:shadow-xl hover:transform hover:scale-105"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white flex-1 pr-2">
                    {exercise.title}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getLanguageColor(exercise.language)}`}>
                    {exercise.language.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {exercise.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(exercise.difficulty)}`}>
                    {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                  </span>
                </div>

                {exercise.tags && exercise.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {exercise.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                    {exercise.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                        +{exercise.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold">
                  Start Challenge →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-3">🎓 How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center mb-3 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Choose an Exercise</h3>
              <p className="text-gray-400 text-sm">
                Browse our library of coding challenges across multiple languages and difficulty levels.
              </p>
            </div>
            <div>
              <div className="bg-purple-600 w-10 h-10 rounded-full flex items-center justify-center mb-3 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Write Your Solution</h3>
              <p className="text-gray-400 text-sm">
                Use our built-in code editor to write and test your solution with helpful hints.
              </p>
            </div>
            <div>
              <div className="bg-green-600 w-10 h-10 rounded-full flex items-center justify-center mb-3 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Get AI Feedback</h3>
              <p className="text-gray-400 text-sm">
                Submit your code and receive instant AI scoring, detailed review, and personalized suggestions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
