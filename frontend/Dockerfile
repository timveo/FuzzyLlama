# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (handled by docker/nginx/nginx.conf in parent)

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
