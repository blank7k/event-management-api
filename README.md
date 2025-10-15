📘 Event Management REST API

A Node.js + Express + PostgreSQL REST API for managing users, events, and registrations — built with transaction-safe concurrency using SELECT ... FOR UPDATE.

🚀 Setup Instructions
1️⃣ Clone & Install
git clone <your_repo_url>
cd event-api
npm install

2️⃣ Create .env
DATABASE_URL=postgresql://postgres:pass@localhost:5432/events
PORT=3000

3️⃣ Run PostgreSQL (via Docker)
docker run --name ev-postgres -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=events -p 5432:5432 -d postgres:15

4️⃣ Run SQL Schema
psql postgresql://postgres:pass@localhost:5432/events -f init.sql

5️⃣ Start Server
npm run dev

🧩 API Endpoints
| **Feature**             | **Method** | **Endpoint**                                 | **Example Body**                                                                                      |
| ----------------------- | ---------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| ➕ Create User           | `POST`     | `/api/users`                                 | `{ "name": "Rohit", "email": "rohit@example.com" }`                                                   |
| 👥 Get All Users        | `GET`      | `/api/users`                                 | —                                                                                                     |
| 🎉 Create Event         | `POST`     | `/api/events`                                | `{ "title": "Hackathon", "datetime": "2025-11-01T10:00:00Z", "location": "Mumbai", "capacity": 100 }` |
| 🔍 Get Event            | `GET`      | `/api/events/:id`                            | —                                                                                                     |
| 📝 Register for Event   | `POST`     | `/api/events/:id/register`                   | `{ "userId": 1 }`                                                                                     |
| ❌ Cancel Registration   | `DELETE`   | `/api/events/:eventId/registrations/:userId` | —                                                                                                     |
| 🕒 List Upcoming Events | `GET`      | `/api/events/upcoming`                       | —                                                                                                     |
| 📊 Event Stats          | `GET`      | `/api/events/:id/stats`                      | —                                                                                                     |


Use Postman or curl:

curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"title":"Tech Talk","datetime":"2025-11-10T10:00:00Z","location":"Delhi","capacity":50}'


Check upcoming events:

curl http://localhost:3000/api/events/upcoming

⚙️ Concurrency & Business Rules

Uses pessimistic locking via SELECT ... FOR UPDATE to prevent race conditions.

Ensures no overbooking: once capacity is full → returns { "error": "Event is full" }.

Duplicate registrations prevented via unique constraint on (user_id, event_id).

Cannot register for past events (checked via datetime).

All database operations done using transactions.

🧰 Project Structure
src/
 ├─ controllers/
 │   ├─ events.js
 │   └─ users.js
 ├─ db/
 │   └─ index.js
 ├─ middleware/
 │   ├─ asyncHandler.js
 │   ├─ errorHandler.js
 │   └─ validate.js
 └─ routes/
     ├─ events.js
     └─ users.js
index.js
init.sql
.env
README.md

🧩 Tech Stack

Node.js (Express)

PostgreSQL

Joi (validation)

Docker (Postgres)

Nodemon (dev)

ES Lint (clean code)

🧠 Learning Highlights

REST API Design

Validation with Joi

PostgreSQL Transactions

Concurrency Safety

Centralized Error Handling

Async Middleware

Dockerized DB Setup

✨ Author

Rohit Prasad
Built as part of Event Management API assignment 🚀

