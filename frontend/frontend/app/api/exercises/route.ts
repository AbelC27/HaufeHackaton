import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/exercises - Fetch all exercises or filter by difficulty/language
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const difficulty = searchParams.get('difficulty');
  const language = searchParams.get('language');
  const tag = searchParams.get('tag');

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    let query = supabase
      .from('exercises')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (language) {
      query = query.eq('language', language);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch exercises', details: error.message },
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

// POST /api/exercises - Create a new exercise (admin only in production)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      difficulty,
      language,
      starter_code,
      solution_code,
      test_cases,
      hints,
      tags,
    } = body;

    // Validate required fields
    if (!title || !description || !difficulty || !language || !solution_code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert([
        {
          title,
          description,
          difficulty,
          language,
          starter_code,
          solution_code,
          test_cases: test_cases || [],
          hints: hints || [],
          tags: tags || [],
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create exercise', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
