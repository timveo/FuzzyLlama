#!/bin/bash

# FuzzyLlama Local Development Startup Script

set -e

echo "🎂 Starting FuzzyLlama Local Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${YELLOW}PostgreSQL is not running.${NC}"
    echo "Starting PostgreSQL..."

    # Try to start PostgreSQL (works on macOS with Homebrew)
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 || brew services start postgresql || true
    fi

    echo "Waiting for PostgreSQL to start..."
    sleep 3

    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL is not running. Please start it manually:${NC}"
        echo "   brew services start postgresql"
        echo "   or"
        echo "   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14"
        exit 1
    fi
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Check if Redis is running
echo -e "${BLUE}Checking Redis...${NC}"
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${YELLOW}Redis is not running.${NC}"
    echo "Starting Redis..."

    # Try to start Redis (works on macOS with Homebrew)
    if command -v brew &> /dev/null; then
        brew services start redis || true
    fi

    echo "Waiting for Redis to start..."
    sleep 2

    if ! redis-cli ping > /dev/null 2>&1; then
        echo -e "${RED}❌ Redis is not running. Please start it manually:${NC}"
        echo "   brew services start redis"
        echo "   or"
        echo "   docker run -d -p 6379:6379 redis:7-alpine"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Redis is running${NC}"

# Create database if it doesn't exist
echo -e "${BLUE}Setting up database...${NC}"
psql -h localhost -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'fuzzyllama_dev'" | grep -q 1 || \
    psql -h localhost -U postgres -c "CREATE DATABASE fuzzyllama_dev;" && \
    echo -e "${GREEN}✓ Database created${NC}" || \
    echo -e "${GREEN}✓ Database already exists${NC}"

# Backend setup
echo ""
echo -e "${BLUE}Setting up backend...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

echo "Running database migrations..."
npx prisma generate
npx prisma migrate dev --name init || true
npx prisma db push

echo -e "${GREEN}✓ Backend setup complete${NC}"

# Frontend setup
echo ""
echo -e "${BLUE}Setting up frontend...${NC}"
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --legacy-peer-deps
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"

# Start services
cd ..
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🚀 Starting FuzzyLlama Services...${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Kill any existing processes on the ports
echo "Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo -e "${BLUE}Starting backend on http://localhost:3000${NC}"
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${BLUE}Starting frontend on http://localhost:5173${NC}"
cd ../frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

cd ..

# Wait for services to start
echo ""
echo "Waiting for services to start..."
sleep 5

# Check if services are running
echo ""
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Check logs/backend.log${NC}"
    exit 1
fi

if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend running (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}❌ Frontend failed to start. Check logs/frontend.log${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ FuzzyLlama is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📱 Frontend:${NC}  http://localhost:5173"
echo -e "${BLUE}🔧 Backend:${NC}   http://localhost:3000"
echo -e "${BLUE}📚 API Docs:${NC}  http://localhost:3000/api"
echo -e "${BLUE}📊 Swagger:${NC}   http://localhost:3000/api/docs"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  Backend:  tail -f logs/backend.log"
echo "  Frontend: tail -f logs/frontend.log"
echo ""
echo -e "${YELLOW}Stop services:${NC}"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  or run: ./stop-local.sh"
echo ""
echo "Press Ctrl+C to stop services..."

# Store PIDs for cleanup script
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

# Keep script running
wait
