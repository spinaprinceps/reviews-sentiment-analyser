# Hotel Review Intelligence Engine

Reads hotel reviews, finds what guests talk about (cleanliness, noise, staff and 10 more aspects), tracks each hotel month by month, raises an alert when complaints about something suddenly jump, and tells the hotel and any traveller with an upcoming stay. Travellers can find hotels that are good at what they care about, book them and write reviews, which the system analyses on its own.

## Load the dataset

Put the Kaggle file at `server/data/Hotel_Reviews.csv`, start Docker Desktop, then from `server/` run:

```sh
docker compose up -d --wait
npm install
npm run load -- data/Hotel_Reviews.csv
```

The first command starts PostgreSQL 16 (`app`/`app`, database `reviews`, port 5432) and waits until it is ready. The loader creates the tables from `db/schema.sql` if they don't exist, then streams the CSV in. It takes a few minutes.

- Add `--limit 5000` to load only the first 5,000 rows while developing.
- Running the loader again is safe: reviews already in the database are skipped.
- It connects with `DATABASE_URL`, or `postgres://app:app@localhost:5432/reviews` if that's not set.

Already have the data and only need new tables after an update? Run `npm run migrate`. It applies `db/schema.sql` and is safe to repeat.

## Process the reviews

From `server/`, in this order:

```sh
npm run extract              # find aspects with keyword rules and flag risky reviews
npm run llm -- --limit 200   # optional: re-label flagged reviews with Gemini (needs GEMINI_API_KEY in .env)
npm run trends               # rebuild monthly counts and detect alerts (about 25 s)
npm run notify               # tell hotels and booked travellers about new alerts
```

Or let the **background worker** do it. From `server/`, in its own terminal:

```sh
npm run worker
```

Every 60 seconds it checks for new reviews. If there are any, it runs `extract` and then `trends`. Every round it runs `notify`. Set `WORKER_POLL_SECONDS=10` to check more often while testing, and press Ctrl+C to stop it. The worker never runs the Gemini step; run `npm run llm` yourself when you want it.

- `npm test` runs the unit tests.
- `npm run dev` starts the API on http://localhost:3001 and restarts it when files change.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/health` | Whether the API is up |
| `GET /api/meta` | Cities, aspect names, trip types and traveller types, for dropdowns |
| `GET /api/hotels?city=&q=` | Up to 50 hotels, most open alerts first |
| `GET /api/hotels/:id/aspects` | Good and bad mentions per aspect, next to the city average |
| `GET /api/hotels/:id/trends?aspect=` | One aspect month by month |
| `GET /api/hotels/:id/alerts` | Alerts, newest first, with example complaints |
| `POST /api/hotels/:id/reviews` | Saves a new review (201), or 400 / 404 / 409 for a duplicate |
| `GET /api/hotels/:id/notifications` | The hotel staff's notifications |
| `GET /api/recommendations?city=&priorities=` | The 10 best hotels in a city for 1 to 3 aspects |
| `POST /api/travellers` | Signs in with `{ email, name }`, creating the traveller the first time |
| `GET /api/travellers/:id/bookings` | A traveller's bookings |
| `POST /api/travellers/:id/bookings` | Books `{ hotel_id, check_in, check_out }` (1 to 30 nights) |
| `GET /api/travellers/:id/notifications` | A traveller's notifications |
| `POST /api/notifications/:id/read` | Marks a notification as read |

Review bodies are `{ reviewer_score (1-10), positive_text, negative_text, trip_type, traveller_type }`, with at least one of the texts. The server sets the date.

Recommendations use the last 12 months of data, counted back from the newest month with at least 500 mentions, so a few new reviews can't empty the results. Each hotel's % positive is smoothed towards the city average with 20 imaginary mentions, so a hotel with a handful of glowing reviews can't top the list. Each result includes recent positive guest quotes and how many alerts it had on those aspects in the last 6 months.

## Run the website

With the API running, from `client/`:

```sh
npm install
npm run dev
```

Open http://localhost:5173. It has three views:

- **Find a hotel:** a traveller picks a city and up to 3 priorities and gets a ranked list with reasons and guest quotes, and can book a hotel from it.
- **My trips:** sign in with an email and name, see bookings and notifications, and write a review once a stay has started.
- **Hotel insights:** pick a hotel to see new notifications, its aspect scores, monthly trend and alerts.

## Limits

- **No passwords.** Signing in with an email is enough, so this is a demo, not something to put online as it is.
- **Notifications are in-app only.** Email would need a mail service and its credentials.
- **The data ends in August 2017.** Until enough new reviews arrive (500 mentions in one month), "recent" still means the year up to August 2017.
- A new hotel alert needs at least 20 mentions in a month and 60 in the 6 months before, so a few live reviews won't trigger one.
