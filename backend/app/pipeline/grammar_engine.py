from app.core.nlp_manager import NLPManager

nlp = NLPManager.get_spacy()


class GrammarValidationError(Exception):
    pass


def is_valid_sentence(span) -> bool:
    """
    Checks grammatical validity using dependency parsing on a span.
    """
    has_subject = False
    has_verb = False
    has_root = False

    for token in span:
        if token.dep_ in ("nsubj", "nsubjpass"):
            has_subject = True
        if token.pos_ == "VERB":
            has_verb = True
        if token.dep_ == "ROOT":
            has_root = True

    return has_subject and has_verb and has_root


def grammar_stage(data: dict) -> dict:
    doc = data.get("doc")
    if not doc:
        raise GrammarValidationError("Parsed doc not available")

    valid_count = 0
    total_sentences = 0
    grammar_results = []

    for sent in doc.sents:
        sentence_text = sent.text.strip()
        if not sentence_text:
            continue

        total_sentences += 1

        is_valid = is_valid_sentence(sent)
        if is_valid:
            valid_count += 1

        grammar_results.append({
            "text": sentence_text,
            "is_grammatically_valid": is_valid
        })

    if total_sentences == 0:
        raise GrammarValidationError("No sentences detected")

    grammar_score = round(valid_count / total_sentences, 2)

    data.update({
        "grammar_score": grammar_score,
        "grammar_results": grammar_results
    })

    return data
