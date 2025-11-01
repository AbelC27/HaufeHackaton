'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Exercise = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  language: string;
  starter_code: string;
  solution_code: string;
  test_cases: any[];
  hints: string[];
  tags: string[];
};

type Solution = {
  id: string;
  ai_review: string;
  ai_score: number;
  passed_tests: boolean;
  created_at: string;
};

export default function ExerciseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const exerciseId = params?.id as string;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  
  // Results
  const [showResults, setShowResults] = useState(false);
  const [aiReview, setAiReview] = useState('');
  const [score, setScore] = useState(0);
  const [passedTests, setPassedTests] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Previous attempts
  const [previousSolutions, setPreviousSolutions] = useState<Solution[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Handle tab key for indentation and better text editing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    
    if (e.key === 'Tab') {
      e.preventDefault();

      // Determine indentation based on language
      const indentation = exercise?.language === 'python' ? '    ' : '  '; // 4 spaces for Python, 2 for others

      // Insert indentation at cursor position
      const newCode = code.substring(0, start) + indentation + code.substring(end);
      setCode(newCode);

      // Move cursor after the indentation
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + indentation.length;
      }, 0);
    }
  };

  // Sync scroll between line numbers and code
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
      lineNumbers.scrollTop = e.currentTarget.scrollTop;
    }
  };

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

  // Fetch exercise
  useEffect(() => {
    if (exerciseId) {
      fetchExercise();
    }
  }, [exerciseId]);

  // Fetch previous solutions
  useEffect(() => {
    if (user?.email && exerciseId) {
      fetchPreviousSolutions();
    }
  }, [user, exerciseId]);

  const fetchExercise = async () => {
    try {
      const response = await fetch(`/api/exercises/${exerciseId}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Exercise not found');
        setLoading(false);
        return;
      }

      const ex = result.data;
      setExercise(ex);
      setCode(ex.starter_code || '');
    } catch (err) {
      console.error('Failed to fetch exercise:', err);
      setError('Failed to load exercise');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousSolutions = async () => {
    try {
      const response = await fetch(
        `/api/solutions?user_email=${encodeURIComponent(user.email)}&exercise_id=${exerciseId}`
      );
      const result = await response.json();

      if (response.ok) {
        setPreviousSolutions(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch solutions:', err);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('Please sign in to submit solutions');
      return;
    }

    if (!code.trim()) {
      alert('Please write some code before submitting');
      return;
    }

    setSubmitting(true);
    setError('');
    setShowResults(false);

    try {
      console.log('Submitting solution...', {
        exercise_id: exerciseId,
        language: exercise?.language,
        code_length: code.length,
      });

      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exercise_id: exerciseId,
          user_email: user.email,
          submitted_code: code,
          exercise_description: exercise?.description || '',
          expected_solution: exercise?.solution_code || '',
          language: exercise?.language || 'python',
          test_cases: exercise?.test_cases || [],
        }),
      });

      const result = await response.json();
      console.log('Submission response:', result);

      if (!response.ok) {
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${result.details}` 
          : result.error || 'Submission failed';
        setError(errorMsg);
        setSubmitting(false);
        return;
      }

      // Display results
      setAiReview(result.ai_review || 'Review completed successfully!');
      setScore(result.score || 0);
      setPassedTests(result.passed_tests || false);
      setSuggestions(result.suggestions || []);
      setShowResults(true);

      // Refresh previous solutions
      await fetchPreviousSolutions();
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(`Failed to submit solution: ${err.message || 'Unknown error'}. Make sure both Next.js (port 3000) and Django (port 8000) servers are running.`);
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-400';
      case 'intermediate':
        return 'text-yellow-400';
      case 'advanced':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-gray-400">Loading exercise...</p>
        </div>
      </div>
    );
  }

  if (error && !exercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => router.push('/exercises')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Exercises
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/exercises')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold">{exercise?.title}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-sm font-semibold ${getDifficultyColor(exercise?.difficulty || '')}`}>
                    {exercise?.difficulty?.charAt(0).toUpperCase()}{exercise?.difficulty?.slice(1)}
                  </span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-400">{exercise?.language.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Instructions & Hints */}
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-3">📝 Description</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {exercise?.description}
              </p>
            </div>

            {/* Test Cases */}
            {exercise?.test_cases && exercise.test_cases.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-3">✅ Test Cases</h2>
                <div className="space-y-3">
                  {exercise.test_cases.map((tc: any, idx: number) => (
                    <div key={idx} className="bg-gray-900 rounded p-3 border border-gray-700">
                      <p className="text-sm text-gray-400 mb-1">Test {idx + 1}:</p>
                      <p className="text-sm">
                        <span className="text-blue-400">Input:</span>{' '}
                        <code className="text-green-400">{JSON.stringify(tc.input)}</code>
                      </p>
                      <p className="text-sm">
                        <span className="text-blue-400">Expected:</span>{' '}
                        <code className="text-yellow-400">{JSON.stringify(tc.expected)}</code>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hints */}
            {exercise?.hints && exercise.hints.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <button
                  onClick={() => setShowHints(!showHints)}
                  className="w-full flex items-center justify-between text-xl font-bold mb-3 hover:text-blue-400 transition-colors"
                >
                  <span>💡 Hints ({exercise.hints.length})</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${showHints ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showHints && (
                  <ul className="space-y-2">
                    {exercise.hints.map((hint: string, idx: number) => (
                      <li key={idx} className="text-gray-300 text-sm bg-gray-900 rounded p-3 border border-gray-700">
                        {idx + 1}. {hint}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Previous Attempts */}
            {previousSolutions.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-3">📊 Your Previous Attempts</h2>
                <div className="space-y-3">
                  {previousSolutions.slice(0, 5).map((sol) => (
                    <div key={sol.id} className="bg-gray-900 rounded p-3 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-2xl font-bold ${getScoreColor(sol.ai_score)}`}>
                          {sol.ai_score}/100
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(sol.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sol.passed_tests ? (
                          <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">
                            ✓ Passed
                          </span>
                        ) : (
                          <span className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded">
                            ✗ Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Code Editor & Results */}
          <div className="space-y-6">
            {/* Code Editor */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold">💻 Your Solution</h2>
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                  {exercise?.language.toUpperCase()}
                </span>
              </div>
              
              {/* Code Editor with Line Numbers */}
              <div className="relative flex bg-gray-900 h-96 overflow-hidden">
                {/* Line Numbers */}
                <div 
                  id="line-numbers"
                  className="flex-shrink-0 bg-gray-950 text-gray-500 text-right select-none overflow-hidden border-r border-gray-700"
                  style={{ minWidth: '3.5rem' }}
                >
                  <div className="py-4 px-3 font-mono text-sm">
                    {code.split('\n').map((_, idx) => (
                      <div
                        key={idx}
                        style={{ 
                          height: '1.5rem',
                          lineHeight: '1.5rem'
                        }}
                      >
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Code Textarea - handles newlines properly */}
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onScroll={handleScroll}
                  className="flex-1 font-mono text-sm p-4 bg-gray-900 text-gray-100 border-none focus:outline-none resize-none overflow-auto"
                  placeholder="Write your code here..."
                  spellCheck="false"
                  style={{
                    tabSize: exercise?.language === 'python' ? 4 : 2,
                    lineHeight: '1.5rem',
                    whiteSpace: 'pre',
                    overflowWrap: 'normal',
                    wordBreak: 'normal'
                  }}
                />
              </div>
              
              <div className="bg-gray-900 px-4 py-3 border-t border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {code.split('\n').length} lines • {code.length} characters
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !user}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : !user ? (
                    '🔒 Sign In to Submit'
                  ) : (
                    '🚀 Submit Solution'
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                <strong className="font-bold">Error: </strong>
                <span>{error}</span>
              </div>
            )}

            {/* Results */}
            {showResults && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">🎯 Your Results</h2>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
                      {score}/100
                    </div>
                    {passedTests ? (
                      <span className="text-sm text-green-400">✓ Passed</span>
                    ) : (
                      <span className="text-sm text-red-400">✗ Failed</span>
                    )}
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <div className="mb-4 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-300 mb-2">💡 Key Suggestions:</h3>
                    <ul className="space-y-1">
                      {suggestions.map((sug, idx) => (
                        <li key={idx} className="text-sm text-gray-300">
                          • {sug}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold mb-3">📋 Full AI Review:</h3>
                  <div className="prose prose-invert max-w-none text-sm text-gray-300 whitespace-pre-wrap">
                    {aiReview}
                  </div>
                </div>
              </div>
            )}

            {/* Solution Viewer */}
            {showSolution && exercise?.solution_code && (
              <div className="bg-gray-800 rounded-lg p-6 border border-yellow-700">
                <h2 className="text-xl font-bold mb-3 text-yellow-400">⚠️ Expected Solution</h2>
                <SyntaxHighlighter
                  language={exercise.language}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {exercise.solution_code}
                </SyntaxHighlighter>
              </div>
            )}

            <button
              onClick={() => setShowSolution(!showSolution)}
              className="w-full bg-yellow-900/30 border border-yellow-700 text-yellow-300 py-3 rounded-lg hover:bg-yellow-900/50 transition-all font-semibold"
            >
              {showSolution ? '🙈 Hide Solution' : '👀 Peek at Solution (Spoiler!)'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
