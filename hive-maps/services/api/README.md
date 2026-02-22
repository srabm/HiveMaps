# HiveMaps API

Spring Boot (Kotlin) REST API backed by Postgres. Schema + seed data are managed by Flyway migrations.

## Run (Docker)
```bash
cd hive-maps/services/api
cp .env.example .env
docker compose up --build -d
```

Verify from your host machine:
- `http://localhost:8080/api/hello`
- `http://localhost:8080/api/campuses`

Logs:
```bash
docker compose logs -f
```

Stop:
```bash
docker compose down
```

Reset the dev DB volume (destroys local data):
```bash
docker compose down -v
```

## Environment
Configure `hive-maps/services/api/.env`:
- `GOOGLE_PLACES_API_KEY`: required for `/api/places/*` endpoints.

Notes:
- Basic API startup and non-Places endpoints (`/api/hello`, `/api/campuses`) do not require a real Google key.
- Unit tests run without calling external Google APIs.

## Endpoints
- `GET /api/hello`
- `GET /api/campuses`
- `GET /api/campuses/{SGW|LOY}`
- `GET /api/campuses/{SGW|LOY}/buildings`

## Migrations
Flyway migrations live in `src/main/resources/db/migration/` (e.g., `V1__*.sql`). Add new migrations rather than editing old ones.
