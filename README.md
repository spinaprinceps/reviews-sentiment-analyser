# Hotel Review Intelligence Engine

## Load the dataset

Put the Kaggle file at `server/data/Hotel_Reviews.csv`, start Docker Desktop, then from `server/` run:

```sh
docker compose up -d --wait
npm install
node src/load.js data/Hotel_Reviews.csv
```

The first command starts PostgreSQL 16 (`app`/`app`, database `reviews`, port 5432) and waits until it is ready. The loader creates the tables from `schema.sql` if they don't exist, then streams the CSV in. It takes a few minutes.

- Add `--limit 5000` to load only the first 5,000 rows while developing.
- Running the loader again is safe: reviews already in the database are skipped.
- It connects with `DATABASE_URL`, or `postgres://app:app@localhost:5432/reviews` if that's not set.
- `npm test` runs the cleaning tests.
