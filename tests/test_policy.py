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

    def test_blocks_system_destruction(self):
        hits = self.policy.check_command("mkfs.ext4 /dev/sda1")
        self.assertTrue(len(hits) > 0)
        hits_shut = self.policy.check_command("shutdown -h now")
        self.assertTrue(len(hits_shut) > 0)
        hits_force = self.policy.check_command("git push --force origin main")
        self.assertTrue(len(hits_force) > 0)

    def test_allows_ops_and_ssh_commands(self):
        # Operations, SSH keys, sudo, and config inspections are permitted by default
        hits_ssh = self.policy.check_command("ssh -i ~/.ssh/id_rsa user@141.253.114.101")
        self.assertEqual(len(hits_ssh), 0)
        hits_pinpoint = self.policy.check_command("tools/ai/pinpoint_go.sh pinpoints")
        self.assertEqual(len(hits_pinpoint), 0)
        hits_env = self.policy.check_command("cat .env.production")
        self.assertEqual(len(hits_env), 0)
        hits_sudo = self.policy.check_command("sudo systemctl status rveta")
        self.assertEqual(len(hits_sudo), 0)

    def test_allows_safe_commands(self):
        hits = self.policy.check_command("git status")
        self.assertEqual(len(hits), 0)
        hits2 = self.policy.check_command("npm test")
        self.assertEqual(len(hits2), 0)

    def test_custom_deny_patterns_support(self):
        custom_policy = SecurityPolicy(self.tmp, custom_patterns=[r"\bcustom_forbidden_tool\b"])
        hits = custom_policy.check_command("run custom_forbidden_tool --flag")
        self.assertTrue(len(hits) > 0)

    def test_path_safety_with_allowed_paths(self):
        policy = SecurityPolicy(self.tmp, allowed_paths=["/Volumes/data/my machine"])
        safe_sub, _ = policy.check_file_path(self.tmp + "/test.txt")
        self.assertTrue(safe_sub)
        safe_allowed, _ = policy.check_file_path("/Volumes/data/my machine/i.key")
        self.assertTrue(safe_allowed)


if __name__ == "__main__":
    unittest.main()
