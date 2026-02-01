# HiveMaps

HiveMaps is a React Native (Expo + TypeScript) mobile app backed by a Kotlin/Spring Boot API. The Map tab uses Mapbox to display Concordia's SGW and Loyola campuses with a campus switch toggle and persisted selection.

## Team
O(n) My Way

| Name                    | ID        | Role    | GitHub Username |
|-------------------------|-----------|---------|----------------|
| Alvin Biju              |40278182| TBD     |[@Alvin-11](https://github.com/Alvin-11)|
| Diego Samanez Denis     |40286385| TBD     |[@DiegoSamanezDenis](https://github.com/DiegoSamanezDenis)|
| Huu Khoa Kevin Tran     |40283037| TBD     |[@hkevint](https://github.com/hkevint)|
| Jennifer Nguyen         |40178603| TBD     |[@jenniferngu](https://github.com/jenniferngu)|
| Kevin Liu               |40281197| TBD     |[@Ke-Li02](https://github.com/Ke-Li02)|
| Mohamed Mahmoud         |40283160| TBD     |[@memoud0](https://github.com/memoud0)|
| Pritthiraj Dey          |40273416| TBD     |[@rajdey03](https://github.com/rajdey03)|
| Sofia Cimon             |40282210| TBD     |[@sofiacimon](https://github.com/sofiacimon)|
| Srabanti Mazumdar       |40263255| TBD     |[@srabm](https://github.com/srabm)|
| Thi Hong Mai Nguyen     |40248343| TBD     |[@miiyao7](https://github.com/miiyao7)|
| Jovan Gavranovic        |40282175| TBD     |[@jGavranovic](https://github.com/jGavranovic)|
## Repository Layout
- `hive-maps/apps/mobile`: Expo Router app (UI + client orchestration).
- `hive-maps/services/api`: Spring Boot API (REST + Postgres + Flyway migrations).
- `design_docs/`: Architecture + design-pattern references for structure decisions.

## Prerequisites
- Node.js 18+ and npm
- Docker + Docker Compose (for API + Postgres)
- Android Studio (recommended for Android emulator) and/or Xcode (iOS simulator)

## Quick Start (Backend + Mobile)

### 1) Start the backend (API + Postgres)
```bash
cd hive-maps/services/api
docker compose up --build -d
```

Verify from your host machine:
- `http://localhost:8080/api/hello`
- `http://localhost:8080/api/campuses`

If you see DB errors like `relation "campus" does not exist`, reset the dev DB volume and restart:
```bash
docker compose down -v
docker compose up --build -d
```

Stop gracefully:
```bash
docker compose down
```

### 2) Start the mobile app (Android/iOS)
```bash
cd hive-maps/apps/mobile
npm install
cp .env.example .env
npx expo prebuild --clean
npx expo run:android   # or: npx expo run:ios
```

Stop Metro (gracefully): press `Ctrl+C` in the terminal running Expo.

## Configuration (.env)
Mobile reads config from `hive-maps/apps/mobile/.env`:
- `EXPO_PUBLIC_API_BASE_URL`
  - Android emulator: `http://10.0.2.2:8080` (host alias)
  - iOS simulator: `http://localhost:8080`
- `EXPO_PUBLIC_MAPBOX_TOKEN`: Mapbox access token (required to render maps + geocode markers).
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`: Mapbox “downloads:read” token (required for native builds with `@rnmapbox/maps`).

## Campus Data & Endpoints
The API is the source of truth for campuses/buildings:
- `GET /api/campuses`
- `GET /api/campuses/{SGW|LOY}`
- `GET /api/campuses/{SGW|LOY}/buildings`

The mobile app fetches buildings from the API and geocodes addresses via Mapbox to place markers (cached locally).

## Web Support
`npm run web` is available for the Expo app, but the Map tab renders a fallback screen because Mapbox RN is native-only in this repo.

## Project Docs
- Team list: `docs/TEAM.md`
- Contributor guide: `AGENTS.md`

