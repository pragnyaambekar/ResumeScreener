import re


class DocumentIntelligenceError(Exception):
    pass


BULLET_PATTERNS = [
    r"^\s*[-•●▪◦]",
    r"^\s*\d+\.",
    r"^\s*[a-zA-Z]\)"
]

HEADING_KEYWORDS = [
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "summary"
]


def normalize_line(line: str) -> str:
    # Normalize common bullet symbols to "-"
    return line.replace("•", "-").replace("●", "-").replace("▪", "-").replace("◦", "-")


def detect_block_type(line: str) -> str:
    line = line.strip()

    if not line:
        return "empty"

    # Bullet detection
    for pattern in BULLET_PATTERNS:
        if re.match(pattern, line):
            return "bullet"

    # Heading detection (keyword-based, case insensitive)
    lowered = line.lower()
    if any(keyword in lowered for keyword in HEADING_KEYWORDS) and len(line.split()) <= 4:
        return "heading"

    return "paragraph"


def document_intelligence_stage(data: dict) -> dict:
    raw_text = data.get("raw_text")
    if not raw_text:
        raise DocumentIntelligenceError("No raw text available")

    lines = raw_text.split("\n")

    blocks = []
    non_empty_lines = 0
    bullet_count = 0
    paragraph_count = 0

    for line in lines:
        line = normalize_line(line)
        block_type = detect_block_type(line)

        if block_type == "empty":
            continue

        non_empty_lines += 1

        if block_type == "bullet":
            bullet_count += 1
        elif block_type == "paragraph":
            paragraph_count += 1

        blocks.append({
            "type": block_type,
            "text": line.strip()
        })

    if non_empty_lines == 0:
        raise DocumentIntelligenceError("Resume has no usable lines")

    bullet_ratio = bullet_count / non_empty_lines
    paragraph_ratio = paragraph_count / non_empty_lines

    layout_signals = {
        "total_blocks": len(blocks),
        "bullet_ratio": round(bullet_ratio, 2),
        "paragraph_ratio": round(paragraph_ratio, 2),
        "low_structure_flag": non_empty_lines < 5
    }

    data.update({
        "blocks": blocks,
        "layout_signals": layout_signals
    })

    return data
