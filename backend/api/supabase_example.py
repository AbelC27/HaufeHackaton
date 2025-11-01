"""
Example usage of Supabase client in Django views

This file demonstrates how to use the Supabase client for:
- Database operations (via REST API)
- Authentication
- Storage
- Realtime subscriptions
"""

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET'])
def test_supabase_connection(request):
    """Test the Supabase connection"""
    try:
        # Access the Supabase client from settings
        supabase = settings.supabase
        
        # Test connection by fetching from a table (replace 'your_table' with actual table name)
        # response = supabase.table('your_table').select("*").limit(1).execute()
        
        return Response({
            'status': 'success',
            'message': 'Supabase client is configured',
            'supabase_url': settings.SUPABASE_URL
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_items_from_supabase(request):
    """Example: Fetch data from a Supabase table"""
    try:
        supabase = settings.supabase
        
        # Replace 'items' with your actual table name
        response = supabase.table('items').select("*").execute()
        
        return Response({
            'status': 'success',
            'data': response.data
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def create_item_in_supabase(request):
    """Example: Insert data into a Supabase table"""
    try:
        supabase = settings.supabase
        
        # Get data from request
        data = request.data
        
        # Replace 'items' with your actual table name
        response = supabase.table('items').insert(data).execute()
        
        return Response({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_item_in_supabase(request, item_id):
    """Example: Update data in a Supabase table"""
    try:
        supabase = settings.supabase
        
        # Get data from request
        data = request.data
        
        # Replace 'items' with your actual table name
        response = supabase.table('items').update(data).eq('id', item_id).execute()
        
        return Response({
            'status': 'success',
            'data': response.data
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_item_from_supabase(request, item_id):
    """Example: Delete data from a Supabase table"""
    try:
        supabase = settings.supabase
        
        # Replace 'items' with your actual table name
        response = supabase.table('items').delete().eq('id', item_id).execute()
        
        return Response({
            'status': 'success',
            'message': 'Item deleted successfully'
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Authentication examples
@api_view(['POST'])
def sign_up_with_supabase(request):
    """Example: Sign up a user with Supabase Auth"""
    try:
        supabase = settings.supabase
        
        email = request.data.get('email')
        password = request.data.get('password')
        
        response = supabase.auth.sign_up({
            'email': email,
            'password': password
        })
        
        return Response({
            'status': 'success',
            'user': response.user
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def sign_in_with_supabase(request):
    """Example: Sign in a user with Supabase Auth"""
    try:
        supabase = settings.supabase
        
        email = request.data.get('email')
        password = request.data.get('password')
        
        response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })
        
        return Response({
            'status': 'success',
            'session': response.session,
            'user': response.user
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# Storage example
@api_view(['POST'])
def upload_file_to_supabase(request):
    """Example: Upload a file to Supabase Storage"""
    try:
        supabase = settings.supabase
        
        file = request.FILES.get('file')
        bucket_name = request.data.get('bucket', 'default-bucket')
        
        if not file:
            return Response({
                'status': 'error',
                'message': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Upload file
        response = supabase.storage.from_(bucket_name).upload(
            file.name,
            file.read(),
            {
                'content-type': file.content_type
            }
        )
        
        return Response({
            'status': 'success',
            'data': response
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
