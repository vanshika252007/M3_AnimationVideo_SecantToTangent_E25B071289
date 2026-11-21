#!/usr/bin/env python3
"""Export storyboard.html to the repository's storyboard.pdf with local Chrome."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = Path(__file__).resolve().parents[1] / "storyboard.html"
OUTPUT = ROOT / "storyboard.pdf"
CHROME_CANDIDATES = [
    Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    Path("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
]


def main() -> None:
    browser = next((path for path in CHROME_CANDIDATES if path.exists()), None)
    if browser is None:
        raise FileNotFoundError(
            "Google Chrome or Brave Browser is required to export storyboard.pdf."
        )
    with tempfile.TemporaryDirectory(prefix="m3-storyboard-") as profile:
        subprocess.run(
            [
                str(browser),
                "--headless",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--user-data-dir={profile}",
                f"--print-to-pdf={OUTPUT}",
                HTML.as_uri(),
            ],
            check=True,
        )
    if not OUTPUT.exists() or OUTPUT.stat().st_size == 0:
        raise RuntimeError(f"Chrome did not create {OUTPUT}")
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
