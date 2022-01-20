import logging

logger = logging.getLogger(__name__)

INDEX_BUCKET_COUNT = 8192
OBJECT_BUCKET_COUNT = 8192


def makeSearchIndexChunkKey(key: str) -> str:
    """Make Chunk Key

    This is simple, and provides a reasonable distribution

    :param key:

    :return: chunkKey

    """

    if not key:
        raise Exception("key is None or zero length")

    bucket = 0
    for char in key:
        bucket = ((bucket << 5) - bucket) + ord(char)
        bucket = bucket | 0  # This is in the javascript code.

    return str(bucket & (INDEX_BUCKET_COUNT - 1))


def makeSearchObjectChunkKey(key: int) -> str:
    """Make Chunk Key

    This is simple, and provides a reasonable distribution

    :param key:

    :return: chunkKey

    """

    if key is None:
        raise Exception("key is None")

    return str(key & (OBJECT_BUCKET_COUNT - 1))
