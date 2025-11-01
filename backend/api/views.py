import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

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