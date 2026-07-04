FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
# `gosu` is used by docker-entrypoint.sh to drop privileges from root → celery
# after chowning the avatar upload volume on first start.
RUN apt-get update && apt-get install -y --fix-missing \
    nmap \
    wget \
    unzip \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Install Nuclei vulnerability scanner (pinned version for reproducible builds)
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/') \
    && wget -q "https://github.com/projectdiscovery/nuclei/releases/download/v3.3.8/nuclei_3.3.8_linux_${ARCH}.zip" \
    -O /tmp/nuclei.zip \
    && unzip -q /tmp/nuclei.zip -d /tmp \
    && mv /tmp/nuclei /usr/local/bin/nuclei \
    && chmod +x /usr/local/bin/nuclei \
    && rm /tmp/nuclei.zip \
    && nuclei -update-templates -silent || true

# Install Subfinder for Asset Discovery (subdomain enumeration)
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/') \
    && wget -q "https://github.com/projectdiscovery/subfinder/releases/download/v2.6.6/subfinder_2.6.6_linux_${ARCH}.zip" \
    -O /tmp/subfinder.zip \
    && unzip -q /tmp/subfinder.zip -d /tmp \
    && mv /tmp/subfinder /usr/local/bin/subfinder \
    && chmod +x /usr/local/bin/subfinder \
    && rm /tmp/subfinder.zip

COPY requirements.txt .

# Use high timeout and skip pip upgrade for stability
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY . .

# Create non-root user for runtime security
RUN addgroup --system celery && adduser --system --ingroup celery celery \
    && chown -R celery:celery /app

# Make the entrypoint executable. We deliberately do NOT switch to USER celery
# here — the entrypoint runs as root, chowns the upload volume, then drops to
# the celery user via gosu.
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--loop", "uvloop"]
