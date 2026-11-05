# Hotel Review Intelligence Engine

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

## Process the reviews

From `server/`, in this order:

```sh
npm run extract              # find aspects with keyword rules and flag risky reviews
npm run llm -- --limit 200   # optional: re-label flagged reviews with Gemini (needs GEMINI_API_KEY in .env)
npm run trends               # rebuild monthly counts and detect alerts
```

- `npm test` runs the unit tests.
- `npm run dev` starts the API on http://localhost:3001 and restarts it when files change.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/health` | Whether the API is up |
| `GET /api/meta` | Cities (with hotel counts) and the aspect names, for dropdowns |
| `GET /api/hotels?city=&q=` | Up to 50 hotels, most open alerts first |
| `GET /api/hotels/:id/aspects` | Good and bad mentions per aspect, next to the city average |
| `GET /api/hotels/:id/trends?aspect=` | One aspect month by month |
| `GET /api/hotels/:id/alerts` | Alerts, newest first, with example complaints |
| `GET /api/recommendations?city=&priorities=` | The 10 best hotels in a city for 1 to 3 aspects |

Recommendations use the last 12 months of data. Each hotel's % positive is smoothed towards the city average with 20 imaginary mentions, so a hotel with a handful of glowing reviews can't top the list. Each result includes recent positive guest quotes and how many alerts it had on those aspects in the last 6 months.

## Run the website

With the API running, from `client/`:

```sh
npm install
npm run dev
```

Open http://localhost:5173. It has two views:

- **Find a hotel:** a traveller picks a city and up to 3 priorities and gets a ranked list with reasons and guest quotes.
- **Hotel insights:** pick a hotel to see its aspect scores, monthly trend and alerts.
