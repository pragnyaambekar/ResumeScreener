import re
from app.core.nlp_manager import NLPManager

model = NLPManager.get_sentence_transformer()
nlp = NLPManager.get_spacy()

class JDIntelligenceError(Exception):
    pass

EDU_KEYWORDS = {
    "b.tech", "bachelor", "degree", "computer science", 
    "engineering", "master", "phd", "diploma"
}
NOISE_WORDS = {
    "ex", "co", "experience", "ability", "skills", "team", "environment",
    "ownership", "issues", "tasks", "projects", "improvements", "reporting",
    "efficiency", "reliability", "performance", "development", "processing",
    "process", "services", "systems", "features", "design", "models",
    "environments", "code", "science", "compute", "assist", "transform",
    "develop", "engineer", "engineering", "workflows", "pipelines", "-",
    "a plus", "proficiency", "data", "engine","plus", "role", "field", "monitor", 
    "this role", "a related field","comfort", "technologies", "responsibilities", "members", 
    "requirements", "trends", "details", "stakeholders", "analysts",
    "scientists", "engineers", "basics", "tools", "platforms",
    # Generic job posting words
    "hours", "distance", "workplace", "support", "accommodation", "application",
    "interview", "hiring", "onboarding", "commutable", "you", "your", "our", "we", 
    "they", "their", "this", "that", "these", "those", "work", "job", "position", 
    "candidate", "applicant", "employee", "employer", "company", "organization", 
    "business", "industry", "sector", "market", "time", "day", "week", "month", 
    "year", "schedule", "shift", "flexible", "full", "part", "remote", "hybrid", 
    "office", "location", "site", "facility", "benefits", "salary", "compensation", 
    "pay", "wage", "bonus", "equity", "health", "insurance", "dental", "vision", 
    "retirement", "vacation", "pto", "culture", "values", "mission", "vision", 
    "goals", "objectives", "opportunity", "opportunities", "career", "growth", 
    "advancement", "https", "http", "www", "com", "org", "net", "jobs", "content",
    "hire", "accommodations", "eap", "connections", "peers", "jr", "program",
    "intern", "internship", "entry", "junior", "senior", "lead", "manager",
    "director", "vp", "ceo", "cto", "cfo", "president", "founder",
    "usa", "us", "america", "states", "country", "nation", "city", "state",
    "person", "people", "individual", "individuals", "someone", "anyone",
    "everyone", "everything", "something", "anything", "nothing", "thing", "things",
    "way", "ways", "manner", "method", "approach", "strategy", "plan", "planning",
    "level", "levels", "type", "types", "kind", "kinds", "sort", "sorts",
    "area", "areas", "aspect", "aspects", "part", "parts", "section", "sections",
    "place", "places", "space", "spaces", "room", "rooms", "building", "buildings",
    # Additional generic terms that appeared in logs
    "software", "hardware", "computer", "language", "stem", "results", "mental",
    "round", "line", "corporate", "amazon", "an amazon", "an amazon corporate site"
}

