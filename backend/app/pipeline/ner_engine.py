import re
from app.core.nlp_manager import NLPManager
nlp = NLPManager.get_spacy()


class NERError(Exception):
    pass


EMAIL_PATTERN = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
PHONE_PATTERN = r"(\+?\d{1,3}[\s-]?)?\d{10}"
EXPERIENCE_PATTERN = r"(\d+(\.\d+)?)\s*(\+)?\s*years?"


def extract_experience_years(texts):
    years = []
    for text in texts:
        matches = re.findall(EXPERIENCE_PATTERN, text.lower())
        for m in matches:
            years.append(float(m[0]))
    
    if years:
        return max(years)
    
    # fallback: count date ranges like "2023 - 2025"
    full_text = " ".join(texts)
    year_matches = re.findall(r'\b(20\d{2})\b', full_text)
    if year_matches:
        years_found = [int(y) for y in year_matches]
        estimated = max(years_found) - min(years_found)
        return float(max(estimated, 1))
    
    return 0.0


def ner_stage(data: dict) -> dict:
    units = data.get("units")
    if not units:
        raise NERError("No units available for NER")

    full_text = " ".join(u["text"] for u in units)

    # ---------- Regex-based ----------
    emails = re.findall(EMAIL_PATTERN, full_text)
    phones = re.findall(PHONE_PATTERN, full_text)

    # ---------- spaCy NER ----------
    doc = nlp(full_text)

    names = []
    organizations = []
    dates = []

    for ent in doc.ents:
        if ent.label_ == "PERSON":
            names.append(ent.text)
        elif ent.label_ == "ORG":
            organizations.append(ent.text)
        elif ent.label_ == "DATE":
            dates.append(ent.text)

    # ---------- Experience ----------
    experience_years = extract_experience_years(
        [u["text"] for u in units]
    )
    data.update({
        "entities": {
            "names": list(set(names)),
            "emails": list(set(emails)),
            "phones": list(set(phones)),
            "organizations": list(set(organizations)),
            "dates": list(set(dates))
        },
        "experience_years": experience_years
    })

    return data
