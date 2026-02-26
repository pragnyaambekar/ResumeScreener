from app.core.nlp_manager import NLPManager

nlp = NLPManager.get_spacy()


class SegmentationError(Exception):
    pass


def is_fragment(span) -> bool:
    """
    Detect sentence fragments using POS tags.
    """
    tokens = [t for t in span if not t.is_space]

    if len(tokens) < 4:
        return True

    has_verb = any(token.pos_ == "VERB" for token in span)
    return not has_verb


def segmentation_stage(data: dict) -> dict:
    doc = data.get("doc")
    if not doc:
        raise SegmentationError("Parsed doc not available")

    units = []
    fragment_count = 0

    # -------- Sentence Segmentation --------
    for sent in doc.sents:
        sentence = sent.text.strip()
        if not sentence:
            continue

        fragment = is_fragment(sent)

        units.append({
            "unit_type": "sentence",
            "text": sentence,
            "is_fragment": fragment
        })

        if fragment:
            fragment_count += 1

    if not units:
        raise SegmentationError("No sentences detected")

    data.update({
        "units": units,
        "fragment_ratio": round(fragment_count / len(units), 2)
    })

    return data
