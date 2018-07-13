New user, messing about
---
- Requires internet connection to login first time and confirm an account
- Then, lets assume they do "stuff all (tm)" online from then on. Is this valid?
- They arent specifically wanting to associate with an org, cos they are trying the app
    - So is an Org out of the question?
    - Do we have one, but it's just "them"?
    - Saving, replicating data, etc?
    - I'm gonna go "yes": because they will likely want to fire it up on another device, and THAT requires replication



New user, recommended by someone else, wants to try it out
---
- So they have the app, the create an account
- The VERY NEXT THING that needs to happen is to get them associated to the other user, so they can be in that org, and replication can happen.
- I see 'accept invite' being a thing after registration.
  - enter invite code
  - that's enough to identify and join that use to the org, etc
  - (more needed here)
- But that could be skipped.
  - Add an Accept Invite to the menu.
  - Same COMPONENT (then I can share it on end-of-reg, and a new page).
  - It *prob* needs to check for data. Cos it'll need to delete everything, to make sure that this user doesn't end up replicating state from their own install, to a foreign org db.
  - It's really a "change organization" thing.
  - Ponder: make the client MULTI DB aware?  Then they can change between DBs.
    - So, multi org, would work, but entirely separate.



Outcomes
---
- A user has an organization when created, associated with themselves
- They can rename this organization at will.



Lifecycle TODO
----
- When creating a user, create an Org, and a DB. This can be part of registration.
  - The associated Org UUID is sent back, and this SHOULD be created on the client as part of registration.
  - Replication can begin at this time.
