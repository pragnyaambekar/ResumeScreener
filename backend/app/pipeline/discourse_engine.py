from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from app.core.nlp_manager import NLPManager
model = NLPManager.get_sentence_transformer()

class DiscourseError(Exception):
    pass


def discourse_stage(data: dict) -> dict:
    units = data.get("units")
    if not units:
        raise DiscourseError("No units available for discourse analysis")

    # Only consider real sentences (ignore fragments)
    sentences = [
        u["text"] for u in units
        if u["unit_type"] == "sentence" and not u.get("is_fragment")
    ]

    # Not enough sentences → suspicious resume
    if len(sentences) < 3:
        discourse_score = 0.0
    else:
        embeddings = model.encode(sentences)

        similarities = []
        for i in range(len(embeddings) - 1):
            sim = cosine_similarity(
                [embeddings[i]],
                [embeddings[i + 1]]
            )[0][0]
            similarities.append(sim)

        discourse_score = round(float(np.mean(similarities)), 2)

    data.update({
        "discourse_score": discourse_score,
        "sentence_count_for_discourse": len(sentences)
    })

    return data
