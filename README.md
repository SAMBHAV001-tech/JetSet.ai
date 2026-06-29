# JetSet.AI — The Ultimate Intelligent Travel Companion ✈️

![JetSet.AI Homescreen](./screenshot.png)

## 🌐 Deployments
* **Frontend (Vercel):** [https://jetset-ai.vercel.app](https://jetset-ai.vercel.app)
* **Backend (Hugging Face Spaces - Docker):** [https://huggingface.co/spaces/SAMBHAV001-tech/JetSet.ai](https://huggingface.co/spaces/SAMBHAV001-tech/JetSet.ai)
* **Database:** Supabase PostgreSQL Cloud Database

---

## 📖 Project Summary
**JetSet.AI** is an advanced, AI-driven trip planner designed to automate, optimize, and organize complex travel plans. Unlike traditional travel engines, JetSet.AI resolves itineraries, books flights, aggregates stays, and analyzes destinations dynamically based on real-time budget, travel dates, companions, and user interests. 

The application utilizes a stateless, high-availability architecture designed for seamless deployment across Vercel (frontend) and Dockerized Hugging Face Spaces (backend).

---

## 🛠️ Tech Stack & Architecture

```mermaid
graph TD
    A[Vercel Frontend - Next.js/React] -->|API Requests| B[Hugging Face Space Backend - NestJS]
    B -->|Stateless Migrations & CRUD| C[Supabase PostgreSQL Database]
    B -->|Fast Parallel Race| D[Grok & Groq API]
    B -->|Fast Parallel Race| E[Google Gemini API]
    B -->|ChromaDB / Local Vectors| F[RAG Travel Context Store]
    B -->|Travel Pricing & Imagery| G[SerpAPI Google Flights & Hotels]
```

### 1. Frontend
* **Framework:** Next.js (App Router) & React 18
* **Styling:** Vanilla CSS, Tailwind CSS for modular views, Glassmorphism panels
* **State & Data Fetching:** TanStack React Query (`@tanstack/react-query`)
* **Icons:** Lucide React

### 2. Backend
* **Framework:** NestJS (TypeScript / Node.js 20)
* **API Architecture:** RESTful Endpoints & Server-Sent Events (SSE) Streaming
* **Database Connection:** Pooling via `@types/pg` (Stateless connection recycling)

### 3. Caching & Storage
* **Primary DB:** Cloud Supabase PostgreSQL (Stateless; tables auto-initialize on boot)
* **RAG Context Store:** Localized Vector Memory Index & ChromaDB

---

## ⚡ Key Optimizations & Design Patterns

### 🔄 Dual-LLM Parallel Racing & Fallback
To avoid Gemini API free-tier exhaustion and guarantee ultra-low latency:
* **The Race Pattern:** When both Grok and Gemini credentials are provided, non-streamed requests (such as destination validation or flight segment extraction) are fired **simultaneously in parallel**. Whichever replies first wins, immediately canceling the slower connection.
* **Circuit Breaker:** If Grok fails or acts slowly, its circuit opens for **30 seconds**. Subsequent requests bypass Grok entirely, going straight to Gemini to avoid timeout delays.
* **SSE Stream Fallback:** Combined trip generation streams start via Grok and seamlessly roll over to Gemini if the socket times out or disconnects.

### ⏱️ Proactive Health Wakeup System
Hugging Face Space free-tier containers hibernate after inactivity. To prevent users from waiting for boot delays:
* **Mount Ping Trigger:** The Next.js frontend triggers a fire-and-forget `GET /health` request the second the homepage loads. This warms up the container *while* the user fills out the trip wizard.
* **Boot Progress Indicator:** If the backend is asleep, the user is presented with a non-intrusive glowing loader box and a simulated container startup bar in the bottom right, while a glowing connection badge on the header changes state (`Active` | `Starting` | `Connecting`).

---

## 🚀 Setup & Deployment

### 1. Backend Local Setup
```bash
cd backend
npm install
npm run start:dev
```
Create a `.env` file in the `backend/` directory:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_key
GROK_API_KEY=your_grok_key
SERPAPI_API_KEY=your_serpapi_key
DATABASE_URL=postgresql://postgres:...supabase.co:5432/postgres
```

### 2. Frontend Local Setup
```bash
cd frontend
npm install
npm run dev
```
Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Production Deployment (Hugging Face + Vercel)
* **Backend:** Build and deploy using the root-level production `Dockerfile` on node alpine.
* **Uptime Keep-Alive:** To keep the free Hugging Face container awake, set up a free Uptime monitor (e.g. UptimeRobot) pointing to `https://<your-subdomain>.hf.space/health` checking every **30 minutes**.
