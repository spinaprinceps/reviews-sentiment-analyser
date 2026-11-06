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


-- Stage 8: when the notifier announced an alert (NULL = not yet).
-- Added once; alerts that existed before the notifier are history, not news,
-- so they are marked as already announced instead of flooding everyone.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'notified_at'
  ) THEN
    ALTER TABLE alerts ADD COLUMN notified_at TIMESTAMPTZ;
    UPDATE alerts SET notified_at = detected_at;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS alerts_unannounced_idx
  ON alerts (id)
  WHERE notified_at IS NULL;


-- Stage 8: people using the traveller page. No passwords: this is a demo sign-in by email.
CREATE TABLE IF NOT EXISTS travellers (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stage 8: a traveller's stay at a hotel.
CREATE TABLE IF NOT EXISTS bookings (
  id           SERIAL PRIMARY KEY,
  traveller_id INTEGER NOT NULL REFERENCES travellers (id),
  hotel_id     INTEGER NOT NULL REFERENCES hotels (id),
  check_in     DATE NOT NULL,
  check_out    DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS bookings_hotel_checkout_idx ON bookings (hotel_id, check_out);
CREATE INDEX IF NOT EXISTS bookings_traveller_idx ON bookings (traveller_id, check_in);

-- Stage 8: in-app messages about alerts.
-- traveller_id NULL = for the hotel's staff; booking_id is NULL for those.
CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  alert_id     INTEGER NOT NULL REFERENCES alerts (id),
  hotel_id     INTEGER NOT NULL REFERENCES hotels (id),
  traveller_id INTEGER REFERENCES travellers (id),
  booking_id   INTEGER REFERENCES bookings (id),
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at      TIMESTAMPTZ,
  UNIQUE NULLS NOT DISTINCT (alert_id, traveller_id)
);

CREATE INDEX IF NOT EXISTS notifications_traveller_idx ON notifications (traveller_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_hotel_idx ON notifications (hotel_id, created_at);
