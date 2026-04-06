# InTheFiles

> A modern chatbot interface for searching the Epstein Files — public court documents and released records.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)

## Features

- 🔍 **Full-text search** across the Epstein files database
- 💬 **Chat-style interface** — ask questions in natural language
- 📊 **Live stats** showing database size and document count
- ⚡ **Suggested queries** to help users get started
- 📱 **Responsive design** — works on desktop and mobile
- 🌙 **Dark theme** — sleek, modern UI

## Tech Stack

| Layer    | Technology              |
|----------|------------------------|
| Frontend | React + Vite + TypeScript |
| Backend  | Node.js + Express + TypeScript |
| Styling  | Custom CSS (no framework) |
| Icons    | Lucide React            |
| API      | Epstein Files Search API |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Installation

```bash
# Install all dependencies (root + server + client)
npm run install:all
```

### Development

```bash
# Start both frontend and backend in dev mode
npm run dev
```

- **Frontend** runs at `http://localhost:5173`
- **Backend** runs at `http://localhost:3001`
- Frontend proxies `/api` requests to backend automatically

### Production Build

```bash
# Build both client and server
npm run build

# Start production server (serves client build)
npm start
```

## Project Structure

```
InTheFiles/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── styles/          # CSS styles
│   │   ├── types.ts         # TypeScript types
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── index.html
│   └── vite.config.ts
├── server/                  # Express backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   └── index.ts         # Server entry point
│   └── tsconfig.json
├── package.json             # Root scripts
└── README.md
```

## Docker Deployment

### Build & Run with Docker

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run
```

The app will be available at `http://localhost:3001`.

### Using Docker Compose

```bash
# Start in detached mode
npm run docker:up

# Stop
npm run docker:down
```

### Deploy to any cloud

The Docker image is self-contained. Deploy it anywhere that runs containers:

```bash
# Build
docker build -t inthefiles .

# Tag for your registry
docker tag inthefiles your-registry.com/inthefiles:latest

# Push
docker push your-registry.com/inthefiles:latest
```

Works with **Railway**, **Fly.io**, **AWS ECS**, **Google Cloud Run**, **Azure Container Apps**, **DigitalOcean App Platform**, and more.

## API Endpoints

| Method | Endpoint        | Description                     |
|--------|----------------|---------------------------------|
| GET    | `/api/search?q=` | Search the Epstein files       |
| GET    | `/api/stats`     | Get database statistics        |

## License

This project is for educational and research purposes. All data is sourced from publicly available court records and documents.
