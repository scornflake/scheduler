TODO
====
- Prefs fails lookup, is nil, when logging in first time
    - Sometimes I login with a known user, with data, and see the wizard pages (no data!)
    - Think we have to have a way to resolve late/out of order references
- PlanWizard doesn't work on android
    - text disapears whn entering it
    - NEXT doesn't work on plan page (greyed out)
- As an admin:
    - I want to see a list of when people are on (on their 'person' page? on the plan page?)
- How to test all navigation possibilities?
- Scheduler should show the next coming date (not the first one)
    - show next, up to an including if next == today
- Login validation should show only if > 0 chars:
    - don't show 'email should be valid' if nothing typed in
    - don't show 'email should be valid' or 'password blah' until first 'login' is pressed
- No 'forgot password' function.
- Make it possible to specify:
    - period of the plan (days in between each);
    - What is the minimum period? Days? Hours?
    - and what time it starts (e.g: 10am)
- Make it so scheduler tells you if a required role isn't filled
    - Requires a role being 'required' (well, that's equal to min > 0)
- Invites
    - Itd be nice for the server to send links to the app, for people to download
    - Then when the user creates an account, it knows there's a pending invite and auto joins them to that org
- It would be GREAT to:
    - after running tests
    - and auto-deploy; at least for the test environment.
- REST API.
    - Throttling.
    - Permissions
    - Do users have to be logged in to access RoleSets?  No reason why not that I can think of, because they are not needed unless you have an account.
    - Check what is POST/PUT able. Reduce if necessary.
    - How do we enforce the exact same set of rules on the server, so data cannot be modified by malicious client?
        - **Especially**:
            - Access to other organization data
- Deploying the containers
    - monitoring???
    - including, how to upgrade the stack?
- Remove 'pull to refresh' style action on home page (ios only?) (it doesn't do anything)
- Add timezone/locale to the Profile
- Add 'level' to Person, and write up about game-ifying the whole thing
- Backups
    - DB (of production)
    - Per org?
- DB isn't showing an up to date version of info. Should reload this on page reload?

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
- Want to see why a spot is empty. If someone cannot be scheduled on, record that as well (so we can show that 'Foo not available because X')


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


