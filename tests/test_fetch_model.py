"""The downloader must never install unverified or incomplete weights."""
import hashlib
import json
import sys

import pytest

from scripts import fetch_model


@pytest.fixture
def bundle(tmp_path, monkeypatch):
    path = tmp_path / "bundle"
    path.mkdir()
    payload = b"fixture inference weight"
    (path / "model_manifest.json").write_text(json.dumps({
        "model_file": "model_inference.pt",
        "model_size_bytes": len(payload),
        "model_sha256": hashlib.sha256(payload).hexdigest(),
    }))
    monkeypatch.setattr(fetch_model, "BUNDLE", path)
    return path, payload


def test_local_weight_is_verified_and_second_install_is_idempotent(bundle, tmp_path, monkeypatch):
    path, payload = bundle
    source = tmp_path / "download.pt"
    source.write_bytes(payload)
    monkeypatch.setattr(sys, "argv", ["fetch_model.py", "--source", str(source)])
    assert fetch_model.main() == 0
    assert (path / "model_inference.pt").read_bytes() == payload
    source.unlink()
    assert fetch_model.main() == 0


@pytest.mark.parametrize("payload", [b"short", b"X" * len(b"fixture inference weight")])
def test_invalid_download_leaves_no_weight_or_partial_file(bundle, tmp_path, monkeypatch, payload):
    path, _ = bundle
    source = tmp_path / "bad.pt"
    source.write_bytes(payload)
    monkeypatch.setattr(sys, "argv", ["fetch_model.py", "--source", str(source)])
    with pytest.raises(ValueError):
        fetch_model.main()
    assert not (path / "model_inference.pt").exists()
    assert not list(path.glob(".model-download-*"))


def test_failed_connection_leaves_no_partial_file(bundle, monkeypatch):
    path, _ = bundle
    def fail(*args, **kwargs):
        raise OSError("fixture connection failure")
    monkeypatch.setattr(sys, "argv", ["fetch_model.py"])
    monkeypatch.setattr(fetch_model.urllib.request, "urlopen", fail)
    with pytest.raises(OSError, match="connection failure"):
        fetch_model.main()
    assert not (path / "model_inference.pt").exists()
    assert not list(path.glob(".model-download-*"))
