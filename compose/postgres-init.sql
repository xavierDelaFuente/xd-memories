-- Runs once, when the container's data directory is created. POSTGRES_DB creates the E2E
-- database; this adds one for pnpm dev, so E2E runs (which reseed the demo with their own
-- secret, and sign up many users) never touch what you click through by hand.
create database xd_memories_dev;
