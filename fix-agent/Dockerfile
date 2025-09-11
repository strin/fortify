FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the fix-agent code
COPY fix_agent/ ./fix_agent/
COPY setup.py .
COPY README.md .

# Install the package
RUN pip install -e .

# Create non-root user
RUN useradd -m -u 1000 fixagent && chown -R fixagent:fixagent /app
USER fixagent

# Expose port
EXPOSE 8001

# Default command (can be overridden)
CMD ["python", "-m", "fix_agent.server"]