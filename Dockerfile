# 1. Base Image: Stable Node.js 20 on Debian Bookworm
FROM node:20-bookworm

# 2. Install Python 3, pip, and virtual environment tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 3. Enable PNPM globally
RUN npm install -g pnpm

# 4. Set container working directory
WORKDIR /app

# 5. Copy package dependencies and requirements first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* requirements.txt ./

# 6. Initialize Python virtual environment inside the working directory (.venv)
# This matches the folder Next.js looks for (.venv/bin/python) out-of-the-box!
RUN python3 -m venv .venv
RUN .venv/bin/pip install --upgrade pip
RUN .venv/bin/pip install --no-cache-dir -r requirements.txt

# 7. Install Node.js dependencies
RUN pnpm install

# 8. Copy the entire project code base
COPY . .

# 9. Set environmental build variables (database connection warning skipped at build time)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 10. Compile the Next.js production build
RUN pnpm build

# 11. Expose standard port 3000 (Render will route public HTTPS traffic to this port)
EXPOSE 3000

# 12. Run the Next.js production server
CMD ["pnpm", "start"]
