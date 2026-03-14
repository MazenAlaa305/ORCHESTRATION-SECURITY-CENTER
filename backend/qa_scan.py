import urllib.request
import urllib.error
import json
import time
import uuid

def QA_Test():
    base_url = "http://localhost:8000/api/v1"
    headers = {"Content-Type": "application/json"}
    
    # 1. Wait for API to be ready
    print("Waiting for API...")
    time.sleep(2)

    # 2. Create Target
    target_data = {"name": "Lab Test", "base_url": "scanme.nmap.org", "asset_value": "CRITICAL"}
    req = urllib.request.Request(f"{base_url}/targets/", data=json.dumps(target_data).encode("utf-8"), headers=headers, method="POST")
    try:
        res = urllib.request.urlopen(req)
        target = json.loads(res.read().decode())
        print(f"Target Created: {target['id']} - {target['name']}")
    except urllib.error.HTTPError as e:
        print(f"Target creation failed (might exist). Searching for target...")
        req_get = urllib.request.Request(f"{base_url}/targets/", headers=headers, method="GET")
        try:
            res_get = urllib.request.urlopen(req_get)
            targets = json.loads(res_get.read().decode())
            for t in targets:
                if t.get("base_url") == "scanme.nmap.org":
                    target = t
                    print(f"Found existing target: {target['id']}")
                    break
            else:
                target = {"id": targets[0]["id"]} # Fallback to first target
        except Exception:
            print("Failed to fetch targets")
            target = {"id": 1}
    
    # 3. Trigger Scan
    scan_data = {"target_id": str(target["id"]), "scan_type": "full"}
    req2 = urllib.request.Request(f"{base_url}/scans/", data=json.dumps(scan_data).encode("utf-8"), headers=headers, method="POST")
    try:
        res2 = urllib.request.urlopen(req2)
        scan = json.loads(res2.read().decode())
        scan_id = scan['id']
        print(f"Scan Triggered Successfully! Scan ID: {scan_id}")
    except urllib.error.HTTPError as e:
        print(f"Scan trigger failed: {e.read().decode()}")
        return None

    # 4. Poll for completion
    print("Polling for scan completion...")
    max_retries = 60 # 10 minutes approximately
    for i in range(max_retries):
        req_status = urllib.request.Request(f"{base_url}/scans/{scan_id}", headers=headers, method="GET")
        try:
            res_status = urllib.request.urlopen(req_status)
            current_scan = json.loads(res_status.read().decode())
            status = current_scan.get("status")
            print(f"[{i}] Status: {status}")
            
            if status == "completed":
                print("Scan Completed Successfully!")
                print(f"Risk Score: {current_scan.get('risk_score')}")
                # AI Thoughts check for health_score
                thoughts = current_scan.get("agent_thoughts") or {}
                print(f"Health Score: {thoughts.get('health_score')}")
                break
            elif status == "failed":
                print("Scan Failed!")
                return None
        except Exception as e:
            print(f"Error polling: {e}")
        
        time.sleep(10)
    else:
        print("Timeout waiting for scan completion")
        return None

    # 5. Verify Findings
    print("\n--- Summary ---")
    req_vulns = urllib.request.Request(f"{base_url}/vulnerabilities/?scan_id={scan_id}", headers=headers, method="GET")
    try:
        res_vulns = urllib.request.urlopen(req_vulns)
        vulns = json.loads(res_vulns.read().decode())
        print(f"Vulnerabilities Found: {len(vulns)}")
        for v in vulns[:5]: # Show first 5
            print(f" - [{v.get('severity')}] {v.get('title') or v.get('type')}")
    except Exception as e:
        print(f"Failed to fetch findings: {e}")

    return scan_id

if __name__ == "__main__":
    try:
        QA_Test()
    except KeyboardInterrupt:
        print("\nStopped by user.")
