# Game Pointer

Game Pointer is a containerized scoring platform with a React frontend, a Node.js/Express backend, and an Nginx reverse proxy. The backend stores data in MongoDB and exposes a JSON API under `/api`.

## What the app provides

- Role-based login (ADMIN, ORGANIZER, VOLUNTEER)
- User, team, and task management
- Scoring workflows with leaderboards
- Audit logs and user history tracking

## Architecture

- Nginx terminates TLS and routes `/api` requests to the backend
- The backend listens on port 3001 and connects to MongoDB
- The frontend is served through Nginx and calls the API via `/api`

## Quick start (Docker)

1. Create a `.env` file in the repo root:

```dotenv
MONGO_URI_TEST=mongodb://your-mongo-host:27017/game_pointer
JWT_SECRET=replace_with_a_long_random_secret
INITIAL_ADMIN_PASSWORD=change_me_admin
INITIAL_USER_PASSWORD=change_me_user
PORT_BACKEND=3001
PORT_FRONTEND=3000
```

2. Build and start:

```bash
docker compose up --build
```

3. Open the app:

- HTTPS entrypoint: `https://localhost`
- API via proxy: `https://localhost/api/health`

Note: The default Nginx config enforces HTTPS and references real domain certificates. For local development, update [nginx/default.conf](nginx/default.conf) to match your environment or run the frontend and backend directly (see below).

## Environment variables

- `MONGO_URI_TEST`: MongoDB connection string used by the backend
- `JWT_SECRET`: Secret used to sign JWT tokens
- `INITIAL_ADMIN_PASSWORD`: Password for the default admin account
- `INITIAL_USER_PASSWORD`: Password for the default organizer account
- `PORT_BACKEND`: Backend port (default: 3001)
- `PORT_FRONTEND`: Frontend port used for CORS (default: 3000)

On startup, the backend ensures these demo accounts exist:

- Admin: username `Gothar az admin`, password from `INITIAL_ADMIN_PASSWORD`
- Organizer: username `Gothar a user`, password from `INITIAL_USER_PASSWORD`

## Local development without Nginx

The frontend is hardcoded to call `/api` on the same origin. If you run the frontend on `localhost:3000` without Nginx, you must add a dev proxy or update the API base URL in the frontend code.

1. Start MongoDB and set `MONGO_URI_TEST` in your environment.
2. Backend:

```bash
cd backend
npm install
npm start
```

3. Frontend:

```bash
cd frontend
npm install
npm start
```

## API overview

- `GET /api/health` - health check
- `POST /api/login` - login and JWT issuance
- `GET /api/users` - user management (admin only)
- `GET /api/tasks` - task management (admin only)
- `GET /api/teams` - team management (admin only)
- `GET /api/scores` - score listing (admin only)
- `GET /api/leaderboard/teams` - team leaderboard
- `GET /api/audit-logs` - audit trail
- `GET /api/user-history/all` - user history

## Repository layout

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
|  |- package.json
|  |- src/
|- nginx/
|  |- default.conf
```
