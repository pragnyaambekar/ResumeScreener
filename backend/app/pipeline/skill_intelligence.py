from app.core.nlp_manager import NLPManager

nlp = NLPManager.get_spacy()

class SkillIntelligenceError(Exception):
    pass

ACTION_VERBS = {
    "develop", "build", "implement", "design",
    "train", "deploy", "optimize", "analyze", "create",
    "manage", "lead", "engineer", "architect"
}

def skill_intelligence_stage(data: dict) -> dict:
    units = data.get("units")
    if not units:
        raise SkillIntelligenceError("No units available for skill intelligence")

    # get skills from JD — dynamic now, no hardcoded list
    jd_data = data.get("jd_data", {})
    all_jd_skills = list(set(
        jd_data.get("mandatory_skills", []) +
        jd_data.get("optional_skills", [])
    ))

    skill_stats = {}

    for unit in units:
        text = unit["text"].lower()
        doc = nlp(text)
        verbs = {t.lemma_ for t in doc if t.pos_ == "VERB"}

        for skill in all_jd_skills:
            if skill in text:
                if skill not in skill_stats:
                    skill_stats[skill] = {
                        "frequency": 0,
                        "action_usage": 0,
                    }
                skill_stats[skill]["frequency"] += 1

                if verbs.intersection(ACTION_VERBS):
                    skill_stats[skill]["action_usage"] += 1

    # confidence scoring
    skill_confidence = {}
    for skill, stats in skill_stats.items():
        confidence = (
            0.5 * min(stats["frequency"] / 3, 1.0) +
            0.5 * min(stats["action_usage"] / 2, 1.0)
        )
        skill_confidence[skill] = round(confidence, 2)

    print(f"[Skill] Matched skills: {list(skill_confidence.keys())}")

    data.update({
        "skill_confidence": skill_confidence
    })
    return data