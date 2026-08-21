-- Migration: 20260821154000_fix_create_repair_job_overload.sql
-- Safely drop legacy 11-parameter create_repair_job function signature to eliminate PostgREST RPC overload ambiguity

DROP FUNCTION IF EXISTS private.create_repair_job(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  numeric,
  numeric,
  uuid
);
