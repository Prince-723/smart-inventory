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

# 5. Copy package dependencies first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# 6. Install Node.js dependencies
RUN pnpm install

# 7. Copy the entire project code base (This ignores local .venv due to .dockerignore)
COPY . .

# 8. Set environmental build variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 9. Compile the Next.js production build
# This runs BEFORE the Python virtual environment is created, ensuring Next.js's compiler
# doesn't scan symlinks pointing outside the container during compilation!
RUN pnpm build

# 10. Initialize Python virtual environment inside the working directory (.venv)
# This matches the folder Next.js looks for (.venv/bin/python) at runtime.
RUN python3 -m venv .venv
RUN .venv/bin/pip install --upgrade pip
RUN .venv/bin/pip install --no-cache-dir -r requirements.txt

# 11. Expose standard port 3000 (Render will route public HTTPS traffic to this port)
EXPOSE 3000

# 12. Run the Next.js production server
CMD ["pnpm", "start"]
