***COPILOT GENERATED***

# Game Pointer

Game Pointer is a containerized web application scaffold with a reverse-proxy edge, a Node.js backend, and a frontend build pipeline. The project is designed to be deployed through Docker Compose with Nginx as the public entrypoint.

## Current Project Status

This repository is in an early foundation phase.

- Nginx reverse proxy is configured and ready.
- MongoDB service is defined in Docker Compose.
- Backend service currently contains only initial Express bootstrap code.
- Frontend build currently outputs a placeholder page.

## Architecture

Runtime flow:

1. Client requests hit Nginx on port 80.
2. Requests under `/api` are proxied to the backend service on port 3000.
3. All other requests are routed to the frontend service.
4. Backend is intended to connect to MongoDB via `MONGO_URI`.

## Tech Stack

- Docker + Docker Compose
- Nginx (reverse proxy)
- Node.js 18 (backend and frontend build stage)
- Express (backend framework)
- MongoDB 6

## Repository Layout

```text
.
|- docker-compose.yml
|- README.md
|- backend/
|  |- Dockerfile
|  |- package.json
|  |- server.js
|- frontend/
|  |- Dockerfile
|  |- index.js
|  |- package.json
|- nginx/
	|- default.conf
```

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- A valid OpenAI API key (if OpenAI-backed features are implemented/used)

## Environment Variables

Create a `.env` file in the project root:

```dotenv
MONGO_URI=mongodb://mongodb:27017/game_pointer
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=replace_with_a_long_random_secret
PORT=3000
```

Notes:

- `MONGO_URI` can target the local compose MongoDB service or MongoDB Atlas.
- `PORT` should stay aligned with Nginx upstream config and Compose port mapping.

## Run With Docker Compose

```bash
docker compose up --build
```

Run detached:

```bash
docker compose up --build -d
```

Stop services:

```bash
docker compose down
```

Stop and remove persistent MongoDB volume:

```bash
docker compose down -v
```

## Access

- App entrypoint: `http://localhost`
- API through proxy: `http://localhost/api/...`

## Important Implementation Notes

The backend currently has an entrypoint mismatch:

- `backend/Dockerfile` starts `node index.js`
- `backend/package.json` scripts also use `index.js`
- The file present in the repository is `server.js`

Before expecting backend startup to work, either:

1. Rename `backend/server.js` to `backend/index.js`, or
2. Update backend Dockerfile and npm scripts to use `server.js`.

## Development Workflow (Suggested)

1. Fix backend entrypoint mismatch.
2. Add backend routes (start with `/api/health`).
3. Connect MongoDB with Mongoose and verify connection on startup.
4. Replace frontend placeholder with a real client app.
5. Add request validation, auth flow, and integration tests.

## Operational Notes

- Nginx is the only public container (`80:80`), which is a good production pattern.
- Backend currently allows CORS broadly; tighten policy before production.
- Secrets should be managed through environment injection (not committed files).

## License

No license file is currently defined in this repository.
Add a `LICENSE` file before public distribution.
