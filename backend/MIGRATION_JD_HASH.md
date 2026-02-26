# Database Migration: Add JD Hash Column

This migration adds JD tracking to prevent comparing resumes from different job descriptions.

## Run this SQL command:

```sql
ALTER TABLE resumes ADD COLUMN jd_hash VARCHAR(64) NULL AFTER candidate_name;
```

## What this does:

- Adds `jd_hash` column to store a hash of the job description
- Resumes analyzed with the same JD will have the same hash
- Enables comparison only between resumes from the same JD batch
- Makes ranking and comparison more meaningful

## Verify:

```sql
DESCRIBE resumes;
```

You should see `jd_hash` column in the table.

## Note:

Existing resumes will have `NULL` for jd_hash. They can still be viewed but won't be comparable with new resumes.
