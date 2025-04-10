# HubSpot Data Archiving Architecture

This document outlines our strategy for efficiently storing and analyzing HubSpot data at scale, supporting historical analysis across organizations.

## Goals

1. Store complete snapshots of HubSpot entities and their relationships
2. Minimize storage costs while maintaining query performance
3. Support point-in-time analysis across the entire data history
4. Handle HubSpot's flexible schema and custom fields
5. Enable analytical queries across organizations and time periods

## Storage Architecture

### Primary Components

- **R2/S3**: Primary storage for all historical data
  - Organized by organization/date/entity
  - Cost-effective long-term storage (~$0.015/GB vs $0.1-0.2/GB for managed PostgreSQL)

- **Hybrid File Format Approach**:
  - **Parquet files**: For standard fields (consistent across 95%+ of orgs)
  - **JSONL files**: For custom/dynamic fields
  - Best of both worlds: performance and flexibility

- **PostgreSQL**: Minimal metadata tracking only
  - Sync history and status
  - API credentials and configuration
  - No entity data stored in the database

- **DuckDB**: Query engine for data analysis
  - Connects directly to R2/S3 storage
  - Provides SQL interface to data
  - Supports both Parquet and JSON formats

### File Organization

```
r2://hubspot-data/
├── schema_definitions/
│   └── standard-fields.json  # Defines standard fields per entity
├── org_id_1/
│   ├── 2025-04-01/
│   │   ├── companies-standard.parquet
│   │   ├── companies-custom.jsonl.gz
│   │   ├── contacts-standard.parquet
│   │   ├── contacts-custom.jsonl.gz
│   │   └── ...other entities
│   ├── 2025-04-02/...
│   └── metadata/
│       └── sync_history.json
└── org_id_2/...
```

## Standard Fields

We define "standard fields" as properties that:
1. Exist in >95% of records across all organizations
2. Have consistent data types
3. Are commonly used in analytical queries

### Core Standard Fields by Entity Type

```
# Every entity type has these
id, hubspot_id, createdate, updatedate, owner_id

# Companies
name, domain, industry, annualrevenue, numberofemployees,
phone, website, city, state, country

# Contacts 
email, firstname, lastname, jobtitle, phone, 
company, lifecyclestage

# Deals
dealname, amount, pipeline, dealstage, closedate,
dealtype

# Similar standard sets for tickets, notes, tasks
```

These fields are stored in strongly-typed Parquet columns for efficient querying. When an organization doesn't have a particular standard field, it's stored as NULL in the Parquet file.

## Data Processing Flow

### Daily Sync Process

1. **HubSpot API Pull**:
   - Fetch all entities for each organization
   - Compare with previous day's data
   - Store full daily snapshot in R2

2. **File Generation**:
   - Split data into standard and custom fields
   - Write Parquet file for standard fields
   - Write JSONL file for custom fields
   - Update metadata records

3. **Metadata Tracking**:
   - Record sync status and timestamps
   - Track entity counts and file paths
   - Store information needed to locate the right files

### PostgreSQL Schema (Minimal)

```sql
-- Simple metadata tracking
CREATE TABLE hubspot_sync_metadata (
  org_id VARCHAR(50) NOT NULL,
  sync_date DATE NOT NULL,
  entity_counts JSONB,  -- {"companies": 1000, "contacts": 5000, ...}
  r2_paths JSONB,  -- {"companies_standard": "path/to/file.parquet", ...}
  sync_status VARCHAR(20) NOT NULL,  -- 'success', 'partial', 'failed'
  completed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(org_id, sync_date)
);

CREATE TABLE hubspot_api_credentials (
  org_id VARCHAR(50) PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[]
);
```

## Query Patterns

### Setting Up DuckDB

