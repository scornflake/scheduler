TODO
====
- Get sign in / reg lifecycle going (done?)
  - Don't auto sign in as me :)
- Sort out logout, stop hitting DB
    - Doesn't seem to be any more?
    - maybe a prob with menu, now solved?
- When creating account first time, receiving data, done - it doesn't select the first schedule.
    - I think even if you select the schedule, it doesn't show it.
    - This may be to do with a mobx error, that we see only on Safari.
- When restoring a lot of state, the schedule is kicked off. That's kinda bad.
    - We want to delay the schedule computation until the incoming state change is done.
    - Incoming is processed in batches. How do we know when we're done?
    - Maaaaaye: I think actions are supposed to take care of this. and 'convert_docs_to_objects_and_store_in_cache' is an @action.

- Remove 'pull to refresh' style action on home page (it doesn't do anything)
- Offline. Close server. Get app to startup.
- If User is activated, but I deleted the Org, validation/login still seems to return OK (and the client then goes into an endless loop)
- Make it so scheduler tells you if a required role isn't filled
- Finish 'clone plan'
- Work out possible hosting. Google? AWS? Cost?
  - It would be GREAT to have CI build the docker images (after running tests) and auto-deploy. At least for a test environment.
- Make it possible to specify period of the plan (days in between each) and what time it starts (e.g: 10am)
- DB isn't showing an up to date version of info. Should reload this on page reload?
- Add 'level' to Person, and write up about game-ifying the whole thing

Scheduling
===
- BUG: TryToScheduleWith will put you on with the other person, even if you're unavailable on that day.

Layout
===

iPad
--
- Dashboard:
    - could show the selected plan date range, rather than 'dashboard'
    - why is the '2nd line' there? Supposed to be visible only on the phone.


What is known to be broken
====
- Sync
  - **** changing the assignment on person, propagates, but 2nd client doesn't see the change in the UI. refresh works.
  - I think this is bauise ion-segments are very, very broken. Apparently this is fixed in Ionic4. Not going to address.


