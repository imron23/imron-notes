# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Allow downloading required Go toolchain
ENV GOTOOLCHAIN=auto

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN go build -o main .

# Final stage
FROM alpine:latest

WORKDIR /app

# Install certificates for HTTPS requests (notion import)
RUN apk add --no-cache ca-certificates

# Copy the binary from the builder stage
COPY --from=builder /app/main .

# Expose the API port
EXPOSE 8080

# Run the binary
CMD ["./main"]
