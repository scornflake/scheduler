Application Server
===
- https / rest

Couch
===
Need to:
- Create databases (from the app server)
- Restrict certain DB's to people in the owning organization.
  - Meaning if a user attempts to replicate to a DB, they can do so only if they are allowed.


Roles & Permissions on the App
===

v1
--
- User
  - Access to:
    - Profile
    - Dashboard
    - About
    - Logout
- Admin
  - Access to:
    - All of Users
    - Teams, People, Roles, Plans
- Dev
  - Db Maint


v2
--
Team based permission?
Groups?



Out of this comes:
- Need to propagate 'people' to the app server, if that app server is going to handle roles & permissions.
-