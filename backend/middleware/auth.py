from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from config.supabase_config import supabase, SUPABASE_URL, SUPABASE_KEY

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token"
            )
        return user_response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


async def get_user_and_scoped_client(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    """
    Returns (user, scoped_client). The scoped client carries the caller's
    own JWT on every Postgrest/Storage request, so RLS policies like
    `auth.uid() = user_id` evaluate correctly. The shared global `supabase`
    client (anon key only, no user context) is NOT sufficient for any
    query that touches an RLS-protected table or storage bucket.
    """
    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

    scoped_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    scoped_client.postgrest.auth(token)
    scoped_client.storage._client.headers["Authorization"] = f"Bearer {token}"

    return user_response.user, scoped_client
