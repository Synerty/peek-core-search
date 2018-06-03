import logging
import string
from collections import namedtuple
from datetime import datetime
from typing import List

import nltk
import pytz
from sqlalchemy import select

from peek_plugin_base.worker import CeleryDbConn
from peek_plugin_search._private.storage.SearchIndex import SearchIndex
from peek_plugin_search._private.storage.SearchIndexCompilerQueue import \
    SearchIndexCompilerQueue
from peek_plugin_search._private.worker.tasks._CalcChunkKey import makeChunkKeyFromString

logger = logging.getLogger(__name__)

ObjectToIndexTuple = namedtuple("ObjectToIndexTuple", ["id", "key", "props"])


def removeObjectIdsFromSearchIndex(deletedObjectIds: List[int]) -> None:
    pass


def reindexSearchObject(objectsToIndex: List[ObjectToIndexTuple]) -> None:
    """ Reindex Search Object

    :param objectsToIndex: Object To Index
    :returns:
    """

    searchIndexTable = SearchIndex.__table__
    queueTable = SearchIndexCompilerQueue.__table__

    startTime = datetime.now(pytz.utc)

    engine = CeleryDbConn.getDbEngine()
    conn = engine.connect()
    transaction = conn.begin()
    try:
        newSearchIndexes = []
        objectIds = []
        searchIndexChunksToQueue = set()

        for objectToIndex in objectsToIndex:
            newSearchIndexes.extend(_indexObject(objectToIndex))
            objectIds.append(objectToIndex.id)

        results = conn.execute(select(
            columns=[searchIndexTable.c.chunkKey],
            whereclause=searchIndexTable.c.objectId.in_(objectIds)
        ))

        newIdGen = CeleryDbConn.prefetchDeclarativeIds(SearchIndex, len(newSearchIndexes))

        for result in results:
            searchIndexChunksToQueue.add(result.chunkKey)

        for newSearchIndex in newSearchIndexes:
            newSearchIndex.id = next(newIdGen)
            searchIndexChunksToQueue.add(newSearchIndex.chunkKey)

        if objectIds:
            conn.execute(queueTable.delete(searchIndexTable.c.objectId.in_(objectIds)))

        if newSearchIndexes:
            inserts = [o.tupleToSqlaBulkInsertDict() for o in newSearchIndexes]
            conn.execute(searchIndexTable.insert(), inserts)

        if queueTable:
            conn.execute(queueTable.insert(), list(searchIndexChunksToQueue))

        if objectIds or newSearchIndexes or queueTable:
            transaction.commit()
        else:
            transaction.rollback()

        logger.debug("Inserted %s SearchIndex keywords in %s",
                     newSearchIndexes, (datetime.now(pytz.utc) - startTime))

    except:
        transaction.rollback()
        raise

    finally:
        conn.close()


stopwords = set()  # nltk.corpus.stopwords.words('english'))
stopwords.update(list(string.punctuation))

from nltk import PorterStemmer

stemmer = PorterStemmer()

# from nltk.stem import WordNetLemmatizer
#
# lemmatizer = WordNetLemmatizer()


def _indexObject(objectToIndex: ObjectToIndexTuple) -> List[SearchIndex]:
    """ Index Object

    This method creates  the "SearchIndex" objects to insert into the DB.

    Because our data is not news articles, we can skip some of the advanced
    natural language processing (NLP)

    We're going to be indexing things like unique IDs, job titles, and equipment names.
    We may add exclusions for nuisance words later on.

    """
    searchIndexes = []

    for propKey, text in objectToIndex.props.items():
        text = text.lower()
        tokens = set([stemmer.stem(w)
                      for w in nltk.word_tokenize(text)
                      if w not in stopwords])

        for token in tokens:
            indexItem = SearchIndex(
                chunkKey=makeChunkKeyFromString(token),
                keyword=token,
                propertyName=propKey,
                objectId=objectToIndex.id
            )
            searchIndexes.append(indexItem)

    return searchIndexes


if __name__ == '__main__':
    objectToIndex = ObjectToIndexTuple(
        id=1,
        key='COMP3453453J',
        props={
            'alias': 'AB1345XXX',
            'name': 'Hello, this is tokenising, strings string, child children'
        }
    )
    print(_indexObject(objectToIndex))
