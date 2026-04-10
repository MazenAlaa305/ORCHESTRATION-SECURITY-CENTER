FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nmap \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Use high timeout and skip pip upgrade for stability
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
