#!/usr/bin/env python3
"""Unit tests for Always Allow permissions and auto mode execution."""
import json
import unittest

from core.control_room import decide_permission, parse_callback, permission_keyboard


class TestPermissions(unittest.TestCase):
    def test_parse_callback_permission_actions(self):
        # Always Allow
        cb_always = parse_callback("pm:a:per_abc123456")
        self.assertEqual(cb_always, ("pm:a", "per_abc123456"))

        # Allow Once
        cb_once = parse_callback("pm:o:per_abc123456")
        self.assertEqual(cb_once, ("pm:o", "per_abc123456"))

        # Reject
        cb_reject = parse_callback("pm:r:per_abc123456")
        self.assertEqual(cb_reject, ("pm:r", "per_abc123456"))

        # Auto Mode toggle
        cb_auto = parse_callback("mo:auto")
        self.assertEqual(cb_auto, ("mo:auto", None))

    def test_permission_keyboard_layout(self):
        # English keyboard
        kb_en = permission_keyboard("per_test123", lang="en")
        rows_en = kb_en["inline_keyboard"]
        self.assertEqual(len(rows_en), 3)
        # Row 1: Allow Once and Always Allow
        self.assertEqual(rows_en[0][0]["text"], "✅ Allow Once")
        self.assertEqual(rows_en[0][0]["callback_data"], "pm:o:per_test123")
        self.assertEqual(rows_en[0][1]["text"], "♾️ Always Allow")
        self.assertEqual(rows_en[0][1]["callback_data"], "pm:a:per_test123")
        # Row 2: Reject and Stop Session
        self.assertEqual(rows_en[1][0]["text"], "⛔ Reject")
        self.assertEqual(rows_en[1][1]["text"], "🛑 Stop Session")
        # Row 3: Help
        self.assertEqual(rows_en[2][0]["callback_data"], "hp")

        # Arabic keyboard
        kb_ar = permission_keyboard("per_test123", lang="ar")
        rows_ar = kb_ar["inline_keyboard"]
        self.assertEqual(rows_ar[0][0]["text"], "✅ مرة واحدة")
        self.assertEqual(rows_ar[0][1]["text"], "♾️ سماح دائماً")
        self.assertEqual(rows_ar[1][0]["text"], "⛔ رفض")

    def test_decide_permission_auto_mode(self):
        safe_props = {
            "permission": "bash",
            "metadata": {"command": "rtk grep -rn 'Attendance' --include=*.php"},
            "patterns": ["rtk grep*"],
        }
        # In build mode: returns "ask"
        decision_build, _ = decide_permission(safe_props, mode="build")
        self.assertEqual(decision_build, "ask")

        # In auto mode: returns "allow"
        decision_auto, _ = decide_permission(safe_props, mode="auto")
        self.assertEqual(decision_auto, "allow")

    def test_decide_permission_blocks_dangerous_even_in_auto_mode(self):
        dangerous_props = {
            "permission": "bash",
            "metadata": {"command": "rm -rf /"},
            "patterns": ["rm -rf /"],
        }
        # Even in auto mode, destructive commands MUST be rejected
        decision, reason = decide_permission(dangerous_props, mode="auto")
        self.assertEqual(decision, "reject")
        self.assertIn("السياسة ترفض", reason)

        format_props = {
            "permission": "bash",
            "metadata": {"command": "mkfs.ext4 /dev/nvme0n1"},
            "patterns": ["mkfs*"],
        }
        decision_format, _ = decide_permission(format_props, mode="auto")
        self.assertEqual(decision_format, "reject")

    def test_decide_permission_ops_and_ssh(self):
        ops_props = {
            "permission": "bash",
            "metadata": {"command": "tools/ai/pinpoint_go.sh pinpoints"},
            "patterns": ["tools/ai/pinpoint_go.sh*"],
        }
        # In build mode, user is asked for approval
        decision_build, _ = decide_permission(ops_props, mode="build")
        self.assertEqual(decision_build, "ask")

        # In auto mode, ops script is allowed
        decision_auto, _ = decide_permission(ops_props, mode="auto")
        self.assertEqual(decision_auto, "allow")


if __name__ == "__main__":
    unittest.main()
