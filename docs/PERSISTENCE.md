After implementing my own DB/conversion/ORM thing
===

Where we at?
--
- Can model object composition, references, lists of references, maps, maps with references keys
- Object change tracking
- Very simple in memory cache

What's missing?
--
- Deleting orphaned reference objects (I prob don't care atm)
    - Lets ponder a simple impl:
        - Or, not reinvent the wheel: https://en.wikipedia.org/wiki/Tracing_garbage_collection
- Preventing borkation of the model. referential integrity. e.g: you can delete a role, but there's zero ref integrity.
    - Main concern: can delete things like Roles, and truly break the model.
    - How to fix:
        - All OWUID's are stored in the cache.  Turn this into a poor-mans weak-ref
        - 'set' increments the counter
        - 'unset' decrements the counter
        - when counter == 0, the object may be removed (perhaps as part of some other operation)
        - Some types of object could be marked as 'not weak?'
    - How does this work in practice?
        - In JS, you assign to a member. We don't know that the old is going away (can't call 'unset' on cache).
        - Does that obj happen to have 'not being observed' called on it?
        - blah blah blah (is this solving ref. integrity?!)


Ref Integrity:
----
- Manual?  Don't delete roles?
    - Possible. I *could* put in the manager (or root store) code to check various lists, objects etc before allowing
        - Simple
        - Would work
        - Not very scalable, but who cares?






-------------------------------------------


Goals
=====
1. Server side persistence of data
1. Simple server side. Wanting at this stage to keep all code on the client. Server is just data + notifications + events
1. Keep client side objects, and methods. Typed.
1. Simple OO interface to persistence in the client. I want to send/receive objects into the data provider without caring how that works, etc.

Goals 2
=======
- Work Offline, sync later when reconnected (implies pouch really, doesn't it?)
    - Except pouch make it REALLY hard to model relations, like "this is is part of many orgs data"

Problems
========
1. There is much repetition of models. We have:
  1. Server schema (this is OK)
  1. Client side model and methods (this is OK)
  1. GQL queries and fragments (meh, but required)
  1. Filling in paramters on CRUD operations from passed in objects (meh)
  1. Filling in data into client side model from GQL (meh)
  1. Updating existing in memory object graph (because of method call, or due to events from server)
  1. Handling 'new' objects on the client. Without UUID. Yet UUID is used to look up these objects in quite a bit of client code. The UUID is changed when the object is created for real on the server.
  1. Two client side caches (apollo + in memory object graph)


TODO
---
1. Can mutations create & update across object relationships?
1. Wouldn't it be nice if Apollo could instantiate objects instead of just dicts?

Thoughts
---
1. CRUD methods return Observers
1. Each object has a fragment that fully defines its fields. This could be used during create/update to always set/return the right fields for an object.

Hmm. Provide should update mobx.
================================
1. Rather than feeding back real objects... should the data provider instead talk to the MOBX store, creating/updating it using *exactly the same API* as the client, then returning the object/s in question from that store, rather than creating them itself?
  1. This seems like a good idea, and keeps the mobx store as the source of all truth.
  1. Maybe there's a way to hook to the store and do these updates (writes) automatically?
  1. Also, it would mean the UI would update automatically when we receive a server event, and update the store.

Create
------
- Always takes client side objects
- Map properties to a GQL mutation
- Map response back to the same object, return that object in observable

