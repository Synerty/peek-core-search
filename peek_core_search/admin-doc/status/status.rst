.. _search_admin_status:

======
Status
======

The Search compilers can be monitored from the **Status** tab on the Peek Admin UI.

The compilers are :

:Search Index (Keyword) Compiler: This compiler compiles the search keywords into
    the hash buckets.

:Search Object (Result) Compiler: This compiler compiles the search result objects
    into the hash buckets.

----

The labels have the following meaning :

:Is Running: Is the compiler running

:Queue Size: The number of chunks that the worker is currently compiling.

:Total Processed: The total number of chunks sent to the worker for compile,
    since the last Peek Server restart.

:Last Error: The last error for this compiler.

----

.. image:: status.png
