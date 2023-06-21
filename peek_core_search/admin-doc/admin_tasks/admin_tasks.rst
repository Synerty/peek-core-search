Admin Tasks
-----------

This section describes how to perform administration tasks for the Search plugin.

General Settings
````````````````
To enable or disable the Search compilers:

#. Toggle the Compiler value to **True** or **False**.
#. Click **Save**.

.. image:: general_settings.png
    :align: center

Editing Search Object Types
```````````````````````````

The Object Types displayed to the user can be update via the admin UI.

To update the names:

#. Open the Peek Admin UI and navigate to the Search plugin.
#. Click on the **Edit Search Object Types** tab.
#. Enter the preferred name in the **Description** column.
#. Click **Save**.

.. image:: admin_task_update_object_type_name.png
    :align: center

To update the display order:

#. Open the Peek Admin UI and navigate to the Search plugin.
#. Click on the **Edit Search Object Types** tab.
#. Enter the preferred order to display the objects in the **Order** column.
#. Click **Save**.

.. image:: search_object_order.png
    :align: center

Updating Property Names
```````````````````````

The search property names displayed to the user can be update via the admin UI.
To update the names, follow this procedure:



#.  Open the Peek Admin UI and navigate to the Search plugin.
#.  Click on the **Edit Search Properties** tab
#.  Update the **Description** column.
#.  Click **Save**.

.. image:: admin_task_update_object_properties.png


Edit Exclude Search Terms
`````````````````````````

To add a keyword for the Search database to exclude:

#. Click **Add**.
#. Enter a keyword into the **Term** text box.
#. Select **Partial** to exclude any result containing the keyword.
#. Select **Full** to exclude only the keyword.
#. Add a **Comment** if required.
#. Click **Save**.


.. image:: exclude_keyword.png
    :align: center

To remove an excluded keyword:

#. Click the **Remove** button.

.. image:: remove_exclude.png
    :align: center

.. note:: You will need to recompile the search keyword index for keyword
    exclusion to take effect.

Recompile Keyword Index
```````````````````````

This admin task recompiles the search keyword index.

The keywords are stored in one of 8192 hash buckets.
Recompiling the index will rebuild these hash buckets.

.. note:: You should not expect to need to recompile the index.

#.  Stop all peek services.
#.  Execute the following ::


        -- Delete the existing index data.
        TRUNCATE TABLE core_search."SearchIndexCompilerQueue";
        TRUNCATE TABLE core_search."EncodedSearchIndexChunk";

        -- Queue the chunks for compiling.
        INSERT INTO core_search."SearchIndexCompilerQueue" ("chunkKey")
        SELECT DISTINCT  "chunkKey"
        FROM core_search."SearchIndex";


#.  Start all Peek services.


Recompile Object Index
``````````````````````

This admin task recompiles the search object index.

The object types are stored in one of 8192 hash buckets.
Recompiling the index will rebuild these hash buckets.

.. note:: You should not expect to need to recompile the index.

----

#.  Stop all peek services.
#.  Execute the following ::


        -- Delete the existing data.
        TRUNCATE TABLE core_search."SearchObjectCompilerQueue";
        TRUNCATE TABLE core_search."EncodedSearchObjectChunk";

        -- Queue the chunks for compiling.
        INSERT INTO core_search."SearchObjectCompilerQueue" ("chunkKey")
        SELECT DISTINCT  "chunkKey"
        FROM core_search."SearchObject";


#.  Start all Peek services.


