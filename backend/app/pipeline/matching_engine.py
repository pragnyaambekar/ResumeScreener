import numpy as np
from sentence_transformers import util

from app.core.nlp_manager import NLPManager
model = NLPManager.get_sentence_transformer()


class MatchingEngineError(Exception):
    pass

def score_skills(skill_confidence: dict, jd_data: dict) -> float:
    mandatory = jd_data.get("mandatory_skills", [])
    optional = jd_data.get("optional_skills", [])[:10]

    if not mandatory and not optional:
        return 0.7  # Neutral score if no skills specified

    print(f"[SKILL SCORING] Mandatory: {mandatory}")
    print(f"[SKILL SCORING] Confidence dict: {skill_confidence}")

    mandatory_score = 0.0
    if mandatory:
        matched_count = 0
        total_confidence = 0.0
        
        for skill in mandatory:
            confidence = skill_confidence.get(skill, 0)
            
            # If skill is found in resume (confidence > 0), give it high credit
            if confidence > 0:
                matched_count += 1
                # Boost low confidence values - if it's mentioned at all, it's likely a match
                boosted_confidence = min(confidence * 2.0, 1.0)
                total_confidence += boosted_confidence
            else:
                # Check for partial matches (e.g., "node" for "node.js")
                for resume_skill in skill_confidence.keys():
                    if skill in resume_skill or resume_skill in skill:
                        matched_count += 1
                        total_confidence += min(skill_confidence[resume_skill] * 1.5, 1.0)
                        break
        
        # Calculate base score
        mandatory_score = total_confidence / len(mandatory) if len(mandatory) > 0 else 0
        
        # Boost if matched at least 50% of mandatory skills
        match_ratio = matched_count / len(mandatory)
        print(f"[SKILL SCORING] Matched {matched_count}/{len(mandatory)} mandatory skills ({match_ratio:.1%})")
        
        if match_ratio >= 0.8:
            mandatory_score = min(mandatory_score * 1.3, 1.0)
        elif match_ratio >= 0.6:
            mandatory_score = min(mandatory_score * 1.2, 1.0)
        elif match_ratio >= 0.4:
            mandatory_score = min(mandatory_score * 1.1, 1.0)

    optional_score = 0.0
    if optional:
        for skill in optional:
            confidence = skill_confidence.get(skill, 0)
            if confidence > 0:
                optional_score += min(confidence * 1.5, 1.0)
        optional_score = optional_score / max(len(optional), 1)

    # Mandatory matters more but don't penalize too much for missing optional
    if mandatory:
        final_score = min((0.75 * mandatory_score) + (0.25 * optional_score), 1.0)
    else:
        final_score = min(optional_score, 1.0)
    
    print(f"[SKILL SCORING] Final skill score: {final_score:.3f}")
    return final_score
def score_experience(resume_exp: float, jd_range: dict) -> float:
    if not jd_range:
        return 0.8  # Neutral score if no experience requirement
    if resume_exp == 0:
        return 0.3  # Some credit for fresh graduates
    
    min_exp = jd_range["min"]
    max_exp = jd_range.get("max", min_exp + 5)
    
    if resume_exp >= min_exp and resume_exp <= max_exp:
        return 1.0  # Perfect match
    elif resume_exp < min_exp:
        # Give partial credit if close to minimum
        ratio = resume_exp / min_exp
        return max(0.5 * ratio, 0.3)  # At least 30% credit
    else:
        # Overqualified but still good
        return 0.9


def score_education(education_required: bool, entities: dict) -> float:
    if not education_required:
        return 1.0  # No requirement, full score

    # Check if resume has education indicators
    has_dates = len(entities.get("dates", [])) > 0
    has_orgs = len(entities.get("organizations", [])) > 0
    
    if has_dates or has_orgs:
        return 1.0
    else:
        return 0.6  # Give some credit even if not clearly detected


def score_semantic_similarity(units: list, jd_embedding) -> float:
    sentences = [
        u["text"] for u in units
        if u.get("unit_type") == "sentence"
    ]

    if not sentences:
        return 0.0

    resume_embeddings = model.encode(sentences)

    similarities = util.cos_sim(resume_embeddings, jd_embedding)

    # Flatten to 1D safely
    similarities = similarities.squeeze()

    if similarities.ndim == 0:
        return float(similarities)

    num_sentences = similarities.shape[0]

    if num_sentences == 0:
        return 0.0

    k = min(3, num_sentences)

    top_k_values, _ = similarities.topk(k)

    return float(top_k_values.mean())



def matching_stage(data: dict, jd_data: dict):
    try:
        skill_score = score_skills(
            data.get("skill_confidence", {}),
            jd_data
        )

        experience_score = score_experience(
            data.get("experience_years", 0),
            jd_data.get("experience_range")
        )

        education_score = score_education(
            jd_data.get("education_required"),
            data.get("entities", {})
        )

        semantic_score = score_semantic_similarity(
            data.get("units", []),
            jd_data["jd_embedding"]
        )

        final_score = (
            0.40 * skill_score +
            0.30 * experience_score +
            0.15 * education_score +
            0.15 * semantic_score
        )

        # 🔥 APPLY TIMELINE RISK PENALTY
        timeline_risk = data.get("timeline_risk_score", 1.0)
        final_score *= timeline_risk
        print("---- MATCH DEBUG ----")
        print("Skill:", skill_score)
        print("Experience:", experience_score)
        print("Education:", education_score)
        print("Semantic:", semantic_score)
        print("Timeline:", timeline_risk)
        print("Final:", final_score)
        print("----------------------")
        
        final_score = round(final_score * 100, 2)

        # 🔥 DECISION - More realistic thresholds
        if final_score >= 60:
            decision = "SHORTLISTED"
        elif final_score >= 40:
            decision = "REVIEW"
        else:
            decision = "REJECTED"

        reasons = []
        if skill_score < 0.4:
            reasons.append("Low relevance of required skills")
        if experience_score < 0.4:
            reasons.append("Experience below job requirement")
        if semantic_score < 0.3:
            reasons.append("Low semantic alignment with job role")
        if timeline_risk < 1.0:
            reasons.append("Timeline inconsistency detected")
        
        # Add positive reasons for shortlisted candidates
        if decision == "SHORTLISTED":
            if skill_score >= 0.7:
                reasons.append("Strong skill match with job requirements")
            if experience_score >= 0.8:
                reasons.append("Experience aligns well with requirements")
            if semantic_score >= 0.6:
                reasons.append("Resume content highly relevant to role")

        return final_score, {
            "decision": decision,
            "reasons": reasons,
            "skill_score": skill_score,
            "experience_score": experience_score,
            "education_score": education_score,
            "semantic_score": semantic_score
        }
                
    except Exception as e:
        raise MatchingEngineError(str(e))
