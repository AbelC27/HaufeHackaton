import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/solutions - Fetch user's solutions
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const user_email = searchParams.get('user_email');
  const exercise_id = searchParams.get('exercise_id');

  if (!user_email) {
    return NextResponse.json(
      { error: 'user_email is required' },
      { status: 400 }
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    let query = supabase
      .from('solutions')
      .select('*')
      .eq('user_email', user_email)
      .order('created_at', { ascending: false });

    if (exercise_id) {
      query = query.eq('exercise_id', exercise_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch solutions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/solutions - Submit a solution for AI scoring
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      exercise_id,
      user_email,
      submitted_code,
      exercise_description,
      expected_solution,
      language,
      test_cases,
    } = body;

    // Validate required fields
    if (!exercise_id || !user_email || !submitted_code) {
      return NextResponse.json(
        { error: 'Missing required fields: exercise_id, user_email, submitted_code' },
        { status: 400 }
      );
    }

    // Call Django AI service for scoring
    const startTime = Date.now();
    let scoreResponse;
    let scoreData;
    
    try {
      scoreResponse = await fetch('http://127.0.0.1:8000/api/score-exercise/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exercise_description: exercise_description || '',
          expected_solution: expected_solution || '',
          user_solution: submitted_code,
          language: language || 'python',
          test_cases: test_cases || [],
        }),
      });

      if (!scoreResponse.ok) {
        const errorText = await scoreResponse.text();
        console.error('Django error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        return NextResponse.json(
          { error: 'AI scoring failed. Make sure Django backend is running on port 8000.', details: errorData.error || errorText },
          { status: 500 }
        );
      }

      scoreData = await scoreResponse.json();
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Cannot connect to Django backend. Please ensure it is running on http://127.0.0.1:8000/', details: fetchError.message },
        { status: 503 }
      );
    }
    const executionTime = Date.now() - startTime;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Save solution to Supabase
    const { data, error } = await supabase
      .from('solutions')
      .insert([
        {
          exercise_id,
          user_email,
          submitted_code,
          ai_review: scoreData.ai_review,
          ai_score: scoreData.score,
          passed_tests: scoreData.passed_tests,
          execution_time_ms: executionTime,
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save solution', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: data[0],
        ai_review: scoreData.ai_review,
        score: scoreData.score,
        passed_tests: scoreData.passed_tests,
        suggestions: scoreData.suggestions,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
