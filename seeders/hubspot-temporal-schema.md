# HubSpot Temporal Database Schema

This document outlines the PostgreSQL schema design for storing HubSpot entity data with temporal tracking capabilities.

## Design Goals

1. Store complete snapshots of HubSpot entities
2. Track changes over time with temporal validity periods
3. Support point-in-time queries for any historical state
4. Enable efficient analytics and reporting across time periods
5. Maintain associations between entities as they change
6. Integrate with R2/S3 for full JSON snapshot backups

## Schema Design

### Core Entity Tables

All entity tables share a common temporal table pattern with:
- UUID primary key matching HubSpot's identifier
- JSON storage for all entity properties
- Temporal validity tracking (valid_from/valid_to)
- Daily snapshot reference
- Generated column for current record status

```sql
CREATE TABLE hubspot_companies (
  id UUID PRIMARY KEY,
  hubspot_id VARCHAR(255),
  properties JSONB NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  snapshot_date DATE NOT NULL,
  is_current BOOLEAN GENERATED ALWAYS AS (valid_to IS NULL) STORED
);

CREATE TABLE hubspot_contacts (
  id UUID PRIMARY KEY,
  hubspot_id VARCHAR(255),
  properties JSONB NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  snapshot_date DATE NOT NULL,
  is_current BOOLEAN GENERATED ALWAYS AS (valid_to IS NULL) STORED
);

CREATE TABLE hubspot_deals (
  id UUID PRIMARY KEY,
  hubspot_id VARCHAR(255),
  properties JSONB NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  snapshot_date DATE NOT NULL,
  is_current BOOLEAN GENERATED ALWAYS AS (valid_to IS NULL) STORED
);

CREATE TABLE hubspot_tickets (
  id UUID PRIMARY KEY,
  hubspot_id VARCHAR(255),
  properties JSONB NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  snapshot_date DATE NOT NULL,
  is_current BOOLEAN GENERATED ALWAYS AS (valid_to IS NULL) STORED
);

CREATE TABLE hubspot_notes (
  id UUID PRIMARY KEY,
  hubspot_id VARCHAR(255),
  properties JSONB NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  snapshot_date DATE NOT NULL,
  is_current BOOLEAN GENERATED ALWAYS AS (valid_to IS NULL) STORED
);

CREATE TABLE hubspot_tasks (
  id UUID PRIMARY KEY,
  hubspot_id VARCHAR(255),
  properties JSONB NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  snapshot_date DATE NOT NULL,
  is_current BOOLEAN GENERATED ALWAYS AS (valid_to IS NULL) STORED
);
```

### Associations Table

```sql
CREATE TABLE hubspot_associations (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,  -- 'contact', 'company', 'deal', etc
  source_id UUID NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  association_type VARCHAR(50) NOT NULL,  -- HubSpot association type
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  snapshot_date DATE NOT NULL,
  is_current BOOLEAN GENERATED ALWAYS AS (valid_to IS NULL) STORED
);
```

### Change Tracking Table

```sql
CREATE TABLE hubspot_changes (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  change_type VARCHAR(50) NOT NULL,  -- 'property' or 'association'
  property_name VARCHAR(255),
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL
);
```

### Snapshot Metadata Table

```sql
CREATE TABLE hubspot_snapshots (
  snapshot_date DATE PRIMARY KEY,
  completed_at TIMESTAMPTZ NOT NULL,
  companies_count INTEGER,
  contacts_count INTEGER,
  deals_count INTEGER,
  tickets_count INTEGER,
  notes_count INTEGER, 
  tasks_count INTEGER,
  associations_count INTEGER,
  is_successful BOOLEAN NOT NULL,
  r2_backup_path TEXT  -- Reference to full JSON backup in R2
);
```

## Indexing Strategy

