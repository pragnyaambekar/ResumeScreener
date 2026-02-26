class QualityGateError(Exception):
    pass


# -------- Thresholds (tunable, justified) --------
MIN_GRAMMAR_SCORE = 0.20   
MIN_SEMANTIC_ROLE_SCORE = 0.50
MIN_OVERALL_QUALITY_SCORE = 0.45
MAX_FRAGMENT_RATIO = 0.60


def quality_gate_stage(data: dict):
    try:
        grammar = data.get("grammar_score", 0)
        semantic = data.get("semantic_role_score", 0)
        section = data.get("section_behavior_score", 0)
        discourse = data.get("discourse_score", 0)
        timeline = data.get("timeline_risk_score", 0)
        fragment_ratio = data.get("fragment_ratio", 0)

        # ---------- Fragment penalty ----------
        fragment_penalty = 0.0
        if fragment_ratio > MAX_FRAGMENT_RATIO:
            fragment_penalty = (fragment_ratio - MAX_FRAGMENT_RATIO)

        # ---------- Weighted score ----------
        quality_score = (
            0.25 * grammar +
            0.25 * semantic +
            0.20 * section +
            0.20 * discourse +
            0.10 * timeline -
            fragment_penalty
        )
        print(f"[QG] grammar={grammar} semantic={semantic} section={section} discourse={discourse} timeline={timeline} fragment={fragment_ratio}")
        quality_score = round(max(quality_score, 0.0), 2)

        # ---------- HARD RULES ----------
        is_valid = True

        if grammar < MIN_GRAMMAR_SCORE:
            is_valid = False

        if semantic < MIN_SEMANTIC_ROLE_SCORE:
            is_valid = False

        if quality_score < MIN_OVERALL_QUALITY_SCORE:
            is_valid = False

        return is_valid, quality_score

    except Exception as e:
        raise QualityGateError(str(e))
