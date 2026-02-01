# HiveMaps Mobile

Expo Router app (TypeScript) with a Mapbox-powered Map tab. The Map tab supports switching between SGW and Loyola and persists the selected campus.

## Run (Android/iOS)
```bash
cd hive-maps/apps/mobile
npm install
cp .env.example .env
npx expo prebuild --clean
npx expo run:android   # or: npx expo run:ios
```

Stop Metro (gracefully): press `Ctrl+C`.

## Environment
Configure `hive-maps/apps/mobile/.env`:
- `EXPO_PUBLIC_API_BASE_URL`
  - Android emulator: `http://10.0.2.2:8080`
  - iOS simulator: `http://localhost:8080`
- `EXPO_PUBLIC_MAPBOX_TOKEN` (required to render maps + geocode markers)
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` (required for native builds; Mapbox “downloads:read”)

## Map Behavior
- The campus badge and toggle live on the Map screen (`app/(tabs)/map.tsx`).
- Buildings are fetched from the backend (`/api/campuses/{id}/buildings`), then geocoded via Mapbox to place markers; results are cached locally so subsequent runs are faster.

## Web
`npm run web` works for most screens, but the Map tab shows a fallback because Mapbox RN is native-only in this repo.

## Troubleshooting
- If the Map tab says the backend is unreachable, confirm the API is running and reachable from your device/emulator (Android uses `10.0.2.2`).
- If you change native Mapbox config or tokens, rerun `npx expo prebuild` before `expo run:*`.

