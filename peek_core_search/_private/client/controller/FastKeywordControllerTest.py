from twisted.trial import unittest

from peek_core_search._private.client.controller.FastKeywordController import \
    FastKeywordController


class FastKeywordControllerTest(unittest.TestCase):
    def test_mergePartialAndFullMatches_1(self):
        fullByKw = {'^to$': [5, 6]}
        partialByKw = {'^to': [7], '^aa': [8]}

        inst = FastKeywordController(None, None)

        resultByKw = inst._mergePartialAndFullMatches('to', fullByKw, partialByKw)

        self.assertEqual(set(resultByKw), {'to'})
        self.assertEqual(len(resultByKw), 1)
        self.assertEqual(set(resultByKw['to']), {5, 6, 7})

    def test_mergePartialAndFullMatches_2(self):
        fullByKw = {'^five$': [5, 6]}
        partialByKw = {'^fiv': [7, 6],
                       'ive': [7, 6]}

        inst = FastKeywordController(None, None)

        resultByKw = inst._mergePartialAndFullMatches(
            "five seven", fullByKw, partialByKw)

        self.assertEqual(set(resultByKw), {'five'})
        self.assertEqual(len(resultByKw), 1)
        self.assertEqual(set(resultByKw['five']), {5, 6, 7})

    def test_setIntersectFilterIndexResults(self):
        data = {'0': [6778979, 7042955]}

        inst = FastKeywordController(None, None)

        result = inst._setIntersectFilterIndexResults(data)

        self.assertEqual(result, {6778979, 7042955})
        self.assertEqual(len(result), len(data['0']))
