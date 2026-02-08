# EpiTracker - Dog Epilepsy Tracker

A web application for dog owners to track canine idiopathic epilepsy. Log seizure events, medication changes, triggers, and post-ictal behavior. Generate exportable data for veterinarians and neurologists.

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** Passport.js (local strategy) + bcrypt
- **Hosting:** Render

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd epitracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your database URL and a random session secret:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/epitracker
   SESSION_SECRET=your_random_32_char_string
   PORT=3000
   NODE_ENV=development
   ```

5. Initialize the database:
   ```bash
   npm run db:init
   ```

6. Start the server:
   ```bash
   npm start
   ```

7. Open http://localhost:3000 in your browser.

## Features

- **Authentication** - Sign up, log in, session persistence (30-day cookie)
- **Dog Management** - Add multiple dogs with breed, weight, DOB, diagnosis date, photo URL, notes
- **Event Logging** - Log seizure events (full/partial), triggers, post-ictal behavior, medication changes, observations with timestamp, duration, and severity
- **Medication Tracking** - Track active and historical medications with dosage, frequency, and date ranges
- **Dashboard** - View all dogs at a glance with recent events across all dogs
- **Dog Detail** - Full timeline of events and medications per dog, with filtering by type and date range
- **Mobile Responsive** - Designed for use on mobile devices during urgent situations

## Deploying to Render

1. Create a new Web Service on Render connected to this repository
2. Create a PostgreSQL database on Render
3. Set environment variables:
   - `DATABASE_URL` (from Render PostgreSQL)
   - `SESSION_SECRET` (generate a random string)
   - `NODE_ENV=production`
4. Build command: `npm install`
5. Start command: `npm start`
6. After deployment, run `npm run db:init` via Render shell to initialize the schema

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Log in |
| POST | /api/auth/logout | Log out |
| GET | /api/auth/me | Get current user |
| GET | /api/dogs | List user's dogs |
| GET | /api/dogs/:id | Get dog details |
| POST | /api/dogs | Add a dog |
| PUT | /api/dogs/:id | Update a dog |
| DELETE | /api/dogs/:id | Delete a dog |
| GET | /api/events/dog/:dogId | Get events for a dog |
| GET | /api/events/recent | Recent events across all dogs |
| POST | /api/events | Add an event |
| PUT | /api/events/:id | Update an event |
| DELETE | /api/events/:id | Delete an event |
| GET | /api/medications/dog/:dogId | Get medications for a dog |
| POST | /api/medications | Add a medication |
| PUT | /api/medications/:id | Update a medication |
| DELETE | /api/medications/:id | Delete a medication |
