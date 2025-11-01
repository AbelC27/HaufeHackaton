import logging
import requests
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


logger = logging.getLogger(__name__)


def _record_review_in_supabase(input_code: str, review_text: str) -> None:
    """Persist the latest review to Supabase if the client is configured."""
    supabase_client = getattr(settings, 'supabase', None)
    if not supabase_client:
        return

    try:
        response = (
            supabase_client
            .table('code_reviews')
            .insert({'input_code': input_code, 'review': review_text})
            .execute()
        )

        error = getattr(response, 'error', None)
        if error:
            message = getattr(error, 'message', None)
            if not message and isinstance(error, dict):
                message = error.get('message')
            logger.warning('Supabase insert error: %s', message or error)
    except Exception as exc:  # pragma: no cover - defensive logging only
        logger.exception('Failed to store review in Supabase: %s', exc)


@api_view(['POST']) # This means this function only accepts POST requests
def review_code(request):
    """
    This is our API endpoint.
    It expects a JSON payload like: {"code": "print('hello')"}
    """
    
    # 1. Get the code from the user's request
    code_to_review = request.data.get('code', '')
    if not code_to_review:
        return Response(
            {'error': 'No code provided.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # 2. This is the prompt we will send to the local LLM
    prompt = f"""
    You are an expert code reviewer for a hackathon. 
    Analyze the following Python code and provide a brief, bulleted list 
    of feedback. Focus on bugs, style (PEP8), and potential improvements.
    
    Code to review:
    ---
    {code_to_review}
    ---
    Your review:
    """

    # 3. Send the prompt to the Ollama server
    # (Make sure your Ollama app is running!)
    ollama_url = "http://localhost:11434/api/generate"
    payload = {
        "model": "codellama", # The model we pulled
        "prompt": prompt,
        "stream": False # Wait for the full response
    }

    try:
        response = requests.post(ollama_url, json=payload, timeout=180) # 3 min timeout
        response.raise_for_status() # Raise an error if the request failed

        # 4. Get the review text and send it back to the frontend
        response_data = response.json()
        review_text = response_data.get("response", "Error: No response from model.")

        _record_review_in_supabase(code_to_review, review_text)

        return Response({'review': review_text})

    except requests.exceptions.ConnectionError:
        return Response(
            {'error': 'Connection Error. Is the Ollama server running?'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except requests.exceptions.RequestException as e:
        return Response(
            {'error': f'An error occurred: {e}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def review_history(request):
    """Return the most recent code reviews stored in Supabase."""
    supabase_client = getattr(settings, 'supabase', None)
    if not supabase_client:
        return Response(
            {'error': 'Supabase client is not configured on the server.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        response = (
            supabase_client
            .table('code_reviews')
            .select('id, input_code, review, created_at')
            .order('created_at', desc=True)
            .limit(10)
            .execute()
        )

        error = getattr(response, 'error', None)
        if error:
            message = getattr(error, 'message', None)
            if not message and isinstance(error, dict):
                message = error.get('message')
            logger.warning('Supabase history fetch error: %s', message or error)
            return Response({'error': message or 'Failed to fetch history.'}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'data': getattr(response, 'data', [])})
    except Exception as exc:
        logger.exception('Failed to fetch review history from Supabase: %s', exc)
        return Response(
            {'error': 'Unable to retrieve review history at this time.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )