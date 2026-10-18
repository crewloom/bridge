#!/usr/bin/env python3
import unittest

from core.i18n import t


class TestI18n(unittest.TestCase):
    def test_default_is_english(self):
        self.assertEqual(t("btn_stop", "en"), "⏹ Stop")
        self.assertEqual(t("status_done", "en"), "✅ Done")
        self.assertIn("Select Agent", t("select_agent", "en", agent="build"))

    def test_arabic_translations(self):
        self.assertEqual(t("btn_stop", "ar"), "⏹ إيقاف")
        self.assertEqual(t("status_done", "ar"), "✅ انتهى")
        self.assertIn("اختر الأجنت", t("select_agent", "ar", agent="build"))

    def test_fallback_to_english_on_unknown(self):
        self.assertEqual(t("btn_stop", "unknown_lang"), "⏹ Stop")


if __name__ == "__main__":
    unittest.main()
