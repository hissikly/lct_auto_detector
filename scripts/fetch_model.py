"""Download the pinned inference weight, verifying it before installation.

Uses only the Python standard library. Large artifacts never enter Git.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "app/model_artifacts/strong_l336_aqe"
SOURCE_COMMIT = "2fde3a66c7d8412a48b759d8ffcf5114d6ef7e50"
URL = ("https://media.githubusercontent.com/media/ayfaga/LCT_task_7/"
       + SOURCE_COMMIT + "/model_artifacts/strong_l336_aqe/model_inference.pt")


def verify(path: Path, expected: dict) -> None:
    if path.stat().st_size != expected["model_size_bytes"]:
        raise ValueError(f"Unexpected model size: {path}")
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != expected["model_sha256"]:
        raise ValueError(f"Model SHA256 mismatch: {path}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    choice = parser.add_mutually_exclusive_group()
    choice.add_argument("--source", type=Path, help="Copy an already downloaded weight")
    choice.add_argument("--verify-file", type=Path, help="Only verify an external weight; no copy or download")
    args = parser.parse_args()
    manifest = json.loads((BUNDLE / "model_manifest.json").read_text())
    destination = BUNDLE / manifest["model_file"]
    if args.verify_file:
        verify(args.verify_file, manifest)
        print(f"Verified size and SHA256: {args.verify_file}")
        return 0
    if destination.exists():
        verify(destination, manifest)
        print(f"Already verified: {destination}")
        return 0
    required = int(manifest["model_size_bytes"])
    if shutil.disk_usage(BUNDLE).free < required + 256 * 1024 * 1024:
        raise ValueError("Need the model size plus 256 MiB of free space")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".model-download-", dir=BUNDLE, delete=False) as out:
            temporary = Path(out.name)
            if args.source:
                with args.source.open("rb") as source:
                    shutil.copyfileobj(source, out, 8 * 1024 * 1024)
            else:
                print(f"Downloading {required:,} bytes from pinned upstream commit...", flush=True)
                request = urllib.request.Request(URL, headers={"User-Agent": "lct-auto-detector-model-fetch"})
                with urllib.request.urlopen(request, timeout=120) as source:
                    received = 0
                    while chunk := source.read(8 * 1024 * 1024):
                        received += len(chunk)
                        if received > required:
                            raise ValueError("Download exceeded the expected model size")
                        out.write(chunk)
        verify(temporary, manifest)
        if destination.exists():
            raise ValueError("Model appeared during download; refusing to replace it")
        os.replace(temporary, destination)
        print(f"Installed verified model: {destination}")
        return 0
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError) as exc:
        print(f"Model preparation failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
