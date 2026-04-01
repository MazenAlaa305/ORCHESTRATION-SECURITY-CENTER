# soar_orchestrator.py — Documentation

## File Purpose

Provides a **lightweight SOAR (Security Orchestration, Automation and Response) client** that triggers predefined automated response playbooks in n8n via HTTP webhooks. When the SIEMAgent classifies an alert as a confirmed threat, this service is called to execute the appropriate incident response action.

## Key Classes

### `SOAROrchestrator`

**`__init__()`**
Reads `settings.N8N_WEBHOOK_URL` as the base URL for all webhook calls.

**`trigger_playbook(action_type, target, context) → Dict`**
The primary method. Constructs and sends an HTTP POST request to the appropriate n8n webhook URL based on `action_type`.

Supported action types and their webhook paths:
| `action_type` | Webhook Path | Effect |
|---|---|---|
| `BLOCK_IP` | `/webhook/block-ip` | Triggers n8n workflow to add the target IP to a firewall blocklist |
| `ISOLATE_HOST` | `/webhook/isolate-host` | Triggers n8n workflow to quarantine the target host via Wazuh active response |
| `CREATE_TICKET` | `/webhook/create-ticket` | Creates a Jira or Linear issue for the security incident |
| `NOTIFY_TEAM` | `/webhook/notify-team` | Sends a Slack/email notification to the security team |

The POST body includes `action_type`, `target` (IP or hostname), `context` (the full SIEM alert data), and a `timestamp`.

Returns the n8n webhook response body as a dictionary, or an error dictionary on connection failure.

**`verify_n8n_connection() → bool`**
Sends a test ping to n8n's base health endpoint. Returns `True` if the n8n instance is reachable.

### Module-Level Instance

`soar_service = SOAROrchestrator()` — Singleton imported by the SIEM agent.

## Dependencies

### Internal
- `app.core.config.settings` — `N8N_WEBHOOK_URL`

### External
- `httpx` or `requests` — HTTP POST requests to n8n
- `logging`
