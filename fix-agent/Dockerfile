FROM python:3.11-slim

# Set working directory
WORKDIR /fix-agent

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create generated directory for Prisma client
RUN mkdir -p generated

# Install the package in development mode
RUN pip install -e .

# Create startup script
COPY start_server.sh /fix-agent/start_server.sh
RUN chmod +x /fix-agent/start_server.sh

# Copy worker startup script
COPY start_worker.sh /fix-agent/start_worker.sh
RUN chmod +x /fix-agent/start_worker.sh

# Expose port
EXPOSE 8001

# Default command
CMD ["./start_server.sh"]