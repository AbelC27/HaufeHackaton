// frontend/app/page.tsx

// We must add this at the top. It tells Next.js this is an
// interactive component that runs in the browser (not on the server),
// because we need to use 'useState' and handle 'onClick'.
'use client';

// Import the 'useState' hook from React
import { useState } from 'react';

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
    </main>
  );
}