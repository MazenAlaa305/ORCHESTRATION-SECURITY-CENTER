import urllib.request
import json
import time

base_url = "http://localhost:8000/api/v1"
headers = {"Content-Type": "application/json"}

# Get all targets
req = urllib.request.Request(f"{base_url}/targets/", headers=headers, method="GET")
res = urllib.request.urlopen(req)
targets = json.loads(res.read().decode())

scan_ids = {}

print("Target count:", len(targets))

# Trigger scans concurrently
for target in targets:
    print(f"Triggering scan for {target['name']} ({target['base_url']})")
    scan_data = {"target_id": str(target["id"]), "scan_type": "full"}
    req2 = urllib.request.Request(f"{base_url}/scans/", data=json.dumps(scan_data).encode("utf-8"), headers=headers, method="POST")
    res2 = urllib.request.urlopen(req2)
    scan = json.loads(res2.read().decode())
    scan_ids[target["name"]] = {"id": scan["id"], "status": "pending"}

print("\nWaiting 10 seconds before polling...\n")
time.sleep(10)

# Poll for completion
iteration = 0
while True:
    iteration += 1
    all_done = True
    print(f"--- Poll Iteration {iteration} ---")
    for name, s in scan_ids.items():
        if s["status"] in ["completed", "failed"]:
            continue
            
        all_done = False
        scan_id = s["id"]
        req_status = urllib.request.Request(f"{base_url}/scans/{scan_id}", headers=headers, method="GET")
        try:
            res_status = urllib.request.urlopen(req_status)
            current_scan = json.loads(res_status.read().decode())
            status = current_scan.get("status", "unknown")
            print(f"[{name}] Status: {status}")
            s["data"] = current_scan
            if status in ["completed", "failed"]:
                s["status"] = status
        except Exception as e:
            print(f"Error polling {name}: {e}")
            
    if all_done:
        break
    time.sleep(15)

print("\n==============================")
print("--- Execution Analysis Summary ---")
print("==============================")
for name, s in scan_ids.items():
    print(f"\nTarget: {name}")
    print(f"Final Status: {s['status']}")
    
    scan_id = s["id"]
    risk = s.get("data", {}).get("risk_score")
    thoughts = s.get("data", {}).get("agent_thoughts", {})
    print(f"Risk Score: {risk}")
    print(f"Health Score (Thoughts): {thoughts.get('health_score') if isinstance(thoughts, dict) else thoughts}")

    if s["status"] == "completed":
        try:
            req_vulns = urllib.request.Request(f"{base_url}/vulnerabilities/?scan_id={scan_id}", headers=headers, method="GET")
            res_vulns = urllib.request.urlopen(req_vulns)
            vulns = json.loads(res_vulns.read().decode())
            print(f"Vulnerabilities Found: {len(vulns)}")
            for v in vulns:
                print(f"  -> [{v.get('severity')}] {v.get('title') or v.get('type')}")
        except Exception as e:
            print(f"  [ERROR] Failed to fetch vulnerabilities: {e}")

        try:
            req_logs = urllib.request.Request(f"{base_url}/scans/{scan_id}/logs", headers=headers, method="GET")
            res_logs = urllib.request.urlopen(req_logs)
            logs = json.loads(res_logs.read().decode())
            print(f"\nExecution Logs ({len(logs)} steps):")
            for log in logs:
                agent = log.get('agent_name', 'System')
                msg = log.get('message', '')
                print(f"  [{agent}] {msg}")
        except Exception as e:
            print(f"  [ERROR] Failed to fetch logs: {e}")
    print("-" * 40)
