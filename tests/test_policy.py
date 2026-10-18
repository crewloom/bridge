#!/usr/bin/env python3
import tempfile
import unittest

from core.policy import SecurityPolicy


class TestSecurityPolicy(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.gettempdir()
        self.policy = SecurityPolicy(self.tmp)

    def test_blocks_destructive_rm(self):
        hits = self.policy.check_command("rm -rf /")
        self.assertTrue(len(hits) > 0)
        hits2 = self.policy.check_command("rm -fr ~")
        self.assertTrue(len(hits2) > 0)

    def test_blocks_sudo(self):
        hits = self.policy.check_command("sudo apt update")
        self.assertTrue(len(hits) > 0)

    def test_blocks_ssh_keys(self):
        hits = self.policy.check_command("cat ~/.ssh/id_rsa")
        self.assertTrue(len(hits) > 0)

    def test_allows_safe_commands(self):
        hits = self.policy.check_command("git status")
        self.assertEqual(len(hits), 0)
        hits2 = self.policy.check_command("npm test")
        self.assertEqual(len(hits2), 0)


if __name__ == "__main__":
    unittest.main()
