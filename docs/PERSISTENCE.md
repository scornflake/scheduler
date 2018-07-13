After implementing my own DB/conversion/ORM thing
===

Goals
=====
1. Server side persistence of data [tick]
1. Simple server side. Wanting at this stage to keep all code on the client. Server is just data + notifications + events  [tick]
1. Keep client side objects, and methods. Typed.  [tick]
1. Simple OO interface to persistence in the client. I want to send/receive objects into the data provider without caring how that works, etc.  [tick]
1. Work Offline, sync later when reconnected   [tick]

Where we at?
---
- Can model object composition, references, lists of references, maps, maps with references keys
- Object change tracking
- Very simple in memory cache

What's missing?
---
- Deleting orphaned reference objects (I prob don't care atm)
    - Lets ponder a simple impl:
        - Or, not reinvent the wheel: https://en.wikipedia.org/wiki/Tracing_garbage_collection
- Preventing borkation of the model: aka Referential Integrity. e.g: you can delete a role, but there's zero ref integrity.
    - Main concern: can delete things like Roles, and truly break the model.
    - There are various ways to handle this automatically (ref tracking, etc), for now don't bother. Assume the app takes this on manually (in code).



------------------------------------------

Issues with replication
=======================

    - Had prob where by the app'd crash if:
        - load the model
        - UPDATE the model (e.h: change person's email address)
        - Clear app cache entirely
        - Reload DB from scratch

The reason was that the replication tries to resolve references as it goes. However; in the case of app startup
from fresh, the DB isn't entirely there yet. Couch delivers data in batches, and because the model was update (person in this case)
the data now comes out of order.  So, it's possible to have objects referring to other objects, that are NOT cached on the client side
yet, and are NOT in the local client DB. They exist, but only on the server.

This causes a null reference to be inserted where it shouldn't be.

Possible solutions
------------------
    1. Wait for replication to actually finish (but how do we know? maybe a single shot?)
        1. For the first time coming up, DONT resolve object references. Just populate the local stoe.
        1. When done, allow the store to load as per normal (e.g: loading the various types, in order, using the ORM).
    1. Trap exceptions and cause a reload of the entire store (seems nasty and heavyweight)
    1. Record exceptions and re-resolve after replication done? (seems complex)

The current implementation does the first option (pre-loads the DB using a non-live sync, so that all data is available before the ORM tries to lookup objects)




Other research
==============

Problems with any JSON approach
-------------------------------
  1. JSON and object mapping is still something that has to be handled in the client provider/service
  1. It forces a disconnect between data and code. Feels very non-OO. The data is easy to deal with, but it ain't connected to anything meaningful.


Problems with the GraphQL and/or mobx-state-tree approach.
----------------------------------------------------------
1. There is much repetition of models. We have:
  1. Server schema (this is OK)
  1. Client side model and methods (this is OK)
  1. GQL queries and fragments (meh, but required)
  1. Filling in paramters on CRUD operations from passed in objects (meh)
  1. Filling in data into client side model from GQL (meh)
  1. Updating existing in memory object graph (because of method call, or due to events from server)
  1. Handling 'new' objects on the client. Without UUID. Yet UUID is used to look up these objects in quite a bit of client code. The UUID is changed when the object is created for real on the server.
  1. Two client side caches (apollo + in memory object graph)
  1. Apollo deals in JSON and object mapping is still something that has to be handled in the client provider/service
