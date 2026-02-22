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
- `docs/`: Project documentation (currently empty).

Component docs:
- Mobile: `hive-maps/apps/mobile/README.md`
- API: `hive-maps/services/api/README.md`

## Prerequisites
- Node.js 18+ and npm
- Docker + Docker Compose (for API + Postgres)
- Android Studio (recommended for Android emulator) and/or Xcode (iOS simulator)

## Android Studio Setup (Windows/macOS)
This repo uses Expo prebuild (`npx expo prebuild`) and a native Mapbox module (`@rnmapbox/maps`), so a working local Android toolchain is required for `npx expo run:android`.

### 1) Install Android Studio
Install the latest stable Android Studio and include these components during setup:
- Android SDK
- Android SDK Platform
- Android Virtual Device (emulator)

If you already installed Android Studio, you can confirm/install everything via:
- Android Studio → **More Actions** → **SDK Manager**

### 2) Install required SDK packages
In Android Studio → **SDK Manager**:

**SDK Platforms**
- Install at least one modern API level (recommend: the latest installed on your machine, often Android 14 / API 34 or newer).

**SDK Tools**
- Android SDK Platform-Tools (includes `adb`)
- Android SDK Build-Tools
- Android Emulator
- Android SDK Command-line Tools (latest)
- (Windows only) Google USB Driver (only needed for physical Android devices over USB)

Click **Apply** and accept any license prompts.

### 3) Set environment variables
Expo/Gradle needs to find your Android SDK. `ANDROID_HOME` is deprecated, but some tooling still checks it, so set both:
- `ANDROID_SDK_ROOT`
- `ANDROID_HOME` (same value as `ANDROID_SDK_ROOT`)

You also need Java 17 available for the Gradle toolchain:
- `JAVA_HOME` should point to a JDK 17 install (or Android Studio’s embedded JDK).

#### macOS (zsh)
Default SDK path (confirm in Android Studio → SDK Manager): `~/Library/Android/sdk`

Add the following to `~/.zshrc`:
```bash
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"

# JDK 17 (recommended). If you installed a JDK 17, this should resolve it:
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
export PATH="$PATH:$JAVA_HOME/bin"
```

Reload your shell:
```bash
source ~/.zshrc
```

If you prefer Android Studio’s embedded JDK, set `JAVA_HOME` to Android Studio’s `jbr` path instead (location varies by install).

#### Windows
Default SDK path (confirm in Android Studio → SDK Manager): `%LOCALAPPDATA%\Android\Sdk`

Recommended (GUI):
1) Windows Search → “Environment Variables” → **Edit the system environment variables**
2) **Environment Variables…**
3) Under “User variables”, add:
   - `ANDROID_SDK_ROOT` = `%LOCALAPPDATA%\Android\Sdk`
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - `JAVA_HOME` = your JDK 17 path (example: `C:\Program Files\Android\Android Studio\jbr`)
4) Edit your “Path” user variable and add:
   - `%ANDROID_SDK_ROOT%\platform-tools`
   - `%ANDROID_SDK_ROOT%\emulator`
   - `%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin`
   - `%JAVA_HOME%\bin`

Close and reopen your terminal after saving env var changes.

### 4) First-time emulator setup
Create an emulator:
- Android Studio → **Device Manager** → **Create device** → choose a Pixel device → download a system image → finish.

Start the emulator, then confirm your machine sees it:
```bash
adb devices
```

### 5) Verify the toolchain for this repo
From `hive-maps/apps/mobile`:
```bash
npm install
npx expo doctor
npx expo prebuild --clean
npx expo run:android
```

Notes:
- If `adb devices` shows no devices, start the emulator (or plug in a physical device with USB debugging enabled).
- If you’re using WSL on Windows: `expo run:android` works best when run from the same environment where `adb`/Android SDK is installed (often PowerShell/Windows Terminal rather than WSL).

### Common Android setup issues
- **“SDK location not found” / “ANDROID_SDK_ROOT is not set”**: re-check `ANDROID_SDK_ROOT`/`ANDROID_HOME` and restart your terminal/IDE.
- **Licenses not accepted**: install “Android SDK Command-line Tools (latest)” then run `sdkmanager --licenses` (macOS/Linux) or `sdkmanager.bat --licenses` (Windows).
- **Emulator is slow / won’t start**: ensure hardware virtualization is enabled (BIOS/UEFI) and that your OS hypervisor setup supports the Android Emulator.

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
Frontend (`hive-maps/apps/mobile/.env`):
- `EXPO_PUBLIC_API_BASE_URL`
  - Android emulator: `http://10.0.2.2:8080` (host alias)
  - iOS simulator: `http://localhost:8080`
- `EXPO_PUBLIC_MAPBOX_TOKEN`: Mapbox access token (required to render maps + geocode markers).
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`: Mapbox "downloads:read" token (required for native builds with `@rnmapbox/maps`).

Backend (`hive-maps/services/api/.env`):
- `GOOGLE_PLACES_API_KEY`: used by API Places endpoints.
- For local Docker Compose, create `hive-maps/services/api/.env` from `hive-maps/services/api/.env.example`.
- Spring resolves this key from the environment; `.env` is a convenient way for Docker Compose to provide it locally.

CI note:
- Current API unit/smoke CI jobs do not need a real Google key unless tests are added that call Google services directly.

## Campus Data & Endpoints
The API is the source of truth for campuses/buildings:
- `GET /api/campuses`
- `GET /api/campuses/{SGW|LOY}`
- `GET /api/campuses/{SGW|LOY}/buildings`

The mobile app fetches buildings from the API and geocodes addresses via Mapbox to place markers (cached locally).

## Web Support
`npm run web` is available for the Expo app, but the Map tab renders a fallback screen because Mapbox RN is native-only in this repo.

## Project Docs
- Mobile: `hive-maps/apps/mobile/README.md`
- API: `hive-maps/services/api/README.md`
