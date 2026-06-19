# Stage 1: Build the Astro application
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code and build
COPY . .
RUN npm run build

# Stage 2: Runtime environment
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy package files and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build outputs (both server entrypoint and client assets)
COPY --from=build /app/dist ./dist

# Set standard environment variables for Cloud Run
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

# Run the standalone Node.js server
CMD ["node", "./dist/server/entry.mjs"]