def is_likely_skill(text: str) -> bool:
    """
    Determine if a phrase is likely a real skill/technology.
    Uses strict heuristics to avoid generic words.
    """
    text_lower = text.lower().strip()
    
    # Skip if in noise words
    if text_lower in NOISE_WORDS:
        return False
    
    # Skip very common English words and generic terms
    common_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
        "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
        "will", "would", "should", "could", "may", "might", "must", "can", "shall",
        "work", "time", "good", "great", "best", "new", "old", "big", "small", "high", "low",
        "fast", "slow", "easy", "hard", "long", "short", "strong", "weak", "right", "wrong",
        "basic", "advanced", "simple", "complex", "general", "specific", "main", "key",
        "important", "necessary", "required", "preferred", "ideal", "perfect", "excellent",
        "line", "round", "site", "mental", "results", "stem", "language", "computer",
        "software", "hardware", "engineering", "engineer", "science", "technology",
        "technical", "system", "systems", "application", "applications", "solution", "solutions"
    }
    if text_lower in common_words:
        return False
    
    # Skip if it's a URL or email
    if any(x in text_lower for x in ["http", "www", ".com", ".org", "@", "jobs/", "amazon.jobs"]):
        return False
    
    # Skip if it's just a number or very short
    if len(text_lower) <= 2 or text_lower.isdigit():
        return False
    
    # Skip if it's a city/location
    common_cities = {
        "seattle", "bellevue", "redmond", "portland", "san francisco", "new york", 
        "boston", "austin", "chicago", "denver", "atlanta", "los angeles", "miami",
        "dallas", "houston", "phoenix", "philadelphia", "san diego", "san jose"
    }
    if text_lower in common_cities:
        return False
    
    # Skip generic job-related terms
    job_terms = {
        "intern", "internship", "college", "university", "student", "graduate",
        "june", "july", "august", "september", "october", "november", "december",
        "january", "february", "march", "april", "may", "monday", "tuesday",
        "wednesday", "thursday", "friday", "saturday", "sunday", "usa", "us",
        "opportunities", "opportunity", "onboarding", "master", "bachelor", "degree"
    }
    if text_lower in job_terms:
        return False
    
    # STRONG ACCEPT: Known technical terms (expanded list)
    strong_tech_terms = {
        # Programming Languages
        "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go", "rust", 
        "swift", "kotlin", "scala", "r", "matlab", "perl", "php", "vhdl", "verilog",
        # Frameworks & Libraries
        "react", "angular", "vue", "django", "flask", "spring", "spring boot", "express", 
        "node.js", "nodejs", "node", "tensorflow", "pytorch", "keras", "scikit-learn", 
        "pandas", "numpy", "scipy",
        # Databases
        "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "oracle", "cassandra", 
        "dynamodb", "mariadb", "elasticsearch", "elastic",
        # Cloud & DevOps
        "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "jenkins", "terraform", "ansible",
        # Engineering Tools
        "autocad", "solidworks", "catia", "ansys", "matlab", "simulink", "labview",
        "spice", "cadence", "altium", "eagle", "kicad", "ltspice", "pspice",
        "revit", "sketchup", "rhino", "inventor", "creo", "nx", "pro/engineer",
        # Methodologies
        "agile", "scrum", "kanban", "lean", "six sigma", "waterfall", "devops",
        # Certifications
        "pmp", "cissp", "aws certified", "azure certified", "comptia", "ccna", "ccnp",
        # CAD/CAE/CAM
        "cad", "cae", "cam", "cfd", "fea", "fem", "plm", "pdm",
        # Protocols & Standards
        "tcp/ip", "rest", "restful", "graphql", "soap", "mqtt", "i2c", "spi", "uart", "modbus",
        "oauth", "oauth2", "jwt", "saml",
        # Specialized
        "pcb", "fpga", "asic", "vlsi", "embedded", "rtos", "microcontroller",
        "plc", "scada", "hmi", "cnc", "robotics", "automation", "opencv", "ros",
        # Version Control & Tools
        "git", "github", "gitlab", "bitbucket", "svn", "mercurial", "jira", "confluence",
        # Testing
        "junit", "pytest", "selenium", "cypress", "jest", "mocha", "chai",
        # Build Tools
        "maven", "gradle", "webpack", "npm", "yarn", "pip", "cmake", "make",
        # Architecture & Patterns
        "microservices", "microservice", "api", "apis", "distributed systems",
        "caching", "multithreading", "concurrency"
    }
    if text_lower in strong_tech_terms:
        return True
    
    # ACCEPT: Multi-word technical terms with specific patterns
    words = text_lower.split()
    if 2 <= len(words) <= 4:
        tech_patterns = [
            "object-oriented", "object oriented", "data structure", "data structures",
            "machine learning", "deep learning", "computer vision", "natural language processing",
            "finite element", "computational fluid", "power system", "control system",
            "signal processing", "image processing", "digital signal", "analog circuit",
            "digital circuit", "embedded system", "real-time", "real time",
            "distributed system", "distributed systems", "version control", 
            "continuous integration", "continuous deployment", "test driven", 
            "behavior driven", "domain driven", "computer science", "software engineering",
            "electrical engineering", "mechanical engineering", "civil engineering", 
            "data science", "artificial intelligence", "neural network", 
            "convolutional neural", "recurrent neural", "reinforcement learning",
            "supervised learning", "unsupervised learning", "web development", 
            "mobile development", "full stack", "front end", "back end", "backend",
            "cloud computing", "system design", "design pattern", "design patterns",
            "restful api", "rest api", "solid principles", "fault tolerance",
            "performance optimization", "root cause", "spring boot", "node js"
        ]
        if any(pattern in text_lower for pattern in tech_patterns):
            return True
    
    # ACCEPT: Contains strong technical indicators (but must be specific)
    strong_indicators = [
        "programming", "framework", "library", "protocol", "algorithm",
        "api", "sdk", "ide", "simulation", "modeling", "circuit",
        "certified", "certification", "-oriented design", "-based design",
        "-driven development", "element analysis"
    ]
    if any(indicator in text_lower for indicator in strong_indicators):
        # Must be a compound term (2-4 words) to avoid generic matches
        if 2 <= len(words) <= 4:
            return True
    
    # ACCEPT: Proper noun technical tools (capitalized, not in common words)
    if 1 <= len(words) <= 3:
        # Check if it starts with capital and is not a common word
        if any(word[0].isupper() for word in words if len(word) > 0):
            if text_lower not in common_words and text_lower not in job_terms and text_lower not in common_cities:
                # Additional check: must contain at least one technical indicator or be short and specific
                tech_indicators = ["lab", "cad", "sim", "pro", "max", "studio", "works", "view", "ware", "soft"]
                if any(ind in text_lower for ind in tech_indicators) or len(text_lower) <= 8:
                    return True
    
    # REJECT: Everything else
    return False
