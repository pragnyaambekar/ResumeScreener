import re
from datetime import datetime

class ConsistencyError(Exception):
    pass


YEAR_PATTERN = r"\b(19|20)\d{2}\b"
EXPERIENCE_PATTERN = r"(\d+(\.\d+)?)\s*(\+)?\s*years?"


def extract_years(text: str):
    return [int(y) for y in re.findall(YEAR_PATTERN, text)]


def extract_experience_years(text: str):
    matches = re.findall(EXPERIENCE_PATTERN, text.lower())
    return [float(m[0]) for m in matches]


def consistency_stage(data: dict) -> dict:
    units = data.get("units")
    if not units:
        raise ConsistencyError("No units available for consistency checks")

    education_years = []
    experience_years_claimed = []

    for unit in units:
        text = unit["text"].lower()

        # Education timeline
        if any(k in text for k in ["b.tech", "bachelor", "degree", "university"]):
            education_years.extend(extract_years(text))

        # Experience claims
        experience_years_claimed.extend(extract_experience_years(text))

    current_year = datetime.now().year

    issues = []

    # ---------- Education year sanity ----------
    for y in education_years:
        if y > current_year:
            issues.append(f"Future education year detected: {y}")

    # ---------- Experience sanity ----------
    for exp in experience_years_claimed:
        if exp > 40:
            issues.append(f"Unrealistic experience claim: {exp} years")

    # ---------- Education vs experience ----------
    if education_years and experience_years_claimed:
        min_edu_year = min(education_years)
        max_exp = max(experience_years_claimed)

        # Simple heuristic: experience cannot exceed time since graduation
        if current_year - min_edu_year < max_exp:
            issues.append(
                "Experience duration exceeds time since graduation"
            )

    timeline_risk_score = round(
        1 - (len(issues) * 0.25),
        2
    )
    timeline_risk_score = max(timeline_risk_score, 0.0)

    data.update({
        "timeline_risk_score": timeline_risk_score,
        "consistency_issues": issues
    })

    return data
