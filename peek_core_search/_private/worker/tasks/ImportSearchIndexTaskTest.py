from twisted.trial import unittest

from peek_core_search._private.worker.tasks.ImportSearchIndexTask import \
    _splitPartialKeywords, _splitFullKeywords


class ImportSearchIndexTaskTest(unittest.TestCase):
    def testFullKeywordSplit(self):
        self.assertEqual({'^smith$'},
                         _splitFullKeywords("smith"))
        self.assertEqual({'^zorroreyner$'},
                         _splitFullKeywords("ZORRO-REYNER"))
        self.assertEqual({'^34534535$'},
                         _splitFullKeywords("34534535"))

        self.assertEqual({'^and$'}, _splitFullKeywords("and"))
        self.assertEqual(set(), _splitFullKeywords("to"))

        self.assertEqual(_splitFullKeywords("Milton Unit 22"),
                         {'^milton$', '^unit$'})

    def testPartialKeywordSplit(self):
        self.assertEqual(_splitPartialKeywords("smith"), {'^smi', 'mit', 'ith'})
        self.assertEqual(_splitPartialKeywords("ZORRO-REYNER"),
                         {'^zor', 'orr', 'rro', 'ror', 'ore', 'rey', 'eyn', 'yne', 'ner'})
        self.assertEqual(_splitPartialKeywords("34534535"),
                         {'^345', '453', '534', '345', '453', '535'})

        self.assertEqual(_splitPartialKeywords("and"), {'^and'})
        self.assertEqual(_splitPartialKeywords("to"), set())

        self.assertEqual(_splitPartialKeywords("Milton Unit 22"),
                         {'^mil', 'ilt', 'lto', 'ton',
                          '^uni', 'nit'})
