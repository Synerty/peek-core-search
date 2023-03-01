from twisted.trial import unittest

from peek_core_search._private.worker.tasks.KeywordSplitter import (
    prepareExcludedPartialTermsForFind,
)
from peek_core_search._private.worker.tasks.KeywordSplitter import (
    splitPartialKeywords,
    splitFullKeywords,
    _splitFullTokens,
    twoCharTokens,
)


class KeywordSplitterTest(unittest.TestCase):
    def testDuplicates(self):
        self.assertEqual({"smith"}, _splitFullTokens("smith smith"))

    def test_twoCharTokens(self):
        self.assertEqual(set(), twoCharTokens("smith smith"))

        self.assertEqual({"^to$"}, twoCharTokens(splitFullKeywords("two to")))

        self.assertEqual(
            {"^to"}, twoCharTokens(splitPartialKeywords([], "two to"))
        )

    def testFullKeywordSplit(self):
        self.assertEqual({"^smith$"}, splitFullKeywords(set(), "smith"))
        self.assertEqual(
            {"^zorro-reyner$"}, splitFullKeywords(set(), "ZORRO-REYNER")
        )
        self.assertEqual({"^34534535$"}, splitFullKeywords(set(), "34534535"))

        self.assertEqual({"^and$"}, splitFullKeywords(set(), "and"))
        self.assertEqual({"^to$"}, splitFullKeywords(set(), "to"))
        self.assertEqual({"^to$"}, splitFullKeywords(set(), "to"))

        self.assertEqual(
            {"^milton$", "^unit$", "^22$"},
            splitFullKeywords(set(), "Milton Unit 22"),
        )

        self.assertEqual({"^unit$"}, splitFullKeywords(set(), "Unit A"))

        self.assertEqual({"^unit$"}, splitFullKeywords(set(), "Unit 1"))

        self.assertEqual(
            {"^trans$", "^66kv$", "^b3$", "^cb$", "^ats$"},
            splitFullKeywords(set(), "ATS B3 TRANS 66KV CB"),
        )

    def testFullKeywordSplitWithExcludes(self):
        self.assertEqual(
            {"^66kv$", "^b3$", "^cb$"},
            splitFullKeywords({"trans", "ats"}, "ATS B3 TRANS 66KV CB"),
        )

        self.assertEqual(
            {"^66kv$", "^b3$", "^cb$", "^trans$"},
            splitFullKeywords({"tran", "ats"}, "ATS B3 TRANS 66KV CB"),
        )

        self.assertEqual(
            {"^milton$", "^22$"}, splitFullKeywords({"unit"}, "Milton Unit 22")
        )

    def testPartialKeywordSplit(self):
        self.assertEqual(
            {"^smi", "mit", "ith"}, splitPartialKeywords([], "smith")
        )

        self.assertEqual(
            {
                "^zor",
                "orr",
                "rro",
                "ro-",
                "o-r",
                "-re",
                "rey",
                "eyn",
                "yne",
                "ner",
            },
            splitPartialKeywords([], "ZORRO-REYNER"),
        )
        self.assertEqual(
            {"^345", "535", "453", "534", "345"},
            splitPartialKeywords([], "34534535"),
        )

        self.assertEqual({"^and"}, splitPartialKeywords([], "and"))

        self.assertEqual({"^to"}, splitPartialKeywords([], "to"))

        self.assertEqual({"a55", "^ha5"}, splitPartialKeywords([], "ha55"))

        self.assertEqual(
            {"^mil", "ilt", "lto", "ton", "^uni", "nit", "^22"},
            splitPartialKeywords([], "Milton Unit 22"),
        )

        self.assertEqual(
            {"^mil", "ill", "lls", "^un", "^no"},
            splitPartialKeywords([], "mills un no"),
        )

        self.assertEqual(
            {"^uni", "nit", "^22"}, splitPartialKeywords([], "Unit 22")
        )

        self.assertEqual({"^uni", "nit"}, splitPartialKeywords([], "Unit 1"))

        self.assertEqual({"^uni", "nit"}, splitPartialKeywords([], "A Unit"))

        self.assertEqual({"^uni", "nit"}, splitPartialKeywords([], "2 Unit"))

        self.assertEqual(
            {"^ats", "^cb", "^b3", "^66k", "6kv", "^tra", "ran", "ans"},
            splitPartialKeywords([], "ATS B3 TRANS 66KV CB"),
        )

        self.assertEqual(
            {"^col", "^lin", "ins"}, splitPartialKeywords([], "COL LINS")
        )

        self.assertNotEqual(
            splitPartialKeywords([], "COLLINS"),
            splitPartialKeywords([], "COL LINS"),
        )

    def test_splitPartialWithExcludes(self):
        # Test to ensure we can remove useless tokens.
        self.assertEqual(
            {"^123", "234", "345", "456"},
            splitPartialKeywords(["AliAS-".lower()], "ALIAS-123456"),
        )

        self.assertEqual(
            {"^123", "234", "345", "456", "567"},
            splitPartialKeywords(
                ["AliAS-".lower(), "wEc".lower()], "WEC1234567"
            ),
        )

    def test_preparePartialExcludedTermsForFind(self):
        self.assertEqual(
            ["123456", "12345", "1234", "123", "1"],
            prepareExcludedPartialTermsForFind(["1234", "123", "123456", "1"]),
        )