```typescript
// Initialize DuckDB with R2 connection
const db = new DuckDB();

// Configure DuckDB to access R2
await db.exec(`
  INSTALL httpfs;
  LOAD httpfs;
  SET s3_region='auto';
  SET s3_endpoint='${R2_ENDPOINT}';
  SET s3_access_key_id='${R2_ACCESS_KEY}';
  SET s3_secret_access_key='${R2_SECRET_KEY}';
`);
```

### Creating Unified Views

```sql
-- Create a view that joins standard and custom fields
CREATE VIEW companies AS
SELECT
  s.*,  -- All standard fields
  c.custom_properties  -- All custom fields as JSON
FROM read_parquet('s3://hubspot-data/org123/2025-04-01/companies-standard.parquet') s
JOIN read_json('s3://hubspot-data/org123/2025-04-01/companies-custom.jsonl.gz') c
  ON s.id = c.id;
```

### Example Business Queries

```sql
-- How many customers are up for renewal in the next 90 days?
SELECT 
  COUNT(*) AS renewal_count,
  SUM(annualrevenue) AS total_revenue
FROM companies
WHERE custom_properties->>'neuco_effective_date'::date + INTERVAL '1 year' 
  BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days');

-- How many customers between $15k-$30k with renewal in next 6 months?
SELECT 
  COUNT(*) AS customer_count,
  SUM(annualrevenue) AS total_arr
FROM companies
WHERE annualrevenue BETWEEN 15000 AND 30000
  AND custom_properties->>'neuco_effective_date'::date + INTERVAL '1 year'
    BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '6 months');

-- Average employee count of customers who closed won in the last year
SELECT 
  AVG(c.numberofemployees) AS avg_employee_count
FROM companies c
JOIN deals d ON d.associations->>'companies' ? c.id
WHERE d.dealstage = 'closedwon'
  AND d.closedate >= CURRENT_DATE - INTERVAL '1 year';

-- How many customers do not have an assigned CSM?
SELECT COUNT(*)
FROM companies
WHERE owner_id IS NULL OR owner_id = '';
```

### Historical Analysis

```sql
-- Compare company counts by industry over time
WITH monthly_companies AS (
  SELECT 
    SUBSTR(path, 19, 7) AS month, -- Extract YYYY-MM from path
    j.*
  FROM glob_read_parquet(
    's3://hubspot-data/org123/*/companies-standard.parquet', 
    HIVE_PARTITIONING=1
  ) AS j
)
SELECT 
  month,
  industry,
  COUNT(*) AS company_count
FROM monthly_companies
GROUP BY month, industry
ORDER BY month, industry;
```

## Benefits of This Approach

1. **Cost Efficiency**: 
   - 10-20x lower storage costs vs. PostgreSQL
   - Minimal compute resources for queries
   - Pay only for storage and query processing

2. **Query Flexibility**:
   - Parquet performance for common analytics
   - JSONL flexibility for custom fields
   - Full SQL capabilities through DuckDB

3. **Schema Resilience**:
   - Handles custom fields without schema migrations
   - Works even when fields vary across organizations
   - Adapts to HubSpot's evolving data model

4. **Scalability**:
   - Handles organizations of any size
   - Parallel processing of data
   - Efficient columnar storage for analytics

5. **Time-Travel Capabilities**:
   - Historical analysis across any time period
   - Compare entity states across dates
   - Track changes over time

## Implementation Considerations

1. **Initial Setup**:
   - Define standard fields based on analysis of actual HubSpot data
   - Create file generation pipeline
   - Configure DuckDB with appropriate settings

2. **Performance Optimization**:
   - Use Parquet's predicate pushdown for filtering
   - Create materialized results for common queries
   - Consider partitioning by date and organization

3. **Operational Monitoring**:
   - Track sync completion status
   - Monitor storage usage
   - Alert on sync failures

4. **Security**:
   - R2/S3 bucket policies to restrict access
   - Encryption of data at rest
   - Proper credential management

This architecture combines the best of both structured and semi-structured data approaches, optimized for HubSpot's unique combination of standard fields and extensive customization.