CREATE TABLE IF NOT EXISTS hotels (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  address TEXT NOT NULL,
  city    TEXT NOT NULL,
  country TEXT NOT NULL,
  lat     DOUBLE PRECISION,
  lng     DOUBLE PRECISION,
  UNIQUE (name, address)
);

CREATE TABLE IF NOT EXISTS reviews (
  id             SERIAL PRIMARY KEY,
  hotel_id       INTEGER NOT NULL REFERENCES hotels (id),
  review_date    DATE NOT NULL,
  reviewer_score NUMERIC(3, 1),
  positive_text  TEXT,
  negative_text  TEXT,
  trip_type      TEXT,
  traveller_type TEXT,
  content_hash   TEXT NOT NULL UNIQUE,
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS reviews_hotel_date_idx
  ON reviews (hotel_id, review_date);

CREATE INDEX IF NOT EXISTS reviews_unprocessed_idx
  ON reviews (id)
  WHERE processed_at IS NULL;


CREATE TABLE IF NOT EXISTS aspect_mentions (
  id          SERIAL PRIMARY KEY,
  hotel_id    INTEGER NOT NULL REFERENCES hotels (id),
  review_id   INTEGER NOT NULL REFERENCES reviews (id),
  review_date DATE NOT NULL,
  aspect      TEXT NOT NULL,
  polarity    SMALLINT NOT NULL CHECK (polarity IN (-1, 1)),
  sentence    TEXT NOT NULL,
  UNIQUE (review_id, aspect, polarity)
);

CREATE INDEX IF NOT EXISTS aspect_mentions_hotel_aspect_date_idx
  ON aspect_mentions (hotel_id, aspect, review_date);
 
 
-- Step 5: the LLM pass for reviews the rules may have got wrong.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS llm_reason TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS llm_processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS reviews_llm_queue_idx
  ON reviews (id)
  WHERE llm_reason IS NOT NULL AND llm_processed_at IS NULL;

ALTER TABLE aspect_mentions
  ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'rule' CHECK (method IN ('rule', 'llm'));


-- Trend detector: good and bad mention counts per hotel, aspect and month.
CREATE TABLE IF NOT EXISTS hotel_aspect_monthly (
  hotel_id       INTEGER NOT NULL REFERENCES hotels (id),
  aspect         TEXT NOT NULL,
  month          DATE NOT NULL,
  positive_count INTEGER NOT NULL,
  negative_count INTEGER NOT NULL,
  PRIMARY KEY (hotel_id, aspect, month)
);


-- Trend detector: one row per detected problem.
CREATE TABLE IF NOT EXISTS alerts (
  id             SERIAL PRIMARY KEY,
  hotel_id       INTEGER NOT NULL REFERENCES hotels (id),
  aspect         TEXT NOT NULL,
  alert_type     TEXT NOT NULL,
  month          DATE NOT NULL,
  baseline_value DOUBLE PRECISION NOT NULL,
  current_value  DOUBLE PRECISION NOT NULL,
  mentions       INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  detected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, aspect, alert_type, month)
);
