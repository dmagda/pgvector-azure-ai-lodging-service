CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE airbnb_listing
    ADD COLUMN description_embedding vector(1536);

