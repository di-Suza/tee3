# Tee3 Project

A full-stack cricket management and live scoring application built for Team Tee 3 workflows. The project contains an Express/MongoDB backend and a React/Vite frontend. It supports role-based admin workflows, team and player management, squad selection, series and match lifecycle management, Playing XI selection, live scoring, commentary, public match pages, Socket.IO realtime updates, Redis-backed public caching, and seed utilities for testing.

## Table Of Contents

- [Project Goal](#project-goal)
- [Current Capabilities](#current-capabilities)
- [Monorepo Structure](#monorepo-structure)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Authentication And RBAC](#authentication-and-rbac)
- [Domain Flow](#domain-flow)
- [Backend API Routes](#backend-api-routes)
- [Frontend Routes And Layouts](#frontend-routes-and-layouts)
- [Realtime Socket.IO Flow](#realtime-socketio-flow)
- [Public Cache Flow](#public-cache-flow)
- [Image Upload Flow](#image-upload-flow)
- [Database Collections](#database-collections)
- [Development Rules And Conventions](#development-rules-and-conventions)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Project Goal

The goal is to build a cricket platform with two major surfaces:

1. Public cricket website:
   - Public users can view live, upcoming, and completed matches.
   - Live match pages update in realtime through Socket.IO.
   - Upcoming and completed matches are fetched from the database.
   - Public APIs are optimized with response caching where safe.

2. Admin control panel:
   - Super admin, admin, and scorer roles can manage cricket operations based on permissions.
   - Admin workflows include users, teams, players, squads, series, matches, Playing XI, scoring, and commentary.
   - Live scoring and commentary are pushed to public match rooms in realtime.

## Current Capabilities

- Class-based Express backend.
- MongoDB persistence through Mongoose.
- React 19 frontend with Vite 7.
- Tailwind CSS dark admin/public UI.
- Redux Toolkit Query for API integration and auth-aware base queries.
- Access token in frontend memory.
- Refresh token in an HTTP-only cookie.
- RS256 JWT private/public key flow using base64 encoded PEM keys.
- Auth sessions stored in MongoDB using hashed refresh tokens.
- Role-based route and action protection on both backend and frontend.
- Socket.IO rooms per match.
- Redis-backed public response cache with in-memory fallback.
- Super admin seed command.
- Demo data seed command.
- Team/player image upload through Multer and ImageKit.
- Public routes and protected admin routes.

## Monorepo Structure

```txt
tee3/
  api/
    src/
      app.js                     Express app, middleware, route registration
      server.js                  HTTP + Socket.IO server bootstrap
      config/                    env, DB, logger, Redis
      seed/                      super admin and demo data seeders
      shared/                    errors, middleware, validators, utilities
      sockets/                   Socket.IO gateway
      modules/
        auth/                    login, register, refresh, logout, sessions
        users/                   admin user management
        team/                    admin team CRUD
        squad/                   squad assignment layer
        player/                  player CRUD
        series/                  series CRUD and series teams
        match/                   match lifecycle
        playing-xi/              Playing XI selection
        score/                   live scoring
        commentary/              admin commentary
        user/                    public read-only APIs
  web/
    src/
      app/                       router, store, providers
      features/                  feature-based frontend modules
      shared/                    API base query, socket client, layouts, UI helpers
  package.json                   root helper scripts
  .gitignore                     single root gitignore
  README.md                      project documentation
```

The backend uses `api/src/modules/user` for public read-only APIs. This is different from `api/src/modules/users`, which is the protected admin user management module.

## Technology Stack

### Backend

| Technology | Why It Is Used |
| --- | --- |
| Node.js | Runtime for the API server. |
| Express 5 | HTTP routing, middleware, request handling. |
| MongoDB | Main database for users, teams, players, matches, scores, and sessions. |
| Mongoose 9 | Schema modeling, validation, population, and query abstraction. |
| Socket.IO | Realtime score, match status, Playing XI, and commentary updates. |
| JSON Web Token | Access and refresh token auth. |
| RS256 keys | Private key signs tokens, public key verifies tokens. Safer than one shared secret. |
| bcryptjs | Password hashing. |
| express-validator | Request validation for API payloads and route params. |
| Zod | Environment variable validation only. |
| cookie-parser | Reading refresh token cookie. |
| cors | Frontend/backend cross-origin requests with credentials. |
| helmet | Security headers. |
| express-rate-limit | Basic API abuse protection. |
| pino and pino-http | Structured server and request logging. |
| redis | Public response cache storage. Falls back to memory if Redis is unavailable. |
| multer | Accept image uploads in memory before sending them to ImageKit. |
| ImageKit | Hosted image storage for team logos and player images. |
| nodemon | Development server reload. |

### Frontend

| Technology | Why It Is Used |
| --- | --- |
| React 19 | Component UI layer. |
| Vite 7 | Fast dev server and production build. |
| React Router 7 | Public and protected routing. |
| Redux Toolkit | Global app state. |
| RTK Query | API calls, caching, invalidation, and auth-aware requests. |
| async-mutex | Prevents multiple simultaneous refresh token calls. |
| Tailwind CSS | Utility-first styling. |
| Socket.IO Client | Realtime public and admin updates. |
| Three.js, React Three Fiber, Drei | Public match virtual arena/3D visuals. |

## Architecture Overview

### Backend Architecture

Each backend module follows a class-based layered pattern:

```txt
route -> validator -> controller -> service -> repository -> model
```

- Route:
  Registers HTTP methods and attaches middleware.
- Validator:
  Uses `express-validator` to validate params, query, and body.
- Controller:
  Reads validated data and returns HTTP responses.
- Service:
  Contains business rules and orchestration.
- Repository:
  Talks to Mongoose models.
- Model:
  Defines MongoDB collection schema.

This structure keeps business rules away from route files and keeps database queries away from controllers.

### Frontend Architecture

The frontend is feature-based:

```txt
features/
  auth/
  dashboard/
  home/
  users/
  teams/
  players/
  squads/
  series/
  matches/
  playing-xi/
  scoring/
  commentary/
```

Each feature can own:

- `api/` for RTK Query endpoints.
- `pages/` for route screens.
- `components/` for feature-specific UI.
- `store/` for feature state if needed.

Shared concerns live in `web/src/shared`, such as base API, socket client, permissions, layouts, modals, toast provider, and reusable components.

## Local Setup

### Prerequisites

- Node.js 22 or compatible modern Node.js.
- npm.
- MongoDB Atlas or local MongoDB.
- Optional Redis server for public cache.
- Optional ImageKit account for image upload features.

### 1. Clone And Install

```bash
git clone <repo-url>
cd tee3

npm install
npm --prefix api install
npm --prefix web install
```

The root package exists mainly for helper scripts. The actual applications have their own dependencies in `api/package.json` and `web/package.json`.

### 2. Configure Backend Environment

Create `api/.env` from `api/.env.example`.

```bash
cp api/.env.example api/.env
```

On Windows PowerShell:

```powershell
Copy-Item api/.env.example api/.env
```

Fill the required values:

- `MONGODB_URI`
- `JWT_PRIVATE_KEY_BASE64`
- `JWT_PUBLIC_KEY_BASE64`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- ImageKit keys if team/player image uploads are required.

### 3. Generate JWT Keys

The backend expects base64 encoded PEM keys.

Using OpenSSL:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Convert PEM files to base64.

PowerShell:

```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content private.pem -Raw)))
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content public.pem -Raw)))
```

Put the first output in `JWT_PRIVATE_KEY_BASE64` and the second output in `JWT_PUBLIC_KEY_BASE64`.

### 4. Configure Frontend Environment

The frontend can work without a `.env` file in development because `baseApi.js` defaults to:

```txt
http://localhost:3000/api
```

Optional frontend env values:

```txt
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 5. Start The Apps

Start backend:

```bash
npm run dev:api
```

Start frontend:

```bash
npm run dev:web
```

Default URLs:

- API: `http://localhost:3000`
- Web: `http://localhost:5173`
- Health check: `http://localhost:3000/health`

### 6. Seed Super Admin

Set these in `api/.env`:

```txt
SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=StrongPassword123
```

Run:

```bash
npm run seed:super-admin
```

Super admin is not created through the register API. It is created only through this seed command so that the highest privilege role cannot be self-registered from the application.

### 7. Seed Demo Cricket Data

```bash
npm run seed:demo
```

The demo seed is intended for testing the UI and public live match flows. It creates sample cricket data without replacing existing super admin/admin/scorer accounts.

## Environment Variables

### API Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API server port. Default is `3000`. |
| `MONGODB_URI` | MongoDB connection string. |
| `JWT_PRIVATE_KEY_BASE64` | Base64 encoded RSA private key used to sign JWTs. |
| `JWT_PUBLIC_KEY_BASE64` | Base64 encoded RSA public key used to verify JWTs. |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token lifetime. Current example uses `15m`. |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime. Current example uses `2d`. |
| `REFRESH_COOKIE_NAME` | Refresh cookie name. Defaults to `refreshToken`. |
| `REFRESH_COOKIE_MAX_AGE_MS` | Refresh cookie max age in milliseconds. |
| `COOKIE_SECURE` | Set `true` in HTTPS production. |
| `COOKIE_SAME_SITE` | `lax`, `strict`, or `none`. If `none`, `COOKIE_SECURE` must be true. |
| `COOKIE_DOMAIN` | Optional cookie domain for production. |
| `CORS_ORIGIN` | Allowed frontend origins. Comma-separated origins are supported. |
| `NODE_ENV` | `development`, `test`, or `production`. |
| `LOG_LEVEL` | Pino log level. |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window. |
| `RATE_LIMIT_MAX` | Max requests per rate limit window. |
| `REDIS_URL` | Redis URL for public cache. |
| `SUPER_ADMIN_NAME` | Seeded super admin name. |
| `SUPER_ADMIN_EMAIL` | Seeded super admin email. |
| `SUPER_ADMIN_PASSWORD` | Seeded super admin password. |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint. |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key. |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key. |

### Why Zod Is Used For Env

`api/src/config/env.js` validates environment variables with Zod before the server starts. This prevents the server from running with unsafe or missing production configuration.

API request validation is intentionally done with `express-validator`, not Zod.

## Available Scripts

### Root Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev:api` | Start backend with nodemon. |
| `npm run dev:web` | Start frontend with Vite. |
| `npm run start:api` | Start backend with Node. |
| `npm run seed:super-admin` | Create or update the super admin account. |
| `npm run seed:demo` | Seed demo cricket data. |
| `npm run build:web` | Build frontend. |
| `npm run check:api` | Syntax check backend entry file. |

### API Scripts

| Command | Purpose |
| --- | --- |
| `npm --prefix api run dev` | Backend development server. |
| `npm --prefix api run start` | Backend production-style start. |
| `npm --prefix api run seed:super-admin` | Seed super admin. |
| `npm --prefix api run seed:demo` | Seed demo data. |
| `npm --prefix api run check` | Node syntax check. |

### Web Scripts

| Command | Purpose |
| --- | --- |
| `npm --prefix web run dev` | Frontend development server. |
| `npm --prefix web run build` | Production build. |
| `npm --prefix web run preview` | Preview production build. |

## Authentication And RBAC

### Roles

The project supports three roles:

| Role | Meaning |
| --- | --- |
| `SUPER_ADMIN` | Highest role. Can create admins and scorers. Can manage most admin content. Created only by seed. |
| `ADMIN` | Can create/manage scorers and manage cricket content. |
| `SCORER` | Can access live operational modules like matches, Playing XI, scoring, and commentary. |

### Token Flow

1. User logs in with email and password.
2. Backend verifies password using bcrypt.
3. Backend signs:
   - Access token with RS256 private key.
   - Refresh token with RS256 private key.
4. Access token is returned in the JSON response.
5. Refresh token is stored in an HTTP-only cookie.
6. Frontend keeps access token in Redux memory.
7. If access token expires, RTK Query calls `/auth/refresh`.
8. Refresh endpoint validates the refresh token cookie and checks the session collection.
9. If the session is valid and not revoked, backend returns a new access token.
10. Logout revokes the refresh session and clears the refresh cookie.

This avoids storing access tokens in localStorage and keeps refresh tokens protected from JavaScript through HTTP-only cookies.

### Session Flow

Auth sessions are stored in MongoDB through `AuthSession`.

Stored data:

- `userId`
- hashed refresh token
- role
- user agent
- IP address
- expiry date
- revoked date and reason

Refresh tokens are not stored directly. They are hashed before saving. A revoked or expired session cannot be used to get a new access token.

### Role Creation Rules

- `SUPER_ADMIN` can create `ADMIN` and `SCORER`.
- `ADMIN` can create only `SCORER`.
- `SCORER` cannot create users.
- No role can create `SUPER_ADMIN` through API.
- `SUPER_ADMIN` is created only through `seed:super-admin`.

## Domain Flow

The intended cricket workflow is:

1. Seed or login as super admin.
2. Create admins/scorers if needed.
3. Create players.
4. Create teams.
5. Assign players to team squads from the Squad module.
6. Create a series with selected teams and match type.
7. Create matches only from valid series teams.
8. Record toss.
9. Select Playing XI after toss.
10. Start match.
11. Add balls in scoring panel.
12. Add commentary for scored balls.
13. Public match page receives realtime score and commentary updates.
14. Complete match with winner and result.

### Important Business Rules

- One player can be assigned to only one team squad.
- A team squad can have at most 20 players.
- A team becomes `PUBLISHED` when it has at least 11 squad players.
- A player cannot be deleted while assigned to a squad or selected in a Playing XI.
- A team cannot be deleted while linked with matches or series.
- A series cannot be deleted while scheduled matches exist.
- A match cannot be created unless the series exists.
- Match teams must belong to the selected series.
- Both match teams must have at least 11 squad players.
- Match lifecycle must move step by step:

```txt
UPCOMING -> TOSS_COMPLETED -> PLAYING_XI_SELECTED -> LIVE -> INNINGS_BREAK -> COMPLETED
```

- Toss is recorded through the toss endpoint, not the generic status endpoint.
- Playing XI is selected from the Playing XI module, not directly from match status.
- A match can start only after Playing XI is selected.
- T20 and ODI matches have two innings.
- Test matches can support up to four innings.
- Dismissed players cannot continue batting.
- New batter must be an available Playing XI player who is not out and not already on strike.
- Commentary can be added only for live matches.

## Backend API Routes

All API routes are mounted under `/api` except `/health`.

### Response Shape

Success responses generally follow:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error responses generally follow:

```json
{
  "success": false,
  "message": "Readable error message"
}
```

### Authentication Header

Protected routes require:

```txt
Authorization: Bearer <accessToken>
```

Refresh token is read from the HTTP-only cookie.

### Health

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Confirms backend is running. |

### Auth Routes

Base path: `/api/auth`

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/register` | Bearer token required | Creates `ADMIN` or `SCORER` based on requester role. |
| `POST` | `/login` | Public | Logs user in, returns user and access token, sets refresh cookie. |
| `POST` | `/refresh` | Refresh cookie | Returns a new access token if refresh session is valid. |
| `POST` | `/logout` | Access token + refresh cookie | Revokes current refresh session and clears refresh cookie. |
| `GET` | `/me` | Access token | Returns current user. |

Register body:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "role": "ADMIN"
}
```

Login body:

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### User Management Routes

Base path: `/api/users`

Roles:

- `SUPER_ADMIN`
- `ADMIN`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Paginated users visible to requester. Super admin sees admins/scorers. Admin sees scorers only. |
| `GET` | `/search?name=&page=&limit=` | Search manageable users by name. |
| `GET` | `/:id` | Get one manageable user. |
| `PATCH` | `/:id` | Update name, email, or role within permissions. |
| `DELETE` | `/:id` | Soft delete manageable user and revoke all sessions. |

Update body:

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "SCORER"
}
```

### Team Routes

Base path: `/api/teams`

Roles:

- `SUPER_ADMIN`
- `ADMIN`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | List teams with pagination, search, and status filter. |
| `GET` | `/:id` | Get team by id. |
| `POST` | `/` | Create team with logo file or logo URL. |
| `PATCH` | `/:id` | Update team details and optional logo. |
| `DELETE` | `/:id` | Soft delete team if not linked with matches or series. |

Create/update fields:

- `name`
- `shortName`
- `logo` URL or multipart `logo` file
- `primaryColor`

Reason: team CRUD only owns team identity. Player assignment belongs to the Squad module.

### Squad Routes

Base path: `/api/teams/:teamId/squad`

Roles:

- `SUPER_ADMIN`
- `ADMIN`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Get squad players for a team. |
| `POST` | `/` | Add player to team squad. |
| `DELETE` | `/:playerId` | Remove player from team squad. |

Add body:

```json
{
  "playerId": "mongoObjectId"
}
```

Squad rules:

- A player can belong to only one squad.
- Squad maximum is 20 players.
- Team becomes `PUBLISHED` when it has at least 11 players.
- A player cannot be removed if selected in a live match Playing XI.

### Player Routes

Base path: `/api/players`

Roles:

- `SUPER_ADMIN`
- `ADMIN`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | List players with pagination, search, role, country, and availability filters. |
| `GET` | `/:id` | Get player by id. |
| `POST` | `/` | Create player with optional image file or image URL. |
| `PATCH` | `/:id` | Update player profile and optional image. |
| `DELETE` | `/:id` | Soft delete player if not assigned to squad or Playing XI. |

Create fields:

```json
{
  "name": "Virat Kohli",
  "role": "BATSMAN",
  "country": "India",
  "battingStyle": "RIGHT_HAND_BAT",
  "bowlingStyle": "RIGHT_ARM_MEDIUM",
  "image": "https://example.com/player.png"
}
```

Allowed player roles:

- `BATSMAN`
- `BOWLER`
- `ALL_ROUNDER`
- `WICKET_KEEPER`

Allowed batting styles:

- `RIGHT_HAND_BAT`
- `LEFT_HAND_BAT`

Allowed bowling styles:

- `RIGHT_ARM_FAST`
- `RIGHT_ARM_FAST_MEDIUM`
- `RIGHT_ARM_MEDIUM`
- `LEFT_ARM_FAST`
- `LEFT_ARM_FAST_MEDIUM`
- `LEFT_ARM_MEDIUM`
- `RIGHT_ARM_OFF_BREAK`
- `RIGHT_ARM_LEG_BREAK`
- `LEFT_ARM_ORTHODOX`
- `LEFT_ARM_WRIST_SPIN`

### Series Routes

Base path: `/api/series`

Roles:

- `SUPER_ADMIN`
- `ADMIN`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | List series with pagination, search, status, format, and match type filters. |
| `GET` | `/eligible-teams` | Returns teams eligible for series selection. |
| `GET` | `/:id` | Get one series. |
| `POST` | `/` | Create series. |
| `PATCH` | `/:id` | Update series. |
| `PATCH` | `/:id/status` | Move series status forward. |
| `DELETE` | `/:id` | Delete series if no scheduled matches exist. |
| `POST` | `/:id/teams` | Add teams to a series. |
| `DELETE` | `/:id/teams/:teamId` | Remove team from a series before matches are scheduled. |
| `GET` | `/:id/matches` | Get matches for the series. |

Create body:

```json
{
  "name": "World Cup",
  "season": "2026",
  "startDate": "2026-07-01",
  "endDate": "2026-08-01",
  "format": "A",
  "matchType": "T20",
  "numberOfMatches": 10,
  "teams": [
    { "team": "teamObjectId", "group": "A" }
  ]
}
```

Allowed series statuses:

- `UPCOMING`
- `LIVE`
- `COMPLETED`

Allowed match types:

- `T20`
- `ODI`
- `TEST`

### Match Routes

Base path: `/api/matches`

View roles:

- `SUPER_ADMIN`
- `ADMIN`
- `SCORER`

Content management roles:

- `SUPER_ADMIN`
- `ADMIN`

Live lifecycle roles:

- `SUPER_ADMIN`
- `ADMIN`
- `SCORER`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | List matches with filters. |
| `GET` | `/:id` | Get one match. |
| `POST` | `/` | Create a match for a series using two teams from that series. |
| `PATCH` | `/:id` | Edit upcoming match details. |
| `PATCH` | `/:id/status` | Move match status one lifecycle step where allowed. |
| `PATCH` | `/:id/toss` | Record toss winner and decision. |
| `PATCH` | `/:id/start` | Start match after Playing XI is selected. |
| `PATCH` | `/:id/complete` | Complete match with winner and result. |
| `DELETE` | `/:id` | Delete non-live match. |

Create body:

```json
{
  "seriesId": "seriesObjectId",
  "team1": "teamObjectId",
  "team2": "teamObjectId",
  "scheduledAt": "2026-07-10T10:00:00.000Z",
  "venue": "Narendra Modi Stadium"
}
```

Toss body:

```json
{
  "tossWinner": "teamObjectId",
  "tossDecision": "BAT"
}
```

Complete body:

```json
{
  "winner": "teamObjectId",
  "result": "India won by 18 runs"
}
```

### Playing XI Routes

Base path: `/api/matches/:matchId/playing-xi`

Roles:

- `SUPER_ADMIN`
- `ADMIN`
- `SCORER`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Get match and squad data needed for Playing XI selection. |
| `POST` | `/` | Select exactly 11 players for both teams. |

Selection body:

```json
{
  "team1": [
    { "player": "playerObjectId", "isCaptain": true, "isWicketKeeper": false }
  ],
  "team2": [
    { "player": "playerObjectId", "isCaptain": true, "isWicketKeeper": false }
  ]
}
```

Rules:

- Match must be at `TOSS_COMPLETED`.
- Each side must have exactly 11 players.
- Each side must have exactly one captain.
- Each side must have exactly one wicket keeper.
- Players must belong to that team's squad.
- Same player cannot appear in both teams.
- After successful selection, match moves to `PLAYING_XI_SELECTED`.

### Score Routes

Base path: `/api/matches/:matchId/scores`

Roles:

- `SUPER_ADMIN`
- `ADMIN`
- `SCORER`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Get scoreboard, recent events, stats, player meta, and fall of wickets. |
| `POST` | `/ball` | Add a ball to a live match. |

Add ball body:

```json
{
  "innings": 1,
  "battingTeam": "teamObjectId",
  "striker": "playerObjectId",
  "nonStriker": "playerObjectId",
  "bowler": "playerObjectId",
  "runs": 4,
  "extras": 0,
  "extraType": "NONE",
  "isWicket": false,
  "wicketType": null,
  "dismissedPlayer": null,
  "newBatter": null,
  "note": "Driven through cover"
}
```

Allowed extra types:

- `NONE`
- `WIDE`
- `NO_BALL`
- `BYE`
- `LEG_BYE`

Allowed wicket types:

- `BOWLED`
- `CAUGHT`
- `LBW`
- `RUN_OUT`
- `STUMPED`
- `HIT_WICKET`
- `RETIRED_HURT`
- `OTHER`

Score service handles:

- Overs calculation.
- Legal and illegal balls.
- Strike rotation after odd runs.
- Strike rotation at over end.
- Wicket validation.
- New batter validation.
- Innings limit for T20, ODI, and Test.
- Target setup for second innings.
- Realtime score updates.

### Commentary Routes

Base path: `/api/matches/:matchId/commentary`

Roles:

- `SUPER_ADMIN`
- `ADMIN`
- `SCORER`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Get commentary timeline for a match. |
| `POST` | `/` | Create commentary for latest ball or a selected score event. |
| `DELETE` | `/:id` | Soft delete commentary entry. |

Create body:

```json
{
  "scoreEventId": "scoreEventObjectId",
  "text": "Kohli punches it through cover for four.",
  "type": "FOUR"
}
```

Allowed commentary types:

- `NORMAL`
- `FOUR`
- `SIX`
- `WICKET`
- `MILESTONE`

If `scoreEventId` is not provided, the service attaches commentary to the latest ball. Manual `innings`, `over`, and `ball` can also be supplied.

### Public Routes

Public routes are read-only and do not require auth.

Most public endpoints are available in two forms:

- `/api/public/...`
- `/api/...`

The shorter `/api/...` public aliases are skipped when an `Authorization` header is present, allowing protected admin routes with the same base path to work.

#### Public Home

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/home` | Public home feed: live, upcoming, and recent matches. |
| `GET` | `/api/home` | Same public home feed alias. |

#### Public Matches

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/matches` | List public matches. Supports status and series filters. |
| `GET` | `/api/public/matches/:matchId` | Public match detail. |
| `GET` | `/api/public/matches/:matchId/center` | Match center data: match info, scores, stats, recent events, Playing XI, result. |
| `GET` | `/api/public/matches/:matchId/scorecard` | Public scorecard. |
| `GET` | `/api/public/matches/:matchId/commentary` | Public commentary timeline. |

Alias routes:

| Method | Route |
| --- | --- |
| `GET` | `/api/matches` |
| `GET` | `/api/matches/:matchId` |
| `GET` | `/api/matches/:matchId/center` |
| `GET` | `/api/matches/:matchId/scorecard` |
| `GET` | `/api/matches/:matchId/commentary` |

Public match status filter supports:

- `live`
- `upcoming`
- `completed`

#### Public Series

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/series` | List public series. |
| `GET` | `/api/public/series/:id` | Get public series by id. |
| `GET` | `/api/public/series/:seriesId/points-table` | Series points table. |

Alias routes:

| Method | Route |
| --- | --- |
| `GET` | `/api/series` |
| `GET` | `/api/series/:id` |
| `GET` | `/api/series/:seriesId/points-table` |

#### Public Teams

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/teams` | List public teams. |
| `GET` | `/api/public/teams/:id` | Get public team. |

Alias routes:

| Method | Route |
| --- | --- |
| `GET` | `/api/teams` |
| `GET` | `/api/teams/:id` |

#### Public Players

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/players` | List public players. |
| `GET` | `/api/public/players/:id` | Get public player. |

Alias routes:

| Method | Route |
| --- | --- |
| `GET` | `/api/players` |
| `GET` | `/api/players/:id` |

#### Public Search

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/search` | Search public cricket content. |
| `GET` | `/api/search` | Search alias. |

## Frontend Routes And Layouts

### Public Routes

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `HomePage` | Public landing/home feed with match cards. |
| `/matches/:matchId` | `PublicMatchPage` | Public match center for live, upcoming, and completed matches. |
| `/login` | `LoginPage` | Admin login page. Redirects logged-in users to dashboard. |

### Protected Routes

Protected routes use:

- `ProtectedLayout`
- `RoleRoute`
- Redux auth state
- `ACTION_PERMISSIONS`
- `protectedRoutes`

| Route | Roles | Purpose |
| --- | --- | --- |
| `/dashboard` | Super admin, admin, scorer | Dashboard overview. |
| `/users` | Super admin, admin | Manage admins/scorers based on role. |
| `/teams` | Super admin, admin | Team CRUD. |
| `/squads` | Super admin, admin | Assign players to team squads. |
| `/players` | Super admin, admin | Player CRUD. |
| `/series` | Super admin, admin | Series CRUD and series teams. |
| `/matches` | Super admin, admin, scorer | Match lifecycle. |
| `/playing-xi` | Super admin, admin, scorer | Playing XI selection. |
| `/scoring` | Super admin, admin, scorer | Live scoring control. |
| `/commentary` | Super admin, admin, scorer | Ball commentary control. |

### Frontend Auth Bootstrap

When the app loads:

1. `AuthBootstrap` calls `/auth/refresh`.
2. If refresh returns an access token, frontend calls `/auth/me`.
3. Redux stores access token and user.
4. Protected routes unlock based on role.
5. If refresh fails, auth state is cleared.

### RTK Query Base Flow

`web/src/shared/api/baseApi.js` does the following:

- Adds `Authorization: Bearer <accessToken>` when available.
- Sends cookies with `credentials: include`.
- Uses `cache: no-store` for fetch requests.
- On `401`, uses a mutex so only one refresh request runs.
- Retries the failed request after refresh succeeds.
- Clears auth if refresh fails.

## Realtime Socket.IO Flow

Socket server is attached in `api/src/server.js`.

Socket gateway file:

```txt
api/src/sockets/socketGateway.js
```

### Socket Rooms

Each match has a room:

```txt
match:<matchId>
```

Clients join using:

```txt
match:join
```

Clients leave using:

```txt
match:leave
```

Legacy aliases also exist:

- `join-match`
- `leave-match`

### Socket Events

| Event | Emitted When | Payload Purpose |
| --- | --- | --- |
| `score.updated` | A ball is added. | Sends latest score and score event to match room. |
| `commentary.created` | Commentary is added. | Sends new commentary to match room. |
| `commentary.deleted` | Commentary is deleted. | Sends deleted commentary id to match room. |
| `match.status.updated` | Match status changes. | Sends updated match. |
| `match.started` | Match moves to live. | Lets clients know live scoring started. |
| `match.completed` | Match completes. | Lets clients update result UI. |
| `toss.updated` | Toss is recorded. | Sends toss result and status. |
| `playingXI.updated` | Playing XI is selected. | Sends selected XI and updated match. |
| `public.feed.updated` | Public feed should refresh or patch. | Broadcast to all clients. |

### Public Live Update Flow

1. Public user opens `/matches/:matchId`.
2. Frontend connects socket and emits `match:join`.
3. Admin/scorer adds a ball.
4. Backend saves score event and score.
5. Backend emits `score.updated` to the match room.
6. Frontend patches RTK Query cache immediately.
7. Frontend also refetches as a backup.

This gives fast realtime UI while keeping database as the source of truth.

## Public Cache Flow

Public cache lives in:

```txt
api/src/modules/user/cache/responseCache.js
```

The cache uses Redis when available. If Redis is down, it falls back to in-memory cache.

Caching strategy:

- Public series, teams, players, search, and points table can be cached.
- Public home and live match center use `no-store` to avoid stale realtime data.
- Live match cache is bypassed for live/innings break and match center routes.
- Mutations clear public cache and emit socket events.

Reason: public read APIs can be hit heavily, but live scoring must remain fresh.

## Image Upload Flow

Team and player image upload uses:

- `multer` memory storage.
- Image file validation.
- 5 MB file limit.
- ImageKit upload utility.

Team logo field:

- multipart file field: `logo`
- or JSON/body URL field: `logo`

Player image field:

- multipart file field: `image`
- or JSON/body URL field: `image`

If ImageKit env values are missing, image upload APIs will fail with a clear error. Direct image URLs can still be used where validators allow URL fields.

## Database Collections

Main collections:

| Collection | Model | Purpose |
| --- | --- | --- |
| `users` | `User` | Admin/scorer accounts. |
| `authsessions` | `AuthSession` | Refresh token sessions. |
| `teams` | `Team` | Teams and squad player ids. |
| `players` | `Player` | Player profile data. |
| `series` | `Series` | Series/tournament data. |
| `matches` | `SeriesMatch` | Match schedule, toss, Playing XI, result. |
| `scores` | `Score` | Current innings score summary. |
| `score_events` | `ScoreEvent` | Ball-by-ball scoring history. |
| `commentaries` | `Commentary` | Ball commentary timeline. |

Most destructive operations are soft deletes using `isDeleted`.

## Development Rules And Conventions

### Backend

- Use ES modules only.
- Keep class-based module structure.
- Keep business rules in services.
- Keep database queries in repositories.
- Use `express-validator` for API validation.
- Use Zod only for environment validation.
- Use shared operational errors from `shared/errors`.
- Use `asyncHandler` for controllers where applicable.
- Use `authenticate` before `authorize`.
- Do not create super admin through API.
- Clear public cache and emit socket event after public-facing mutations.

### Frontend

- Keep feature-based folders.
- Add new API endpoints through RTK Query.
- Keep access token in Redux memory only.
- Let refresh token remain in HTTP-only cookie.
- Use route config for protected routes.
- Use permission helpers for feature actions.
- Use shared modals/toasts instead of `alert`.
- Keep public UI usable without login.
- Keep admin UI role-aware.

### Git And Branching Suggestion

- `main`: stable version.
- `develop`: integrated development base.
- feature branches: module-specific work.
- Merge feature branches into `develop` after review.
- Merge `develop` into `main` only after stable verification.

## Verification

Backend syntax check:

```bash
npm run check:api
```

Frontend build:

```bash
npm run build:web
```

Direct API health check:

```bash
curl http://localhost:3000/health
```

Manual smoke test:

1. Start API and web.
2. Seed super admin.
3. Login from `/login`.
4. Create players.
5. Create teams.
6. Assign squads.
7. Create series.
8. Create match.
9. Record toss.
10. Select Playing XI.
11. Start match.
12. Add ball from scoring panel.
13. Open public match page and verify realtime update.
14. Add commentary and verify public commentary update.

## Troubleshooting

### MongoDB `querySrv ECONNREFUSED`

This usually means DNS/network access to MongoDB Atlas failed.

Check:

- Internet connection.
- Atlas IP allowlist.
- Correct `MONGODB_URI`.
- DNS/firewall/VPN.

For local testing, use a local MongoDB URI:

```txt
mongodb://localhost:27017/tee3_backend
```

### CORS Errors

Check `api/.env`:

```txt
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

Also ensure frontend API URL points to the API:

```txt
VITE_API_URL=http://localhost:3000/api
```

### Refresh Token Not Working

Check:

- `credentials: include` is enabled in frontend. It is enabled in `baseApi.js`.
- Backend CORS has `credentials: true`.
- Cookie options match environment.
- If using `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true` is required.

### Image Upload Fails

Check ImageKit env values:

```txt
IMAGEKIT_URL_ENDPOINT=
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
```

If these are missing, upload APIs return an ImageKit configuration error.

### Redis Is Down

The app continues working. The cache falls back to memory and logs:

```txt
Redis unavailable, using in-memory cache fallback
```

### Socket Updates Not Showing

Check:

- API server is running.
- Frontend socket URL is correct.
- Public page joined the correct match room.
- Match status is `LIVE`.
- Browser network tab shows Socket.IO connection.
- Score/commentary mutations are succeeding.

## Summary

This project is a complete cricket admin and public live scoring system. The backend owns all core business rules, permissions, persistence, caching, and realtime events. The frontend provides a public match experience and a role-based admin panel. The architecture is designed so team members can safely work module by module without breaking the whole app.
