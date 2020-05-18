from twisted.trial import unittest

from peek_core_search._private.worker.tasks.ImportSearchIndexTask import _splitKeywords


class ImportSearchIndexTaskTest(unittest.TestCase):
    def testKeywordSplit(self):
        self.assertEqual(_splitKeywords("smith"), {'smi', 'mit', 'ith'})
        self.assertEqual(_splitKeywords("ZORRO-REYNER"),
                         {'zor', 'orr', 'rro', 'ror', 'ore', 'rey', 'eyn', 'yne', 'ner'})
        self.assertEqual(_splitKeywords("34534535"),
                         {'345', '453', '534', '345', '453', '535'})


        self.assertEqual(_splitKeywords("and"), {'and'})
        self.assertEqual(_splitKeywords("to"), set())
