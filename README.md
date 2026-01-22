# HiveMaps
Cross-platform mobile app (Expo/TypeScript) with a Kotlin/Spring Boot backend. Use this guide to set up local dev, run services, and execute tests/CI.

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
- `hive-maps/apps/mobile`: React Native app using Expo Router, TypeScript, ESLint.
- `hive-maps/services/api`: Spring Boot API in Kotlin. Config in `src/main/resources/application.yaml`, controllers in `src/main/kotlin/com/hivemaps/api`.
- `docker-compose.yml` (under `services/api`): Postgres for local dev. Tests use in-memory H2 via `src/test/resources/application.yml`.

## Prerequisites
- Node 18+ with npm, Expo CLI (installed by `npm install`).
- Java 21+, Gradle wrapper (use `./gradlew`), Docker & Docker Compose for Postgres.
- Android Studio / Xcode simulators or Expo Go for device testing.

## Run the Backend (API)
```bash
cd hive-maps/services/api
docker compose up -d db   # start Postgres
./gradlew bootRun         # start API on port 8080
```
- Tests: `./gradlew test` (JUnit 5 + Spring Boot Test, H2 profile). Coverage: `./gradlew jacocoTestReport`.

## Run the Mobile App
```bash
cd hive-maps/apps/mobile
npm install
npm start                 # Expo dev server with QR code
```
- Platform shortcuts: `npm run android` / `npm run ios` / `npm run web`.
- Lint: `npm run lint`. Tests: `npm test` (Jest + React Native Testing Library; Jest config is in `jest.config.js`). Install platform SDKs or use Expo Go for device runs.

## Testing & QA
- Frontend: Jest + React Native Testing Library (`@testing-library/react-native`), jest-expo preset. Add component tests under `__tests__` or alongside components with `.test.tsx` suffix.
- Backend: Spring Boot Test with JUnit 5. Use constructor injection, keep controller tests lightweight, and mock external IO. H2 profile resets schema per run.
- Maestro (planned): add UI flows under `apps/mobile/maestro` and wire into CI once available.

## CI/CD
- GitHub Actions should run lint and tests for both mobile and API. Add new checks to keep pipelines green. Keep PRs small, include test output, and call out DB/schema or API contract changes.