#!/usr/bin/env python3
import unittest
from core.control_room import OpenCode


class TestOpenCodeClient(unittest.TestCase):
    def setUp(self):
        self.client = OpenCode(
            base="http://127.0.0.1:4096",
            password="test-secret-password",
            directory="/Volumes/data/my repo with spaces",
        )

    def test_url_construction_without_query(self):
        url = self.client._url("/session")
        self.assertTrue(url.startswith("http://127.0.0.1:4096/session?directory="))
        self.assertIn("my%20repo%20with%20spaces", url)

    def test_url_construction_with_existing_query(self):
        url = self.client._url("/event?poll=1")
        self.assertTrue(url.startswith("http://127.0.0.1:4096/event?poll=1&directory="))
        self.assertIn("my%20repo%20with%20spaces", url)


if __name__ == "__main__":
    unittest.main()
