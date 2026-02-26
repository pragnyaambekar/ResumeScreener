import re
from app.core.nlp_manager import NLPManager
nlp = NLPManager.get_spacy()


class SectionBehaviorError(Exception):
    pass


EDU_KEYWORDS = {
    "bachelor", "master", "b.tech", "m.tech", "degree",
    "university", "college", "education"
}


def analyze_behavior(text: str) -> dict:
    doc = nlp(text)

    token_count = len(doc)
    verb_count = sum(1 for t in doc if t.pos_ == "VERB")
    noun_count = sum(1 for t in doc if t.pos_ in ("NOUN", "PROPN"))
    has_year = bool(re.search(r"\b(19|20)\d{2}\b", text.lower()))
    has_edu_keyword = any(k in text.lower() for k in EDU_KEYWORDS)

    verb_density = verb_count / max(token_count, 1)
    noun_density = noun_count / max(token_count, 1)

    if has_edu_keyword or has_year:
        inferred = "education"
    elif verb_density > 0.15:
        inferred = "experience"
    else:
        inferred = "skills"

    return {
        "verb_density": round(verb_density, 2),
        "noun_density": round(noun_density, 2),
        "inferred_section": inferred
    }


def section_behavior_stage(data: dict) -> dict:
    units = data.get("units")
    if not units:
        raise SectionBehaviorError("No units available for section behavior analysis")

    behavior_results = []
    mismatches = 0
    total = 0

    for unit in units:
        if unit["unit_type"] != "sentence":
            continue

        analysis = analyze_behavior(unit["text"])
        behavior_results.append({
            "text": unit["text"],
            "behavior": analysis
        })

        # Fragmented skill lists in experience-like areas
        if analysis["inferred_section"] == "skills" and analysis["verb_density"] < 0.05:
            mismatches += 1

        total += 1

    section_coherence_score = round(
        1 - (mismatches / max(total, 1)),
        2
    )

    data.update({
        "section_behavior_score": section_coherence_score,
        "section_behavior_results": behavior_results
    })

    return data
