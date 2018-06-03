import logging

logger = logging.getLogger(__name__)


def makeChunkKeyFromString(key: str) -> str:
    """ Make Chunk Key

    This is simple, and provides a reasonable distribution

    :param key:

    :return: chunkKey

    """

    if not key:
        raise Exception("key is None or zero length")

    hash = 0
    for char in key:
        hash = ((hash << 5) - hash) + ord(char)
        hash = hash | 0  # This is in the javascript code.

    hash = hash & 1023  # 1024 buckets

    return str(hash)


def makeChunkKeyFromInt(key: int) -> str:
    """ Make Chunk Key

    This is simple, and provides a reasonable distribution

    :param key:

    :return: chunkKey

    """

    if key is None:
        raise Exception("key is None")

    hash = key & 1023  # 1024 buckets

    return str(hash)