```sql
-- Company indexes
CREATE INDEX idx_companies_current ON hubspot_companies(is_current) WHERE is_current;
CREATE INDEX idx_companies_snapshot ON hubspot_companies(snapshot_date);
CREATE INDEX idx_companies_valid_range ON hubspot_companies USING GIST (tstzrange(valid_from, valid_to));
CREATE INDEX idx_companies_json ON hubspot_companies USING GIN (properties);

-- Contact indexes
CREATE INDEX idx_contacts_current ON hubspot_contacts(is_current) WHERE is_current;
CREATE INDEX idx_contacts_snapshot ON hubspot_contacts(snapshot_date);
CREATE INDEX idx_contacts_valid_range ON hubspot_contacts USING GIST (tstzrange(valid_from, valid_to));
CREATE INDEX idx_contacts_json ON hubspot_contacts USING GIN (properties);

-- Deal indexes
CREATE INDEX idx_deals_current ON hubspot_deals(is_current) WHERE is_current;
CREATE INDEX idx_deals_snapshot ON hubspot_deals(snapshot_date);
CREATE INDEX idx_deals_valid_range ON hubspot_deals USING GIST (tstzrange(valid_from, valid_to));
CREATE INDEX idx_deals_json ON hubspot_deals USING GIN (properties);
CREATE INDEX idx_deals_pipeline_stage ON hubspot_deals((properties->>'pipeline'), (properties->>'dealstage'));
CREATE INDEX idx_deals_close_date ON hubspot_deals((properties->>'closedate'));

-- Similar indexes for tickets, notes, and tasks

-- Association indexes
CREATE INDEX idx_associations_current ON hubspot_associations(is_current) WHERE is_current;
CREATE INDEX idx_associations_source ON hubspot_associations(source_type, source_id);
CREATE INDEX idx_associations_target ON hubspot_associations(target_type, target_id);
CREATE INDEX idx_associations_valid_range ON hubspot_associations USING GIST (tstzrange(valid_from, valid_to));
```

## Usage Examples

### Current State Queries

```sql
-- Get all current companies
SELECT * FROM hubspot_companies WHERE is_current;

-- Get current contacts for a specific company
SELECT c.*
FROM hubspot_contacts c
JOIN hubspot_associations a ON c.id = a.target_id
WHERE a.is_current
  AND c.is_current
  AND a.source_type = 'company'
  AND a.target_type = 'contact'
  AND a.source_id = '5bddccec-12fb-4f5f-927c-84c211059dda';
```

### Point-in-Time Queries

```sql
-- Get companies as they existed on a specific date
SELECT *
FROM hubspot_companies
WHERE valid_from <= '2025-01-15'::timestamptz
  AND (valid_to > '2025-01-15'::timestamptz OR valid_to IS NULL);

-- Get deals closing in the next 90 days (from current date)
SELECT *
FROM hubspot_deals
WHERE is_current
  AND (properties->>'closedate')::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days');
```

### Temporal Change Analysis

```sql
-- Companies that changed industries over time
SELECT 
  id,
  properties->>'name' AS company_name,
  properties->>'industry' AS industry,
  valid_from,
  valid_to
FROM hubspot_companies
WHERE id IN (
  SELECT DISTINCT id
  FROM hubspot_companies
  GROUP BY id
  HAVING COUNT(DISTINCT(properties->>'industry')) > 1
)
ORDER BY id, valid_from;
```

### LLM-Ready Analytical Queries

```sql
-- Example: "How many customers are up for renewal in the next 90 days?"
SELECT 
  COUNT(*) AS renewal_count,
  SUM((properties->>'annualrevenue')::numeric) AS total_revenue
FROM hubspot_companies
WHERE is_current
  AND (properties->>'neuco_effective_date')::date + INTERVAL '1 year' 
    BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days');
  
-- Example: "How many customers are between $15k-$30k with renewal dates in the next 6 months?"
SELECT 
  COUNT(*) AS customer_count,
  SUM((properties->>'annualrevenue')::numeric) AS total_arr
FROM hubspot_companies
WHERE is_current
  AND (properties->>'annualrevenue')::numeric BETWEEN 15000 AND 30000
  AND (properties->>'neuco_effective_date')::date + INTERVAL '1 year'
    BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '6 months');
```

## Implementation Notes

1. **Triggers**: Implement database triggers to maintain temporal validity:
   - On UPDATE, set valid_to on current record and insert new version
   - On DELETE, set valid_to on current record (logical deletion)

2. **Daily Snapshot Process**: 
   - Pull full entity data from HubSpot API
   - Store in PostgreSQL with current timestamp as valid_from
   - Store full JSON in R2/S3 for backup
   - Update snapshot_date metadata

3. **Materialized Views**: Create materialized views for common analytical queries
   - Renewal forecasts
   - Revenue by industry/stage
   - Customer lifecycle status

4. **Query Performance**: Monitor and optimize for large datasets
   - Partition tables by date for organizations with massive data
   - Use JSONB containment operators for efficient filtering
   - Create function indexes for commonly used JSON property extractions