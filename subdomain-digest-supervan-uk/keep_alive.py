import requests
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

URLS = [
    "https://yt.supervan.uk",
    "https://supervan.uk"
]

def ping_site(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            logging.info(f"Successfully pinged {url} - Status: {response.status_code}")
        else:
            logging.warning(f"Pinged {url} but got status: {response.status_code}")
    except Exception as e:
        logging.error(f"Failed to ping {url}: {str(e)}")

if __name__ == "__main__":
    print(f"Starting keep-alive script for: {', '.join(URLS)}")
    for url in URLS:
        ping_site(url)
