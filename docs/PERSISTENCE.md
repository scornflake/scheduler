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

