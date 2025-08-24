# GPS Car Tracker - AI Coding Agent Instructions

## Project Overview

Dual-stack IoT GPS car tracker with ESP32-C3 firmware, Node.js backend, and web dashboard.

**Tech Stack**: ESPHome (firmware) → Express.js + SQLite (backend) → Vanilla HTML/JS (frontend) → Docker + Nginx Proxy Manager (deployment)

## Critical Data Flow

1. **ESP32** → Logs GPS to SD card → Uploads CSV via `/upload/:filename` when WiFi available
2. **User** → Uploads receipt photo via `/uploadReceipt` → Gemini OCR → Geocoded → Stored
3. **Dashboard** → Queries `/api/fuel` and `/api/trips` → Displays maps and statistics

## Core Architecture Patterns

### Authentication & Security
- **Zero auth in app** - relies on `X-Auth-User` header from Nginx proxy
- Usage: `req.authUser = req.get("x-auth-user")`
- NPM config: `proxy_set_header X-Auth-User $remote_user;`
- **Rate limits**: GPS uploads (30/min), receipts (10/min), API calls (60/min)
- **File limits**: CSV (10MB), receipts (50MB for 12-48MP cameras)

### Environment & Paths
