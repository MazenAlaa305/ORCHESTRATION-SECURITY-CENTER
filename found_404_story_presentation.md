# found 404: The Story of a Smarter SOC

*A Tale of Security Orchestration*

---

## Slide 1: The Overwhelmed Defender
Meet **Alex**. Alex is the solo IT admin for a mid-sized healthcare clinic. 
Every day, Alex gets thousands of alerts: "Port 22 Open", "Login Failed", "Database Accessed." 
Alex uses five different tools. None of them talk to each other. Alex doesn't know which alert to investigate first, and simply doesn't have the time or budget to hire a full team.

**The Problem:** Small teams are drowning in noise, fragmented tools, and alert fatigue.

---

## Slide 2: The Dream of "found 404"
What if Alex had an assistant? Not just any assistant, but an *Orchestrator*.
A system that doesn't just show problems, but actually runs the playbook for them. 

Enter **found 404**: A Deterministic Security Information Command Center.
It’s not just a scanner. It's a cohesive engine that connects discovery to validation.

---

## Slide 3: How the Engine Breathes (The Architecture)
When Alex inputs a target into 'found 404', the engine awakens in phases:

1. **Reconnaissance (The Scout):** `Nmap` quietly maps the borders, finding all open doors (Ports).
2. **Deterministic Chaining (The Brain):** The Orchestrator looks at the map. If it sees `Port 80`, it doesn't try breaking into SSH. It dynamically selects *only* web-based attacks (`tags:cve,exposures`). 
3. **Deep Attack (The Striker):** `Nuclei` executes the targeted attack payloads against the specific services, returning validated, mathematically proven vulnerabilities.

---

## Slide 4: Real Risk, Real Context
Alex doesn't just need a list of bugs; Alex needs to know *what matters*.
The **Unified Risk Engine** looks at the target. Is it a public-facing patient database? Or an internal printer?
If the asset is `CRITICAL`, a minor exposure becomes a top priority. The engine automatically scales the Base Risk Score (0-100) using network modifiers, painting the dashboard red only when Alex actually needs to drop everything.

---

## Slide 5: The Glass Pane (The Dashboard)
Alex opens the browser. Instead of endless text logs, a beautiful, high-density 12-column React command center appears.
A live **D3.js Network Graph** pulses across the screen. 
When a new high-risk vulnerability is validated by the engine, the corresponding node on the graph physically pulses red in real-time. Alex instantly clicks the node, sees the Proof of Concept script, and patches the server.

---

## Slide 6: The Future of SME Security
By adopting **found 404**, Alex is no longer reacting to noise. 
The system connects the scattered dots of cybersecurity into one deterministic, clear, and actionable flow. 

**found 404:** Orchestrating defense, so you don't have to.
