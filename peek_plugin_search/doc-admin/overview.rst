Overview
--------

The following sections describe the parts of the Search plugin.

There is only one silo of data in the search plugin, there are no model sets.
The search is intended to be a unified search across all of Peek.

Search Criteria
```````````````

Searches can be performed with the following criteria :

*   Whole keywords (partial is on the roadmap)

*   An object type, or all object types

*   The property name that contains the keyword, or all property names.

Importers
`````````

The Search indexes are populated by other plugins. Multiple plugins can import data
into the search index.

Objects
```````

An object is something that is found when a search returns.

When new objects are imported, that match existing objects, the new object properties
and object routes are merged with the existing ones.
This allows multiple plugins to import the same object, with their own routes.

For example, A diagram loader plugin may load the position of equipment,
by loading an object with a just a key, and the routes that position on the diagram.
While an equipment detail loader plugin loads in the more search terms for the object
(name, alias), and routes to show the equipment details on the DocDB plugin.

Object Types
~~~~~~~~~~~~

Objects have Object Types. These represent different object that can be found,
for example :

* Job

* Operation

* Incident

* Equipment


Object Properties
~~~~~~~~~~~~~~~~~

Objects are imported with a JSON like object of properties. It's these properties
(along with the object key) that are loaded into the keyword index.

Object Routes
~~~~~~~~~~~~~

An object represents something that is found in the search plugin,
Object Routes are like the locations where this object can be viewed in Peek.

When an object is found, the routes are also displayed, along with the route description,
such as "Open in Diagram", "Show Properties".

The names "Routes" comes from the Angular Route mechanism used in Peeks UIs.
Plugins loading routes into the search index can provide any URL they like,
in any format.

Keyword Index
`````````````

There are two indexes in the Search Plugin. The first is a keyword index.
This index follows the
`Peek Index Blueprint <https://bitbucket.org/synerty/peek-plugin-index-blueprint>`_

The Keyword Index maps whole keywords to Object IDs of objects that have that keyword.

Keywords are stored into one of 8192 hash buckets based on a hash of the keyword.
Hash Buckets are used to optimise client cache load times and provide offline support.

Object Index
````````````

The second index in the search plugin is the Object Index.
This index follows the
`Peek Index Blueprint <https://bitbucket.org/synerty/peek-plugin-index-blueprint>`_

Objects are hashed by their internal ID and stored into one of 8192 hash buckets.
Hash Buckets are used to optimise client cache load times and provide offline support.


Client Cache
````````````

The Search Plugin caches all data for the search plugin within the client.
This includes :

*   Object Type Names

*   Object Property Names

*   Keyword Index

*   Object Index

