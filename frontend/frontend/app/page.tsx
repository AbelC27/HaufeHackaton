// frontend/app/page.tsx

// We must add this at the top. It tells Next.js this is an
// interactive component that runs in the browser (not on the server),
// because we need to use 'useState' and handle 'onClick'.
'use client';

// Import React hooks for state, side-effects, and memoized callbacks
import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

type ReviewHistoryItem = {
  id: string | number;
  input_code: string;
  review: string;
  created_at: string | null;
};

export default function Home() {
  // --- State Variables (with TypeScript types) ---
  // 'code' will store what the user types in the text box
  const [code, setCode] = useState<string>(
    "def hello_world():\n  print('Hello from the hackathon!')\n"
  );
  
  // 'review' will store the AI's feedback
  const [review, setReview] = useState<string>('');
  
  // 'isLoading' will be true while we wait for the API
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Supabase-backed review history
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const supabaseClient = supabase;

  const fetchHistory = useCallback(async () => {
    if (!supabaseClient) {
      setHistory([]);
      if (!isSupabaseConfigured) {
        setHistoryError('Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your frontend environment.');
      }
      return;
    }

    const { data, error } = await supabaseClient
      .from('code_reviews')
      .select('id, input_code, review, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to fetch Supabase history:', error);
      setHistoryError(error.message);
      return;
    }

    const items = (data ?? []) as ReviewHistoryItem[];
    setHistoryError(null);
    setHistory(items);
  }, [supabaseClient]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // --- API Call Function ---
  // This function runs when the user clicks the button
  const handleReview = async () => {
    setIsLoading(true); // Show the loading spinner
    setReview('');      // Clear old reviews

    try {
      // Call our Django backend API. (Make sure Django is running!)
      const response = await fetch('http://127.0.0.1:8000/api/review/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code }), // Send the code from our state
      });

      // We expect the backend to send back JSON, either
      // { review: "..." } on success or { error: "..." } on failure
      const data = await response.json();

      if (!response.ok) {
        // Handle errors from the backend (like if Ollama is down)
        setReview(`Error: ${data.error || response.statusText}`);
      } else {
        // Success! Get the review text and show it
        setReview(data.review);
        await fetchHistory();
      }
    } catch (error) {
      // Handle network errors (like if Django is down)
      setReview(`Error: Could not connect to the review server. Is it running?`);
      console.error(error);
    }

    setIsLoading(false); // Hide the loading spinner
  };

  // --- JSX (HTML) ---
  // This is what renders the page. We use Tailwind classes for styling.
  return (
    <main className="flex min-h-screen flex-col items-center p-12">
      <h1 className="text-4xl font-bold mb-8">AI Code Review 🤖</h1>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* === Left Side: Code Editor === */}
        <div className="flex flex-col">
          <label htmlFor="codeInput" className="text-lg mb-2">Your Code</label>
          <textarea
            id="codeInput"
            className="font-mono text-sm p-4 rounded-lg bg-gray-800 border border-gray-700 h-96"
            value={code}
            // Add the correct type for the 'onChange' event
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
              setCode(e.target.value)
            }
            spellCheck="false"
          />
          <button
            onClick={handleReview}
            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg mt-4 hover:bg-blue-700 disabled:bg-gray-600"
            disabled={isLoading}
          >
            {isLoading ? 'Reviewing...' : 'Review Code'}
          </button>
        </div>

        {/* === Right Side: AI Review === */}
        <div className="flex flex-col">
          <label htmlFor="reviewOutput" className="text-lg mb-2">AI Feedback</label>
          <div
            id="reviewOutput"
            className="font-mono text-sm p-4 rounded-lg bg-gray-800 border border-gray-700 h-96 overflow-y-auto whitespace-pre-wrap"
          >
            {/* Show a spinner while loading */}
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {/* Show the review text when it arrives */}
            {review}
          </div>
        </div>
      </div>

      <section className="mt-12 w-full max-w-6xl">
        <h2 className="text-2xl font-semibold mb-4">Recent Reviews</h2>
        <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
          {historyError && (
            <p className="text-sm text-red-400">{historyError}</p>
          )}

          {!historyError && history.length === 0 && (
            <p className="text-sm text-gray-400">
              {isSupabaseConfigured
                ? 'No reviews saved yet. Run a review to populate the history.'
                : 'Supabase is not configured. Add your Supabase credentials to enable history.'}
            </p>
          )}

          {history.map((item) => {
            const timestamp = item.created_at
              ? new Date(item.created_at).toLocaleString()
              : 'Timestamp unavailable';

            return (
              <article
                key={item.id}
                className="border-b border-gray-700 pb-4 last:border-b-0 last:pb-0"
              >
                <p className="text-xs text-gray-400 mb-2">{timestamp}</p>
                <pre className="mb-2 whitespace-pre-wrap rounded-md bg-gray-900 p-3 text-xs text-gray-200">
                  {item.input_code}
                </pre>
                <pre className="whitespace-pre-wrap rounded-md bg-gray-900 p-3 text-sm text-blue-200">
                  {item.review}
                </pre>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}