EXPERIENCE_PATTERN = r"(\d+)\s*[-to]+\s*(\d+)\s*years"

MANDATORY_WORDS = {"must", "required", "mandatory", "essential", "need", "requires", "require"}
OPTIONAL_WORDS = {"preferred", "plus", "bonus", "nice to have", "optional", "ideal", "stand out"}

# Section headers that indicate mandatory vs optional
MANDATORY_SECTIONS = {"basic qualifications", "required qualifications", "requirements", 
                      "minimum qualifications", "must have", "required skills"}
OPTIONAL_SECTIONS = {"preferred qualifications", "nice to have", "bonus", "preferred skills",
                     "what makes you stand out", "ideal candidate", "plus"}

def extract_skills_from_jd(text: str) -> list:
    doc = nlp(text)
    skills = set()

    # Extract noun chunks (multi-word technical terms)
    for chunk in doc.noun_chunks:
        clean = chunk.text.lower().strip()
        # Check if it's likely a skill
        if is_likely_skill(clean):
            skills.add(clean)

    # Extract single tokens that might be skills
    for token in doc:
        if not token.is_stop and token.pos_ in ("NOUN", "PROPN"):
            token_text = token.text.strip()
            if is_likely_skill(token_text):
                skills.add(token_text.lower())
    
    return list(skills)

def classify_skills_by_section(jd_text: str, all_skills: list) -> tuple:
    """Classify skills based on section headers and context"""
    text_lower = jd_text.lower()
    lines = jd_text.split('\n')
    
    mandatory_skills = []
    optional_skills = []
    
    # Track which section we're in
    current_section = "unknown"
    
    for i, line in enumerate(lines):
        line_lower = line.lower().strip()
        
        # Check if this line is a section header
        if any(header in line_lower for header in MANDATORY_SECTIONS):
            current_section = "mandatory"
            continue
        elif any(header in line_lower for header in OPTIONAL_SECTIONS):
            current_section = "optional"
            continue
        
        # Check if any skills appear in this line
        for skill in all_skills:
            if skill in line_lower:
                if current_section == "mandatory":
                    if skill not in mandatory_skills:
                        mandatory_skills.append(skill)
                elif current_section == "optional":
                    if skill not in optional_skills:
                        optional_skills.append(skill)
                else:
                    # Check for mandatory/optional keywords in the line
                    if any(word in line_lower for word in MANDATORY_WORDS):
                        if skill not in mandatory_skills:
                            mandatory_skills.append(skill)
                    elif any(word in line_lower for word in OPTIONAL_WORDS):
                        if skill not in optional_skills:
                            optional_skills.append(skill)
    
    # If a skill wasn't classified, default to optional
    for skill in all_skills:
        if skill not in mandatory_skills and skill not in optional_skills:
            optional_skills.append(skill)
    
    return mandatory_skills, optional_skills

def jd_stage(jd_text: str = None) -> dict:
    if not jd_text:
        raise JDIntelligenceError("Job description text not provided")

    text = jd_text.lower()
    doc = nlp(jd_text)

    # extract all skills dynamically from JD
    all_skills = extract_skills_from_jd(jd_text)

    # classify skills based on sections
    mandatory_skills, optional_skills = classify_skills_by_section(jd_text, all_skills)

    # experience range
    exp_range = None
    match = re.search(EXPERIENCE_PATTERN, text)
    if match:
        exp_range = {
            "min": int(match.group(1)),
            "max": int(match.group(2))
        }

    # education
    education_required = any(k in text for k in EDU_KEYWORDS)

    # embedding
    jd_embedding = model.encode(jd_text)

    print(f"[JD] Mandatory skills: {mandatory_skills[:5]}")
    print(f"[JD] Optional skills: {optional_skills[:5]}")

    return {
        "mandatory_skills": list(set(mandatory_skills)),
        "optional_skills": list(set(optional_skills)),
        "experience_range": exp_range,
        "education_required": education_required,
        "jd_embedding": jd_embedding
    }