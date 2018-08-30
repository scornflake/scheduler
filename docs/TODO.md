TODO
====
- PlanWizard doesn't work on android
    - text disappears when entering it
    - NEXT doesn't work on plan page (greyed out)
- Invites
    - Allow invites to users that do NOT have an account
        - User receives invite, downloads app, creates account and *immediately* joins that org.
            - This saves us creating an empty org for them
    - When a user accepts, there ends up being TWO copies of that user (old login and new?)
    - Itd be nice for the server to send links to the app, for people to download
- Scheduler should:
    - As a user, not overly concerned with the plan 'range', so prob don't need to show it
    - Allow me to quickly find when someone is on (Jo called mentioned dates, I went to the SS instead cos I could see it. Want to make my default action the app/site)
        - How do I enable key shortcuts? e.g: press S to show the search bar.
        - Cursor keys to move selection
    - Show me the number of weeks/events left in the schedule before it's end (e.g: 4 weeks left)
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
- It would be GREAT to:
    - after running tests
    - and auto-deploy; at least for the test environment.
- REST API.
    - Throttling.
    - Permissions
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
- Sheets
    - This app hasn't been verified by Google yet. Only proceed if you know and trust the developer.
- How to test all navigation possibilities?
    - Basically, how to do SOME kind of UI testing?

Future
======
- Replication / Token Refresh
    - If token refresh fails, we wont restart replication. Need some way for replication to restart if the token is OK in the future.
        - For now: Logout/Login
    - Get 'possible EventEmitter memory leak detected. 11 listeners added.' when using a very short token time (5s) on server, and restarting replication a couple of times



Awaiting Confirmation
=====================
- Prefs fails lookup, is nil, when logging in first time
    - Sometimes I login with a known user, with data, and see the wizard pages (no data!)  [done]
        - I think this was a race. Wasn't waiting for the data to be loaded.  [done]
    - Think we have to have a way to resolve late/out of order references [done]
        - Added ability to wait for data to arrive during resolution. Havn't seen bug again yet.



Performance / Deployment
========================
- scheduler-redis | 1:M 01 Jul 23:30:33.030 # WARNING you have Transparent Huge Pages (THP) support enabled in your kernel. This will create latency and memory usage issues with Redis. To fix this issue run the command 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' as root, and add it to your /etc/rc.local in order to retain the setting after a reboot. Redis must be restarted after THP is disabled.


Scheduling
===
- "Fills Slot":
    - Id like to have one electric guitar, but on some days two.
    - Could do this with 'Elec #1 / Elec #2' but don't always want *another* role.
    -
- Unavailable: often want to show that in a calendar view. Just to see it.
- Roles: when shown for an role, should be shown in role priority order.
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
  - **** changing the role on person, propagates, but 2nd client doesn't see the change in the UI. refresh works.
  - I think this is because ion-segments are very, very broken. Apparently this is fixed in Ionic4. Not going to address.
    - Plan name (a segment) doesn't update on main page, if the schedule name is changed on another device





Talking with Jeremy
====
- Role assignment to person when creating the team/people in the first place (two columns)?
    - Nope, not if we're removing teams?
- Clear the input field on 'new plan' when entering text
- When setting a date, it'd be nice to show a calendar
- Should warn of people that are not assigned to any role
- Tap to add role on the 'assignment details' header
- 'add person to plan' - should be a full screen selector, with selection checkboxes, search. (almost like a full 'people' page)
- Doesn't show scheduled stuff for a plan that's being created, and isn't selected
- Teams can be removed
    - Put Roles on Plan (so a plan only shows those roles)