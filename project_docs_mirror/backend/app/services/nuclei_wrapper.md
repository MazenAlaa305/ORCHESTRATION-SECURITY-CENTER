# nuclei_wrapper.py — Documentation

## File Purpose

Provides a **Python wrapper around the Nuclei vulnerability scanner** CLI, enabling the attack pipeline to execute community-maintained CVE and misconfiguration templates against discovered targets. Nuclei is a Go-based scanner that uses YAML templates to detect specific known vulnerabilities.

## Key Classes

### `NucleiWrapper`

**`__init__(nuclei_path)`**
Accepts the path to the Nuclei binary (defaults to `"nuclei"` on PATH). Checks that the binary exists and is executable.

**`scan_with_templates(target, templates, output_format="json") → List[Dict]`**
Executes a Nuclei scan against the given `target` URL using a list of template specifiers.

**Logic:**
1. Constructs the Nuclei command: `nuclei -target {target} -t {template} -json -silent` for each template in the list.
2. Runs the command via `subprocess.run()` with a configurable timeout.
3. Parses the JSON-per-line output format (Nuclei outputs one JSON object per finding per line).
4. For each parsed finding, normalizes the output into a standard vulnerability dictionary:
   - `type` → template name/ID
   - `severity` → mapped from Nuclei's severity field
   - `url` → matched URL
   - `evidence` → template metadata and matched value
   - `confidence` → 0.85 (Nuclei findings are considered high confidence due to template specificity)
5. Returns the list of normalized findings.

**`run_tag_scan(target, tags) → List[Dict]`**
Alternative scan method using Nuclei's tag-based template selection (e.g., `tags:cve,exposures`). Constructs the command with `-tags {tags}` instead of `-t`. Enables the AttackAgent's service-to-template mapping to work at a higher level of abstraction.

**`check_available() → bool`**
Returns `True` if the Nuclei binary is accessible on the system. Used by the AttackAgent to gracefully degrade to heuristic-only mode when Nuclei is not installed.

## Dependencies

### External
- `subprocess` — For executing the Nuclei binary
- `json` — Parsing Nuclei JSON output lines
- `logging` — Error logging
