#############################
# Generic Node.js Runtime Dockerfile for DevsArena
# Supports React, Node.js, and Node-Express applications
#############################
FROM golang:1.24-alpine AS pty-builder
# Build inside the pty module directory so the go.mod there is root
WORKDIR /workspace

# Copy module files
COPY internal/pty/go.mod go.mod
COPY internal/pty/go.sum go.sum
RUN go mod download

# Copy all pty source
COPY internal/pty ./

# Create secure directory for pty binary
RUN mkdir -p /pty-service && chmod 700 /pty-service

# Build static pty-server binary to /pty-service
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /pty-service/pty-server .

#############################
# Stage 2: Node.js runtime with pty-server
#############################
FROM node:22-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN apk add --no-cache bash

# Create secure directory for pty binary
RUN mkdir -p /pty-service && chmod 700 /pty-service

WORKDIR /workspace

# Copy pty-server binary into secure dir
COPY --from=pty-builder /pty-service/pty-server /pty-service/pty-server
RUN chmod 700 /pty-service/pty-server && chown appuser:appgroup /pty-service/pty-server

# Copy application source files (works for all Node.js app types)
COPY . ./

# Install nodemon globally for development (useful for all Node.js apps)
RUN npm install -g nodemon

# Switch to non-root
USER appuser

# Expose common ports for different Node.js app types
EXPOSE 8082 5173 3000 4000 5000 8000 9000

# Start the pty server in background and keep the container alive
ENTRYPOINT ["/pty-service/pty-server"]
