from app.core.nlp_manager import NLPManager

nlp = NLPManager.get_spacy()


class SemanticRoleError(Exception):
    pass


ACTION_VERBS_BLACKLIST = {
    "have", "know", "familiar", "experience"
}


def analyze_semantic_roles(span) -> dict:
    """
    Extract semantic roles from a parsed spaCy sentence (Span)
    Resume-aware: allows bullet-style action phrases.
    """

    actor = False
    action = False
    obj = False
    context = False

    for token in span:
        # Actor (explicit subject)
        if token.dep_ in ("nsubj", "nsubjpass"):
            actor = True

        # Action (main meaningful verb)
        if (
            token.pos_ == "VERB"
            and token.lemma_.lower() not in ACTION_VERBS_BLACKLIST
        ):
            action = True

        # Object detection (direct or indirect)
        if token.dep_ in ("dobj", "pobj", "attr", "obj"):
            obj = True

        # Context/result indicators
        if token.dep_ in ("prep", "advcl", "xcomp", "acl"):
            context = True

    return {
        "has_actor": actor,
        "has_action": action,
        "has_object": obj,
        "has_context": context
    }


def semantic_role_stage(data: dict) -> dict:
    full_doc = data.get("doc")

    if not full_doc:
        raise SemanticRoleError("No parsed document available")

    valid_count = 0
    total_sentences = 0
    role_results = []

    for sent in full_doc.sents:
        sentence_text = sent.text.strip()

        # Ignore very short fragments
        if len(sentence_text.split()) < 3:
            continue

        total_sentences += 1

        roles = analyze_semantic_roles(sent)

        # 🔥 Resume-aware validation logic
        # Accept:
        # 1. Verb + Object
        # 2. Verb + Context
        # 3. Actor + Verb
        is_semantically_valid = (
            roles["has_action"] and (
                roles["has_object"] or
                roles["has_context"] or
                roles["has_actor"]
            )
        )

        if is_semantically_valid:
            valid_count += 1

        role_results.append({
            "text": sentence_text,
            "semantic_roles": roles,
            "is_semantically_valid": is_semantically_valid
        })

    if total_sentences == 0:
        raise SemanticRoleError("No valid sentences available")

    semantic_role_score = round(valid_count / total_sentences, 2)

    data.update({
        "semantic_role_score": semantic_role_score,
        "semantic_role_results": role_results
    })

    print("Semantic role score:", semantic_role_score)

    return data
