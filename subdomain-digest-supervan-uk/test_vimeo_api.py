import requests
import json

# Configuration
BASE_URL = "http://localhost:5000"
# Vimeo Video ID: 76979871
TEST_VIDEO_URL = "https://vimeo.com/76979871" 

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
            print(f"Thumbnail: {data.get('metadata', {}).get('thumbnail')}")
        else:
            print("❌ Failed!")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error during request: {e}")

if __name__ == "__main__":
    test_extract_transcript()
