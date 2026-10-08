FROM node:22-slim

WORKDIR /app

# Copy package files
COPY backend/package.json backend/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY backend/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Create uploads dir
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["npx", "tsx", "watch", "src/server.ts"]
