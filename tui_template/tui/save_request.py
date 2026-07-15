import re

FILE_SUFFIX = ".posting.yaml"

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")

def generate_request_filename(request_title: str) -> str:
    return slugify(request_title)
