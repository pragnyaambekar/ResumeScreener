# Database Migration Instructions

## Add Candidate Name Column

Run this SQL command in your MySQL database:

```sql
ALTER TABLE resumes ADD COLUMN candidate_name VARCHAR(200) NULL AFTER resume_id;
```

This adds a new column to store the candidate's name extracted from their resume.

## Verify Migration

```sql
DESCRIBE resumes;
```

You should see the `candidate_name` column in the table structure.
