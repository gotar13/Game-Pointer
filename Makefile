.PHONY: help up down restart logs build clean prune ps

help:
	@echo "Game Pointer - Docker Commands"
	@echo "=============================="
	@echo "make up          - Start all containers"
	@echo "make down        - Stop all containers"
	@echo "make restart     - Restart all containers"
	@echo "make build       - Build all images"
	@echo "make rebuild     - Clean rebuild (no cache)"
	@echo "make logs        - View all logs"
	@echo "make logs-backend - View backend logs"
	@echo "make logs-frontend - View frontend logs"
	@echo "make ps          - Show container status"
	@echo "make clean       - Remove stopped containers"
	@echo "make prune       - Remove unused Docker objects"
	@echo "make reset       - Full reset (delete everything)"

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

build:
	docker-compose build

rebuild:
	docker-compose build --no-cache

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-recent:
	docker-compose logs --tail=50

logs-recent-backend:
	docker-compose logs --tail=50 backend

logs-recent-frontend:
	docker-compose logs --tail=50 frontend

ps:
	docker-compose ps

clean:
	docker container prune -f

prune:
	docker system prune -a --volumes -f

reset: down prune rebuild up
	@echo "Full reset complete!"

status:
	docker-compose ps
	@echo ""
	@echo "📍 Ports configured in .env:"
	@echo "Frontend: http://localhost:$$(grep PORT_FRONTEND .env | cut -d '=' -f2)"
	@echo "Backend:  http://localhost:$$(grep PORT_BACKEND .env | cut -d '=' -f2)"
