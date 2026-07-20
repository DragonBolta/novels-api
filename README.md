# 📝 Novels API

A backend API for the Novel Platform, providing novel metadata, chapter retrieval, user authentication, and comments.

**Repository:** [DragonBolta/novels-api](https://github.com/DragonBolta/novels-api)

## 🚀 Features

- 🗂 Serve novel metadata: title, author, tags, description, rating, likes
- 📑 Retrieve chapters, chapter lists, and cover images for novels
- 🔍 Flexible search with tag inclusion/exclusion filters
- 🔐 JWT authentication with access + refresh tokens and bcrypt password hashing
- 💬 Comment system with authenticated create, edit, and delete
- ⚡ RESTful API endpoints for frontend consumption

## 🛠 Tech Stack

- 🖥 Backend: Node.js, Express, TypeScript
- 💾 Database: MongoDB
- 🔐 Auth: JSON Web Tokens (access + refresh), bcrypt
- 🐳 Deployment: Docker

## 📡 API Endpoints

### Novels

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/random` | — | Get a random novel |
| GET | `/api/query` | — | Search novels by title, author, and tags (include/exclude) |
| GET | `/api/:novelName` | — | Get metadata for a novel |
| GET | `/api/:novelName/cover` | — | Get a novel's cover image |
| GET | `/api/:novelName/chapterlist` | — | Get a novel's table of contents |
| GET | `/api/:novelName/:chapterNumber` | — | Get a chapter's content |

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Create an account (validates email format and password length; passwords stored as bcrypt hashes) |
| POST | `/auth/login` | — | Log in; returns a short-lived access token and a refresh token |
| POST | `/auth/refreshToken` | — | Exchange a valid refresh token for a new access token |

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/comments` | — | Get comments for a novel/chapter |
| POST | `/comments` | 🔐 Bearer token | Post a comment |
| PUT | `/comments/:commentId` | 🔐 Bearer token | Edit your comment |
| DELETE | `/comments/:commentId` | 🔐 Bearer token | Delete your comment |

Protected routes expect an `Authorization: Bearer <access_token>` header. Expired access tokens can be renewed via `/auth/refreshToken` without re-entering credentials.

## ⚙️ Environment Variables

Create a `.env` file in the project root:

| Variable | Description |
|----------|-------------|
| `DB_URL` | MongoDB connection string (defaults to `mongodb://localhost:27017`) |
| `DB_NAME` | Database name |
| `COLLECTION_NAME` | Collection name for novel metadata |
| `NOVEL_PATH` | Filesystem path to novel content |
| `PORT` | Server port (defaults to `3000`) |
| `SITE_URL` | Frontend origin allowed by CORS |
| `JWT_TOKEN_SECRET` | Secret for signing access tokens |
| `JWT_TOKEN_EXPIRATION` | Access token lifetime (seconds) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_REFRESH_EXPIRATION` | Refresh token lifetime (seconds) |

## 🐳 Run with Docker (Recommended)

Pull and run the latest backend image:

```bash
# Pull the latest backend image
docker pull alvin1212/novels:api-latest

# Run the container
docker run -d -p 3000:3000 --env-file .env --name novels-api alvin1212/novels:api-latest
```

- 🌐 API is available at <http://localhost:3000>

Stop and remove the container:

```bash
docker stop novels-api
docker rm novels-api
```

## 💻 Local Development

To run the backend locally:

```bash
# Clone the repository
git clone https://github.com/DragonBolta/novels-api.git
cd novels-api

# Install dependencies
npm install

# Configure environment variables in a .env file (see table above)
npm run dev
```

## 🌐 Frontend

The API is consumed by the **Novels Frontend**: [DragonBolta/novels-frontend](https://github.com/DragonBolta/novels-frontend)
