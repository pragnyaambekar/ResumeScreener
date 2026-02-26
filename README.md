# AI Resume Screening System

A resume screening system built with NLP and machine learning to analyze and rank resumes against job descriptions. This project demonstrates full-stack development with natural language processing for automated candidate evaluation.

## Overview

This system processes resumes through a multi-stage NLP pipeline, comparing them against job requirements and providing detailed scoring with explanations. The interface includes real-time processing updates and comprehensive analytics.

## Core Features

- Automated resume analysis with PDF/DOCX support
- Job description matching with skill extraction
- Multi-dimensional scoring (skills, experience, education, semantic similarity)
- Real-time background processing with status updates
- Automatic categorization (Shortlisted/Review/Rejected)
- Detailed explanations for each decision
- Candidate ranking system
- Skill gap analysis with recommendations

## Additional Capabilities

- Candidate name extraction from resumes
- Human-readable resume IDs (e.g., "JohnDoe_A3F2")
- Dark/light theme toggle
- Side-by-side resume comparison (2-3 resumes)
- Filter and sort by status or score
- CSV export with complete data
- PDF report generation
- Batch delete operations
- Job description history (last 10 saved)
- Resume text preview
- Processing queue with progress tracking
- Statistics dashboard
- OCR support for image-based PDFs

## Technology Stack

**Backend:**
- FastAPI - Python web framework
- spaCy - NLP processing
- Sentence Transformers - Semantic similarity
- SQLAlchemy - Database ORM
- MySQL - Data storage
- pdfplumber - PDF text extraction

**Frontend:**
- React 18
- Vite
- Axios
- jsPDF

## Requirements

- Python 3.12 or higher
- Node.js 18 or higher
- MySQL 8.0 or higher
- 4GB RAM (for NLP models)
- 2GB disk space

## Installation

### Database Setup

Create database and user:

```sql
CREATE DATABASE resume_screener;
CREATE USER 'resume_user'@'localhost' IDENTIFIED BY 'resume_ai';
GRANT ALL PRIVILEGES ON resume_screener.* TO 'resume_user'@'localhost';
FLUSH PRIVILEGES;
```

If upgrading from previous version:

```sql
USE resume_screener;
ALTER TABLE resumes ADD COLUMN candidate_name VARCHAR(200) NULL AFTER resume_id;
ALTER TABLE resumes ADD COLUMN jd_hash VARCHAR(64) NULL AFTER candidate_name;
```

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Download NLP model
python -m spacy download en_core_web_sm

# Configure environment
cp .env.example .env
# Edit .env with your database credentials
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Optional: OCR Support

For image-based PDFs:

```bash
# Install Python libraries
pip install pdf2image pytesseract pillow

# Install Tesseract OCR
brew install tesseract poppler  # macOS
# sudo apt-get install tesseract-ocr poppler-utils  # Linux
```

## Running the Application

Start backend:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Start frontend:
```bash
cd frontend
npm run dev
```

Access at: http://localhost:5173

## Usage

1. Enter job description in left panel
2. Upload resume files (PDF/DOCX, max 10MB)
3. Click "ANALYZE" to start processing
4. View results in middle panel with rankings
5. Click resume for detailed analysis
6. Use comparison mode to evaluate multiple candidates
7. Export results to CSV or generate PDF reports

## Processing Pipeline

The system analyzes resumes through 14 stages:

1. Text extraction from documents
2. Document structure analysis
3. Semantic segmentation
4. Grammar quality check
5. Semantic role labeling
6. Discourse coherence analysis
7. Section validation
8. Timeline consistency check
9. Quality gate filtering
10. Named entity recognition
11. Skill matching with job description
12. Job requirement parsing
13. Weighted score calculation
14. Explanation generation

## Scoring System

Scores range from 0-100 based on:
- Skill match (40%)
- Experience alignment (30%)
- Education requirements (15%)
- Semantic similarity (15%)

