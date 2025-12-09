import google.generativeai as genai
import os
from dotenv import load_dotenv
import time

load_dotenv()
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Updated list with correct names? 
# check_models.py showed 'models/gemini-2.5-flash' etc.
models = [
    'gemini-2.5-flash', 
    'gemini-2.0-flash', 
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest' # Try this alias
]

print(f"Current UTC Time: {time.strftime('%H:%M:%S', time.gmtime())}")

for m in models:
    try:
        print(f"Testing {m}...")
        model = genai.GenerativeModel(m)
        response = model.generate_content("Hello, this is a quota test. Reply with 'OK'.")
        print(f"✅ SUCCESS with {m}: {response.text.strip()}")
        break
    except Exception as e:
        print(f"❌ FAILED with {m}: {e}")
