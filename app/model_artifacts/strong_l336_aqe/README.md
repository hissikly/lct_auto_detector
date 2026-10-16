# Strong L336 + batch AQE bundle

JSON manifests and the matching portable refusal policy are tracked in Git.
The 1,217,580,060-byte `model_inference.pt` is downloaded separately.

From the repository root run `python3.12 scripts/fetch_model.py`, or use
`--source /absolute/path/to/model_inference.pt` to install a local copy.
No Git LFS is required for this repository. The downloader checks size and
SHA256 before installation; startup also verifies the weight and policy.

See [the application guide](../../README.md) and
[metrics and limitations](../../../docs/RESULTS.md).
