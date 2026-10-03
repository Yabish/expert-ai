-- Idempotent. SQL Server has no read-only transaction mode, so analyst_ro
-- relies on db_datareader plus explicit DENYs (SPEC §4.2).
IF DB_ID('retail') IS NULL CREATE DATABASE retail;
GO
IF SUSER_ID('retail_owner') IS NULL CREATE LOGIN retail_owner WITH PASSWORD = '$(OWNER_PW)', DEFAULT_DATABASE = retail;
IF SUSER_ID('analyst_ro') IS NULL CREATE LOGIN analyst_ro WITH PASSWORD = '$(RO_PW)', DEFAULT_DATABASE = retail;
GO
USE retail;
IF USER_ID('retail_owner') IS NULL CREATE USER retail_owner FOR LOGIN retail_owner;
ALTER ROLE db_owner ADD MEMBER retail_owner;
IF USER_ID('analyst_ro') IS NULL CREATE USER analyst_ro FOR LOGIN analyst_ro;
ALTER ROLE db_datareader ADD MEMBER analyst_ro;
DENY INSERT, UPDATE, DELETE, EXECUTE, ALTER, REFERENCES,
     CREATE TABLE, CREATE VIEW, CREATE PROCEDURE, CREATE FUNCTION, CREATE SCHEMA
  TO analyst_ro;
GO
