import os
from dotenv import load_dotenv
from langfuse import Langfuse

# Load environment variables from .env file
load_dotenv()

def test_connection():
    print("Checking keys...")
    print(f"Host: {os.getenv('LANGFUSE_HOST')}")
    print(f"Public Key: {os.getenv('LANGFUSE_PUBLIC_KEY')}")
    
    # Initialize explicit client
    langfuse = Langfuse()
    
    # Run the native SDK auth check
    connected = langfuse.auth_check()
    print(f"Auth Check Result: {connected}")
    
    if connected:
        print("Success! Triggering a manual forced flush trace...")
        trace = langfuse.trace(name="Manual_Diagnostic_Test")
        trace.span(name="Hello_World_Span", output="Connection confirmed.")
        langfuse.flush()
        print("Data flushed successfully.")
    else:
        print("Authentication failed. Please check if keys match Project Settings exactly.")

if __name__ == "__main__":
    test_connection()
