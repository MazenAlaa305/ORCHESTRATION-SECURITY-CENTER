# backend/Dockerfile — Documentation

## File Purpose

Defines the **Docker container image build instructions** for the FastAPI backend application. Produces a minimal, production-ready Python container that serves the API via Uvicorn.

## Key Build Stages

### Base Image
Uses `python:3.11-slim` — a minimal Debian-based Python image that reduces container size by excluding development tools. The slim variant provides a balance between size and compatibility.

### System Dependencies
Installs any system-level packages required by Python dependencies. Commonly includes:
- `libpq-dev` — PostgreSQL client libraries (required by `psycopg2`)
- `nmap` — The Nmap binary used by `NmapWrapper` for network scanning
- `build-essential` — Required for compiling certain Python packages with C extensions

### Python Dependencies
Sets the working directory to `/app`. Copies `requirements.txt` first (before copying application code) to leverage Docker's layer cache — dependency installation only re-runs if `requirements.txt` changes. Runs `pip install --no-cache-dir -r requirements.txt`.

### Application Code
Copies the entire backend application source code into `/app`.

### Startup Command
Uses `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` to start the FastAPI application with Uvicorn. The `0.0.0.0` binding makes the server accessible from outside the container.

### Exposed Port
`EXPOSE 8000` — Documents that the container listens on port 8000, mapped to the host by `docker-compose.yml`.

## Dependencies

- **`requirements.txt`** — Complete Python dependency list
- **Docker**: Docker or Docker Compose build toolchain
