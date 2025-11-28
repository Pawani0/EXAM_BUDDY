import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_api():
    print("Testing University API...")
    
    try:
        # 1. Get Universities
        print("\n1. Fetching Universities...")
        response = requests.get(f"{BASE_URL}/universities")
        if response.status_code == 200:
            universities = response.json()
            print(f"✅ Success: Found {len(universities)} universities")
            print(json.dumps(universities, indent=2))
            
            if universities:
                uni_id = universities[0]['id']
                
                # 2. Get Degrees
                print(f"\n2. Fetching Degrees for University ID {uni_id}...")
                response = requests.get(f"{BASE_URL}/universities/{uni_id}/degrees")
                if response.status_code == 200:
                    degrees = response.json()
                    print(f"✅ Success: Found {len(degrees)} degrees")
                    
                    if degrees:
                        deg_id = degrees[0]['id']
                        
                        # 3. Get Branches
                        print(f"\n3. Fetching Branches for Degree ID {deg_id}...")
                        response = requests.get(f"{BASE_URL}/degrees/{deg_id}/branches")
                        if response.status_code == 200:
                            branches = response.json()
                            print(f"✅ Success: Found {len(branches)} branches")
        else:
            print(f"❌ Failed to fetch universities: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"❌ Error connecting to API: {e}")
        print("Make sure the backend server is running on port 8000.")

if __name__ == "__main__":
    test_api()
