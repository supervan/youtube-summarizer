import sys
import os
import logging

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app import FreeProxyManager

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_proxy_manager():
    print("🚀 Starting Proxy Manager Test...")
    
    manager = FreeProxyManager()
    
    print("\n1️⃣ Testing Proxy Refresh & Validation...")
    manager._refresh_proxies()
    
    print(f"\n📊 Results:")
    print(f"   Total Proxies Found: {len(manager.proxies)}")
    print(f"   Verified Working Proxies: {len(manager.verified_proxies)}")
    
    if manager.verified_proxies:
        print("\n✅ Success! Found working proxies.")
        print(f"   Example verified proxy: {manager.verified_proxies[0]}")
        
        # Test getting a proxy
        proxy = manager.get_proxy()
        print(f"   get_proxy() returned: {proxy}")
    else:
        print("\n⚠️ Warning: No verified proxies found in initial batch.")
        print("   This might happen if all tested proxies were bad or network is slow.")
        print("   The manager will still return unverified proxies as fallback.")
        
        if manager.proxies:
            proxy = manager.get_proxy()
            print(f"   Fallback proxy returned: {proxy}")
        else:
            print("❌ Error: No proxies found at all!")

if __name__ == "__main__":
    test_proxy_manager()