Decision thresholds:
- 60-100: Shortlisted
- 40-59: Review
- 0-39: Rejected

Quality gate filters resumes below minimum standards before scoring.

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── core/          # NLP model management
│   │   ├── models/        # Database models
│   │   ├── pipeline/      # Processing stages
│   │   ├── routers/       # API endpoints
│   │   ├── workers/       # Background tasks
│   │   └── utils/         # Helper functions
│   ├── uploads/           # Resume storage
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── api/          # API client
│   │   └── pages/        # Application pages
│   └── package.json
└── README.md
```

## API Endpoints

**Resume Processing:**
- POST /api/analyze - Upload and analyze resumes
- GET /api/resumes - List all resumes
- GET /api/resumes/status/{id} - Get processing status
- GET /api/resumes/results/{id} - Get detailed results
- GET /api/resumes/file/{id} - View resume PDF
- DELETE /api/resumes/{id} - Delete resume
- DELETE /api/resumes - Delete all resumes

**Job Description:**
- POST /api/jd/set - Set job description
- GET /api/jd/get - Get current job description

## Database Schema

**resumes table:**
- resume_id (PK)
- candidate_name
- jd_hash
- status
- upload_time
- quality_score
- final_score
- decision
- error_message
- extracted_text
- skill_data
- file_path

**engine_scores table:**
- id (PK)
- resume_id (FK)
- engine
- score

**explanations table:**
- id (PK)
- resume_id (FK)
- message

## Troubleshooting

**Missing database columns:**
```sql
ALTER TABLE resumes ADD COLUMN error_message TEXT NULL;
ALTER TABLE resumes ADD COLUMN extracted_text TEXT NULL;
ALTER TABLE resumes ADD COLUMN skill_data JSON NULL;
ALTER TABLE resumes ADD COLUMN file_path VARCHAR(500) NULL;
ALTER TABLE resumes ADD COLUMN candidate_name VARCHAR(200) NULL;
ALTER TABLE resumes ADD COLUMN jd_hash VARCHAR(64) NULL;
```

**Backend won't start:**
- Verify MySQL is running
- Check database credentials in .env
- Ensure virtual environment is activated
- Reinstall dependencies if needed

**spaCy model error:**
```bash
python -m spacy download en_core_web_sm
```

**Frontend connection issues:**
- Confirm backend is running on port 8000
- Check CORS settings in backend/app/main.py
- Clear browser cache and reload

**OCR not working:**
- Install required libraries: `pip install pdf2image pytesseract pillow`
- Install Tesseract: `brew install tesseract poppler`
- Verify installation: `tesseract --version`

## Development Notes

- Files are stored in uploads/ directory
- Database credentials use environment variables
- Frontend polls backend every 2 seconds for updates
- Maximum processing time: 5 minutes per resume
- Comparison limited to resumes from same job description

## Key Implementation Details

**Skill Extraction:**
- Uses spaCy NER and noun chunk extraction
- Filters generic terms and company names
- Classifies skills as mandatory or optional based on JD sections
- Works across different engineering disciplines

**Scoring Algorithm:**
- Weighted combination of multiple factors
- Includes quality gate to filter low-quality resumes
- Adjusts for timeline inconsistencies
- Provides detailed breakdown by component

**Ranking System:**
- Ranks all processed resumes by score
- Color-codes top 20% and top 50%
- Updates dynamically as new resumes are processed
- Enables comparison within same JD batch

**Skill Gap Analysis:**
- Calculates coverage percentage
- Highlights critical missing skills
- Provides actionable recommendations
- Focuses on what candidates need to develop

## Future Enhancements

Potential additions:
- Email notifications for candidates
- Multi-user support with roles
- Interview scheduling integration
- Custom scoring weight adjustment
- Resume anonymization for bias reduction
- GitHub profile analysis
- ATS system integration
- Video resume support
- Multi-language support

## License

Academic project for educational purposes.

