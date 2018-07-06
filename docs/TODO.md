TODO
====
- Deleting a Team
    - not actually implemented (it never sends the delete to the server)
    - it isn't deleted from the other side (other clients)
- Do the Invite thing
    - Send invites to people (Share)
    - Allow people to accept, and move them to that organization
    - Reload the app?
- Serve the built www via something static (nginx?)
-
- Get sign in / reg lifecycle going (done?)
  - Don't auto sign in as me :)
  - The various pages:
    - login, should fade to actual page
- When creating account first time, receiving data, done - it doesn't select the first schedule.
    - I think even if you select the schedule, it doesn't show it.
    - This may be to do with a mobx error, that we see only on Safari.
- Daniel Gibbs 'avail' shows as nothing, doesn't pick up the 'Anytime'
- Daniel Gibbs: no email
- Couch doesn't save Config settings. Restart clears CORS/etc.
- Permissions on REST API.
    - Throttling.
    - Do users have to be logged in to access RoleSets?
    - Check what is POST/PUT able. Reduce if necessary.
- Add roles editing
- Add a way to add 'default roles'
    - these sets should come from the server [done]
    - should be available when adding roles, in the role editor (when the wizard isn't around)
- Why do the wizard 'slider' pages 'Jump (tm)' when you first show them?
- Remove 'pull to refresh' style action on home page (it doesn't do anything)
- If User is activated, but I deleted the Org, validation/login still seems to return OK (and the client then goes into an endless loop)
- Finish 'clone plan'
  - Then update     duplicate_plan(plan: Plan)
- Scheduler should show the next coming date (not the first one)
- Make it possible to specify period of the plan (days in between each) and what time it starts (e.g: 10am)
- DB isn't showing an up to date version of info. Should reload this on page reload?
- Add 'level' to Person, and write up about game-ifying the whole thing
- Make it so scheduler tells you if a required role isn't filled
- It would be GREAT to have CI build the docker images (after running tests) and auto-deploy. At least for a test environment.
- Deploying the containers
    - making sure rqscheduler, rqworker are running
    - monitoring? couch? web? rq?
    - including, how to upgrade the stack?
- DB backups

Performance / Deployment
========================
- scheduler-redis | 1:M 01 Jul 23:30:33.030 # WARNING you have Transparent Huge Pages (THP) support enabled in your kernel. This will create latency and memory usage issues with Redis. To fix this issue run the command 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' as root, and add it to your /etc/rc.local in order to retain the setting after a reboot. Redis must be restarted after THP is disabled.


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


