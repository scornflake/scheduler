Thinking about Roles
=====
A named collection of permissions, defining what that person can do in that role.

- User
    - See their own data (profile, teams they are in, plans they are in, times they are on)
    - change their own data
        - e.g: I'm unavail on X.
- Organization Manager
    - Read/Write anything in this org
    - Cannot delete superusers. Cannot delete other managers.
    - Cannot demote privs for anyone equal to themselves (ie: can't revoke another managers Org privileges)
- Admin
    - can do anything



Policies
========

User
    - Can edit any data they own (Profile, Avail, Unavailability)
    - Can view teams they are a member of

Manager
    - Can create new teams, edit teams, and delete teams


Actions
=======
    - View
    - Edit
    - Delete
    - Change permission of user






Menus:
======
- People: visible to admins only.

Permissions:
============
- Teams
    - View, Add, Delete
- Plans
    - View, Add, Delete
- Menu (Menus can have permissions?)
    - View

Questions
=========
- Do we have a read only 'viewer' role?
- With permissions in place, how will we handle requests, i.e: User 'x' is now unavailable on 'y'?  Can't modify 'unavailable' on the user directly, as it needs to be confirmed by an admin
    - I think we end up having 'request' objects. Prob stored @ org level? Managers can see them, Users can see their own requests.
- How do we identify chain of command? user -> team manager -> admin.


Modelling in accesscontrol
==========================
https://onury.io/accesscontrol/?api=ac
- roles. e.g: ac.grant('manager').extend('user'). The arg to extend() can be a list as well.
- it can model attributed, permissions.  Think it'll do. But, how do we map it to our object model?





