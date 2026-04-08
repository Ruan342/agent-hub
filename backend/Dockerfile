FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install python dependencies first to cache this layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy main code
COPY . .

# Exposure and Runner
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
