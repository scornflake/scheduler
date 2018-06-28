TODO
====
- Offline. Close server. Get app to startup.
    - How to detect?
    - Cases:
        - Start app
            - Check tokens, if don't have, go to login/sign up, at this point MUST be online
            - If have, then:
                - if offline can't validate the token. Assume it's OK.
                - load pouch db.
                - do stuff. assume all is Ok.
                - Variant on this is that if we have the token, load immediately. Validation should occur in the background.
                    - If validation fails for real, ok, fault
                    - If it fails because of no connection, then shrug shoulders and continue
        - Using app
- Get sign in / reg lifecycle going (done?)
  - Don't auto sign in as me :)
  - The various pages should be nicer
    - replication starting (should have a nice indeterminate progress)
    - login, should fade to actual page
    - everything is too quick right now, and "waits" for data with a white page
- Sort out logout, stop hitting DB
    - Doesn't seem to be any more?
    - maybe a prob with menu, now solved?
- When creating account first time, receiving data, done - it doesn't select the first schedule.
    - I think even if you select the schedule, it doesn't show it.
    - This may be to do with a mobx error, that we see only on Safari.
- Daniel Gibbs 'avail' shows as nothing, doesn't pick up the 'Anytime'
- Daniel Gibbs: no email
- Add roles editing
- Add a way to add 'default roles'
- Remove 'pull to refresh' style action on home page (it doesn't do anything)
- If User is activated, but I deleted the Org, validation/login still seems to return OK (and the client then goes into an endless loop)
- Finish 'clone plan'
- Make it possible to specify period of the plan (days in between each) and what time it starts (e.g: 10am)
- DB isn't showing an up to date version of info. Should reload this on page reload?
- Add 'level' to Person, and write up about game-ifying the whole thing
- Make it so scheduler tells you if a required role isn't filled
- Building the docker containers
- It would be GREAT to have CI build the docker images (after running tests) and auto-deploy. At least for a test environment.
- Deploying the containers
    - making sure rqscheduler, rqworker are running
    - monitoring? couch? web? rq?
    - including, how to upgrade the stack?
- DB backups

Scheduling
===
- BUG: TryToScheduleWith will put you on with the other person, even if you're unavailable on that day.
- Unavailable: often want to show that in a calendar view. Just to see it.
- Roles: when shown for an assignment, should be shown in role priority order.
    - Currently for Cher, it shows Worship Leader after Keys. Should be other way around (to imply importance)
    - If there are roles with differing priority, this should be shown somehow (number, color?). Color could work if everyone in that role had that background color.
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


