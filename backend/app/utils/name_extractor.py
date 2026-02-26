import re
from app.core.nlp_manager import NLPManager

nlp = NLPManager.get_spacy()

# Common company names and job-related terms to exclude
COMPANY_BLACKLIST = {
    "linkedin", "amazon", "google", "microsoft", "facebook", "meta", "apple",
    "netflix", "uber", "airbnb", "twitter", "tesla", "oracle", "ibm", "intel",
    "cisco", "adobe", "salesforce", "spotify", "github", "gitlab", "slack",
    "zoom", "dropbox", "reddit", "pinterest", "snapchat", "tiktok", "bytedance",
    "resume", "curriculum vitae", "cv", "profile", "contact", "email", "phone",
    "address", "objective", "summary", "experience", "education", "skills",
    "references", "portfolio", "website", "github", "linkedin profile",
    "walmart", "target", "costco", "samsung", "sony", "panasonic", "lg",
    "dell", "hp", "lenovo", "asus", "acer", "nvidia", "amd", "qualcomm"
}

def is_likely_company_or_noise(name: str) -> bool:
    """Check if the extracted name is likely a company or noise."""
    name_lower = name.lower().strip()
    
    # Check against blacklist
    if name_lower in COMPANY_BLACKLIST:
        return True
    
    # Check if any word in the name is in blacklist
    words = name_lower.split()
    if any(word in COMPANY_BLACKLIST for word in words):
        return True
    
    # Check if it contains company indicators
    company_indicators = ["inc", "llc", "ltd", "corp", "corporation", "company", 
                         "technologies", "systems", "solutions", "services", "group",
                         "enterprises", "industries", "international", "global"]
    if any(indicator in name_lower for indicator in company_indicators):
        return True
    
    # Check if it's too long (likely a sentence, not a name)
    if len(name.split()) > 4:
        return True
    
    # Check if it contains URLs or email patterns
    if any(x in name_lower for x in ["http", "www", ".com", ".org", ".net", "@", "github.com", "linkedin.com"]):
        return True
    
    return False

def extract_candidate_name(text: str) -> str:
    """
    Extract candidate name from resume text.
    Returns the first PERSON entity found, typically the candidate's name.
    Filters out company names and common resume noise.
    """
    # Take first 800 characters where name is usually located
    header_text = text[:800]
    
    doc = nlp(header_text)
    
    # Get all PERSON entities, filter out companies
    person_entities = []
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            if not is_likely_company_or_noise(ent.text):
                person_entities.append(ent.text)
    
    if person_entities:
        # Return the first valid person name found
        return person_entities[0]
    
    # Fallback: try to find name pattern at the start
    lines = text.split('\n')
    for line in lines[:8]:  # Check first 8 lines
        line = line.strip()
        
        # Skip lines with common resume headers
        if any(header in line.lower() for header in ["resume", "curriculum", "contact", "email", "phone", "address", "objective", "summary", "profile"]):
            continue
        
        # Name pattern: 2-4 capitalized words, no numbers, no special chars
        if line and not any(char.isdigit() for char in line):
            # Remove common punctuation
            clean_line = re.sub(r'[|•\-_]', ' ', line).strip()
            words = clean_line.split()
            
            if 2 <= len(words) <= 4:
                # Check if all words start with capital and are alphabetic
                if all(w[0].isupper() and w.isalpha() for w in words if w):
                    potential_name = ' '.join(words)
                    if not is_likely_company_or_noise(potential_name):
                        return potential_name
    
    return "Unknown"


def generate_resume_id(candidate_name: str) -> str:
    """
    Generate a readable resume ID from candidate name.
    Format: FirstLast_HASH (e.g., JohnDoe_A3F2)
    """
    import uuid
    
    # Clean the name: remove special characters, keep only letters
    clean_name = re.sub(r'[^a-zA-Z\s]', '', candidate_name)
    
    # Take first and last word
    words = clean_name.split()
    if len(words) >= 2:
        name_part = words[0] + words[-1]
    elif len(words) == 1:
        name_part = words[0]
    else:
        name_part = "Resume"
    
    # Limit to 20 characters
    name_part = name_part[:20]
    
    # Add short hash for uniqueness
    hash_part = uuid.uuid4().hex[:4].upper()
    
    return f"{name_part}_{hash_part}"
