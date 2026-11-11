# MTIK-LinkTest

MTIK-LinkTest is a production-minded starter app for automated bandwidth validation against MikroTik BTest servers. It includes:

- Backend API for managing MikroTik test devices and running tests
- Web dashboard for configuration and results
- Android app starter for mobile access
- RouterOS-aware service architecture for future production hardening

## Architecture

- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite + TypeScript
- Mobile: Android Kotlin + Jetpack Compose
- Device connectivity: MikroTik RouterOS API with BTest server integration

## Quick start

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

### 2) Web app

```bash
cd web
npm install
npm run dev
```

### 3) Android app

Open the `android` directory in Android Studio and sync Gradle.

## Environment variables

Copy `.env.example` to `.env` at the repository root, or create a backend `.env` file.

```bash
cp .env.example .env
```

Example:

```env
PORT=4000
ROUTEROS_HOST=192.168.88.1
ROUTEROS_PORT=8728
ROUTEROS_USER=admin
ROUTEROS_PASSWORD=secret
ROUTEROS_USE_SSL=false
```

## Notes

This repository is a starter implementation designed to be extended with production authentication, database persistence, device inventory, scheduled tests, and stronger security controls. The RouterOS adapter is intentionally structured so the actual MikroTik device API calls can be swapped in without affecting the rest of the application.

## Security

- Use environment variables for router credentials
- Restrict API access to trusted internal networks
- Prefer API-SSL when exposing MikroTik access beyond the local LAN
- Avoid logging raw router credentials or test secrets

## License

Private repository for the MTIK-LinkTest project.
