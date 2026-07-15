import os
import re
from pathlib import Path
from tui.save_request import FILE_SUFFIX

def is_valid_filename(filename: str) -> bool:
    if not filename or filename.strip() == "":
        return False

    if os.path.sep in filename or (os.path.altsep and os.path.altsep in filename):
        return False

    if len(filename) > 255:
        return False

    reserved_names = [
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ]
    name_without_ext = os.path.splitext(filename)[0].upper()
    if name_without_ext in reserved_names:
        return False

    if (
        re.search(r"\.\.", filename)
        or filename.startswith(".")
        or filename.endswith(".")
    ):
        return False

    return True

def get_request_file_stem_and_suffix(file_name: str) -> tuple[str, str]:
    if file_name.endswith(FILE_SUFFIX) or file_name.endswith("posting.yml"):
        file_name_parts = file_name.split(".")
        file_suffix = ".".join(file_name_parts[-2:])
        file_stem = ".".join(file_name_parts[:-2])
    else:
        raise ValueError(f"Not a request file: {file_name}")
    return file_stem, file_suffix

def request_file_exists(file_name: str, parent_directory: Path) -> bool:
    if not parent_directory.exists():
        return False
    for path in parent_directory.iterdir():
        if not (path.name.endswith(FILE_SUFFIX) or path.name.endswith("posting.yml")):
            continue

        stem = path.stem
        i = stem.rfind(".")
        if 0 < i < len(stem) - 1:
            name = stem[:i]
            file_stem, _ = get_request_file_stem_and_suffix(file_name)
            if name == file_stem:
                return True
        else:
            continue

    return False

def get_unique_request_filename(file_name: str, parent_directory: Path) -> str:
    if not request_file_exists(file_name, parent_directory):
        return file_name

    file_stem, _ = get_request_file_stem_and_suffix(file_name)

    existing_files = set(parent_directory.glob(f"{file_stem}*posting.yaml")) | set(
        parent_directory.glob(f"{file_stem}*posting.yml")
    )
    existing_file_names = {f.name for f in existing_files}

    candidate_name = file_name
    while candidate_name in existing_file_names:
        try:
            candidate_stem, _ = get_request_file_stem_and_suffix(candidate_name)
        except ValueError:
            continue

        split_candidate_stem = candidate_stem.rsplit("-", 1)
        if len(split_candidate_stem) == 2:
            try:
                width = len(split_candidate_stem[1])
                number = int(split_candidate_stem[1])
            except ValueError:
                width = 2
                number = 0
        else:
            width = 2
            number = 0

        number = int(number) + 1
        candidate_name = f"{file_stem}-{number:0{width}d}.posting.yaml"

    return candidate_name
