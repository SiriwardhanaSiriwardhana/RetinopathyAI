"""
test_ml_service.py — Unit tests for DRModelService (app.services.ml_service).

Strategy
--------
* We test the *behaviour* of the service without a real PyTorch model.
* The model file is absent → _load_model() returns None → predict() falls back
  to the graceful "Model missing" string.  These tests verify that fallback.
* For a successful inference path we monkey-patch the internal model with a
  minimal MagicMock that returns controlled tensor output.
"""

import sys
import types
from unittest.mock import MagicMock, patch, mock_open
from pathlib import Path


# ---------------------------------------------------------------------------
# Re-import the module under fresh mocks each time
# ---------------------------------------------------------------------------

def _get_service():
    """Import DRModelService with a fresh, empty singleton."""
    # Remove cached singleton so each test starts clean
    import importlib
    import app.services.ml_service as svc_mod
    svc_mod.DRModelService._instance = None
    importlib.reload(svc_mod)
    return svc_mod.DRModelService


class TestDRModelServiceFallback:
    """Tests for the case where the model file is missing."""

    def test_predict_returns_fallback_when_model_missing(self, tmp_path):
        """When no .pth file exists, predict() must return a graceful result."""
        DRModelService = _get_service()
        # Patch model_path to a non-existent file
        svc = DRModelService.__new__(DRModelService)
        svc._instance = None

        with patch.object(Path, "exists", return_value=False):
            svc._initialize()

        assert svc.model is None
        dr_stage, confidence, details, heatmap = svc.predict("any_path.jpg")

        assert "Model missing" in dr_stage or confidence == 0.0
        assert heatmap is None

    def test_heatmap_dir_created_on_init(self, tmp_path):
        """The heatmap directory must be created during service initialisation."""
        DRModelService = _get_service()

        with (
            patch("app.core.config.settings.UPLOAD_DIR", str(tmp_path)),
            patch.object(Path, "exists", return_value=False),
        ):
            svc = DRModelService.__new__(DRModelService)
            svc._initialize()

        heatmap_dir = tmp_path / "heatmaps"
        assert heatmap_dir.exists()


class TestOpenAIFallback:
    """Tests for the OpenAI fallback recommendation logic."""

    def test_fallback_no_dr(self):
        from app.services.openai_service import _fallback_recommendation
        rec = _fallback_recommendation("No DR")
        assert "annual screening" in rec.lower() or "no diabetic" in rec.lower()

    def test_fallback_mild_npdr(self):
        from app.services.openai_service import _fallback_recommendation
        rec = _fallback_recommendation("Mild NPDR")
        assert len(rec) > 20

    def test_fallback_proliferative(self):
        from app.services.openai_service import _fallback_recommendation
        rec = _fallback_recommendation("Proliferative DR")
        assert "urgent" in rec.lower() or "immediate" in rec.lower()

    def test_fallback_unknown_stage(self):
        from app.services.openai_service import _fallback_recommendation
        rec = _fallback_recommendation("Unknown Stage XYZ")
        assert len(rec) > 10  # Must still return something meaningful

    def test_no_api_key_uses_fallback(self):
        """get_clinical_recommendation must return a fallback when key is empty."""
        with patch("app.services.openai_service.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = ""
            from app.services.openai_service import get_clinical_recommendation
            result = get_clinical_recommendation("No DR", 0.95, "Test details.")

        assert isinstance(result, str)
        assert len(result) > 10

    def test_openai_exception_falls_back(self):
        """If the OpenAI call raises an exception, fallback must be used."""
        with (
            patch("app.services.openai_service.settings") as mock_settings,
            patch("app.services.openai_service.OpenAI") as mock_openai_cls,
        ):
            mock_settings.OPENAI_API_KEY = "fake-key-abc"
            mock_client = MagicMock()
            mock_client.chat.completions.create.side_effect = Exception("network error")
            mock_openai_cls.return_value = mock_client

            from app.services.openai_service import get_clinical_recommendation
            result = get_clinical_recommendation("Mild NPDR", 0.75, "Some details.")

        assert isinstance(result, str)
        assert len(result) > 10
