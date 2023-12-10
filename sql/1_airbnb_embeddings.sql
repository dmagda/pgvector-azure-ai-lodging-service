CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS azure_ai;

ALTER TABLE airbnb_listing
    ADD COLUMN description_embedding vector(1536);

