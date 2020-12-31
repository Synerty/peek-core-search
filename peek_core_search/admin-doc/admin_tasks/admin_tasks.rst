Admin Tasks
-----------

This section describes how to perform administration tasks for the Document DB plugin.


Updating Object Type Names
``````````````````````````

The search object type names displayed to the user can be update via the admin UI.
To update the names, follow this procedure:

----

#.  Open the Peek Admin UI and navigate to the Search plugin.

#.  Click on the **Edit Search Object Types** tab

#.  Update the **Description** column.

#.  Click save.

.. image:: admin_task_update_object_type_name.png

----

The user will see the updated search object type name when next they view the search.


Updating Property Names
```````````````````````

The search property names displayed to the user can be update via the admin UI.
To update the names, follow this procedure:

----

#.  Open the Peek Admin UI and navigate to the Search plugin.

#.  Click on the **Edit Search Properties** tab

#.  Update the **Description** column.

#.  Click save.

.. image:: admin_task_update_object_properties.png

----

The user will see the updated search property names when next they view the search.

Recompile Keyword Index
```````````````````````

This admin task recompiles the search keyword index.

The keywords are stored in one of 8192 hash buckets.
Recompiling the index will rebuild these hash buckets.

.. note:: You should not expect to need to recompile the index.

----

#.  Stop all peek services

#.  Execute the following ::


        -- Delete the existing index data.
        TRUNCATE TABLE pl_search."SearchIndexCompilerQueue";
        TRUNCATE TABLE pl_search."EncodedSearchIndexChunk";

        -- Queue the chunks for compiling.
        INSERT INTO pl_search."SearchIndexCompilerQueue" ("chunkKey")
        SELECT DISTINCT  "chunkKey"
        FROM pl_search."SearchIndex";


#.  Start all Peek services

----

Peek will now rebuild the keyword index.

Recompile Object Index
``````````````````````

This admin task recompiles the search object index.

The object types are stored in one of 8192 hash buckets.
Recompiling the index will rebuild these hash buckets.

.. note:: You should not expect to need to recompile the index.

----

#.  Stop all peek services

#.  Execute the following ::


        -- Delete the existing data.
        TRUNCATE TABLE pl_search."SearchObjectCompilerQueue";
        TRUNCATE TABLE pl_search."EncodedSearchObjectChunk";

        -- Queue the chunks for compiling.
        INSERT INTO pl_search."SearchObjectCompilerQueue" ("chunkKey")
        SELECT DISTINCT  "chunkKey"
        FROM pl_search."SearchObject";


#.  Start all Peek services

----

Peek will now rebuild the object index.

