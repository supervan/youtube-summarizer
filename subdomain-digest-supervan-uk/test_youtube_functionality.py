import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
BASE_URL = "http://localhost:5000"
# A short, reliable video (Google Developers)
TEST_VIDEO_URL = "https://www.youtube.com/watch?v=M7fi_IBeaSM" 

def test_extract_transcript():
    print(f"\n--- Testing Extract Transcript for {TEST_VIDEO_URL} ---")
    url = f"{BASE_URL}/api/extract-transcript"
    payload = {"url": TEST_VIDEO_URL}
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Video Title: {data.get('title')}")
            print(f"Transcript Length: {data.get('length')}")
            # print(f"Snippet: {data.get('transcript')[:100]}...")
        else:
            print("❌ Failed!")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error during request: {e}")

def check_diagnostics():
    print(f"\n--- Checking Diagnostics ---")
    url = f"{BASE_URL}/api/diagnostics"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print("✅ Diagnostics Data:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Failed to get diagnostics. Status: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking diagnostics: {e}")

if __name__ == "__main__":
    check_diagnostics()
    test_extract_transcript()
