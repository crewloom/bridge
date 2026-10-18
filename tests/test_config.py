#!/usr/bin/env python3
import os
import tempfile
import unittest

from core.config import Config, get_workspace_id


class TestConfig(unittest.TestCase):
    def test_workspace_id_deterministic(self):
        w1 = get_workspace_id("/path/to/my/project")
        w2 = get_workspace_id("/path/to/my/project")
        self.assertEqual(w1, w2)

    def test_config_defaults(self):
        cfg = Config(target_dir=tempfile.gettempdir())
        self.assertEqual(cfg.default_agent, "build")
        self.assertEqual(cfg.language, "en")
        self.assertGreaterEqual(cfg.daily_limit, 50)
        self.assertIn("opencode/space-bunny-free", cfg.favorite_models)

    def test_validation_fails_on_empty(self):
        cfg = Config(target_dir=tempfile.gettempdir())
        cfg.bot_token = ""
        cfg.allowed_chat_id = ""
        errors = cfg.validate()
        self.assertGreaterEqual(len(errors), 2)


if __name__ == "__main__":
    unittest.main()
