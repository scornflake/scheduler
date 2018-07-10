Roles
=====
A named collection of permissions, defining what that person can do in the role.
We have I think:
- User
    - see their own data
    - change their own data
    - see data they are associated with (i.e: teams and or plans)
    - can make requests, i.e: I'm unavail on X.
- Team Manager (manage the team, change plans made using the team, add new plans, remove owned plans)
    - inherits user
    - cannot change plans or teams they are not a manager for
    - there could be many team managers.
- Admin (can do anything)







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





