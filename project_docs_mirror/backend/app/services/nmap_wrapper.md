# nmap_wrapper.py — Documentation

## File Purpose

Provides a **Python wrapper around the Nmap command-line tool**, abstracting subprocess execution, XML output parsing, and result normalization into a clean Python API. Used by `ReconAgent` for infrastructure discovery and by `scan_tasks.py` for the legacy Celery scan pipeline.

## Key Classes

### `NmapWrapper`

**`__init__(nmap_path)`**
Accepts an optional path to the Nmap binary (defaults to `settings.NMAP_PATH`, which defaults to `"nmap"` — assumes it is on the system PATH). Verifies the binary is accessible.

**`scan_target(target, scan_type="quick") → List[Dict]`**
The primary public API method. Constructs and executes an Nmap command with appropriate flags based on `scan_type`:

| `scan_type` | Nmap Flags | Description |
|---|---|---|
| `"quick"` | `-sV --open -T4 -F` | Fast scan; only open ports; version detection; top 100 ports |
| `"full"` | `-sV -O --open -T3 -p-` | All 65535 ports; OS fingerprinting; version detection |
| `"custom"` | Configurable | Used for targeted single-port checks |

Executes Nmap via `subprocess.run()` with `-oX -` to produce XML output on stdout. Captures stdout and stderr. If the return code is non-zero or an exception occurs, logs the error and returns an empty list.

**`_parse_nmap_xml(xml_string) → List[Dict]`**
Parses the Nmap XML output using Python's `xml.etree.ElementTree`. For each discovered host:
- Extracts the IP address from `<address>` elements
- Extracts hostname from `<hostname>` elements
- Extracts OS match information from `<osmatch>` elements
- For each open port in `<port>` elements, builds a service record with `port`, `protocol`, `state`, `service`, `product`, `version`, and `cpe`.

Returns a normalized list of host dictionaries: `[{ip, hostname, os, ports: [{port, protocol, state, service, product, version, cpe}]}]`.

**`get_service_version(host, port) → str`**
Convenience method that performs a focused single-port version scan (`-sV -p {port}`) on a specific host and returns the detected service version string.

## Dependencies

### Internal
- `app.core.config.settings` — `NMAP_PATH` configuration

### External
- `subprocess` — For executing the Nmap binary as a child process
- `xml.etree.ElementTree` — Standard library XML parser for Nmap output
- `logging` — Error logging
