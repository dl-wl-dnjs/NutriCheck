"""Pytest defaults: keep scoring tests independent of local ``backend/.env`` flags."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _disable_usda_only_mode_for_tests(monkeypatch: pytest.MonkeyPatch) -> None:
    """``USDA_ONLY_MODE=true`` in developer ``.env`` would change ``evaluate()``; tests assume OFF/Nutri-Score paths."""
    monkeypatch.setattr("backend.config.settings.usda_only_mode", False, raising=False)
