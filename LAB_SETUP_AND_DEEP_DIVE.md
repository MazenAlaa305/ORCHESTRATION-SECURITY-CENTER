# found 404: Lab Setup & Future Horizons

## 1. The Virtual Simulation Lab
The found 404 Virtual Lab is a containerized environment designed to simulate a realistic corporate network with intentional security weaknesses.

### Infrastructure Nodes
| Node | Purpose | Details |
| :--- | :--- | :--- |
| **lab_gateway** | Perimeter Router | Acts as the entry point for the network. |
| **lab_web** | Public Web Asset | Simulates a high-traffic web server. |
| **lab_db** | Internal Database | Running an unauthenticated Redis instance (High Risk). |
| **lab_pc** | Windows 10 Host | Simulates an employee workstation with SMB/RDP enabled. |
| **lab_vuln** | Linux Server | Contains legacy software with known CVEs. |

### Deep Dive: Network Logic
The lab uses **Docker Networks** to isolate these nodes. When you run `docker-compose -f docker-compose.lab.yml up`, it creates a private subnet (usually in the `172.18.x.x` range).
- **Dynamic IP Allocation**: The gateway is assigned `.1`, and internal nodes follow.
- **Service Simulation**: Each node runs `netcat` or specialized docker images to mimic real-world service behavior.

---

## 2. Testing Your First "Deep Scan"

### Phase 1: Target Identification
Run the following to find your lab's IP range:
```bash
docker inspect lab_gateway | grep IPAddress
```

### Phase 2: Execution
1. Navigate to the **Dashboard** -> **Scanner**.
2. Input the subnet (e.g., `172.18.0.0/24`).
3. Click "Deep Scan".
4. **Observe**: Watch the AI Console as Gemini begins to identify the "lab_pc" as a high-risk Windows asset.

---

## 3. Future Work & Vision
found 404 is designed for modular growth. Here is the roadmap for future development:

### 🔭 Phase 4: Vision & Media Intelligence
- **Web Screenshots**: Integrate **Playwright** to take screenshots of discovered web pages.
- **Visual AI**: Use Gemini Pro Vision to "see" if a web page has a login form, sensitive data, or exposed directories.

### 🛡️ Phase 5: Automated Remediation (SOAR)
- **Hardening Agents**: Specialized scripts that can "patch" found vulnerabilities (e.g., closing an open Redis port) with user approval.
- **Firewall Integration**: Automatically generate `iptables` or `ufw` rules based on the network topology.

### ☁️ Phase 6: Cloud Native Scanning
- **AWS/Azure Integrations**: Specialized agents that can scan S3 buckets for public exposure or IAM roles for overly permissive rights.
- **Kubernetes Insights**: Visualizing the security topology of K8s clusters and pods.

### 📊 Phase 7: Enterprise Reporting
- **PDF/Excel Export**: Professional, branded security audit reports for C-level executives.
- **Compliance Mapping**: Automatically map findings to frameworks like NIST, ISO 27001, or SOC2.
