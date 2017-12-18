Administrator
=============

Schedule Dashboard
------------------
- Make it look nicer
  - I don't like the 'light red' for exclusion zones. I would prefer a blue line down the left hand side, which I think would convey this better.  Then I can light up more of the cell (better spacing) while still showing 'youre booked out over this time'.
  - Perhaps put a colour key there as well so people know what the colours mean
- Consider what a single user is going to want to see on a phone
  - the 'Person Edit' view I think
  - tap on individual schedule to see that row in more detail
  - maybe make that a list, with nice icon, and subdetails (like who else is on) so you can get most info you need by just looking at it.
  - will want to see whole thing at some point (scroll around it)


TODO:
-----
- Work out why mobx not updating in ng
  - It's not triggering a refresh of view when UIStore.selected_person is changed
  - Because *mobxAutorun turns OFF change detection. And expects a model change to fire a change to the 'view'. However; this doesn't happen because most of the stuff is computed.  I think perhaps I don't have enough stuff marked as @computed?
- Research GraphQL and see if pluggable into mobx.
- Work out possible hosting. Google? AWS? Cost?
  - Daniel had a nice idea. Static hosting via AWS. You just need the files.  The DB can be elsewhere.
  - Another idea is to docker it, and run it on my NAS (for now)
  - It would be GREAT to have CI build the docker images (after running tests) and auto-deploy. At least for a test environment.

- Persistence (is this going to be server-less? nope. need 'something' to serve HTTP/S)
- Make a login for me
- Just have one schedule, for now.
- Make it show that schedule, when public with no auth
- No footer (tabs) when not logged in
- No CSV button when not logged in
- Names cannot be edited when not logged in (in the PeopleEditor)
-




Users
-----

- Users / Authentication
  - Name
  - Roles
  - TXT number (for SMS notifications)
  - Email (for ... email!)
  - Last login date
- Organizations
  - Users
  - Roles
  - Allow an admin to enter users. (state = new)
  - Allow an admin to send bulk invites to all users they have entered (in state = invited)
  - Users have to confirm an email send before they become (state = active)
- Schedules (named, per organization but editable by users, publishable)
  - view permissions
  - edit permissions
- Registration, change password


Workflow
--------
At the moment there isn't one.
Change something, and a re-run could change the entire schedule.

This is fine for a draft.  When it's published, we want to make only minimal changes (we don't want to mess with dates we've sent out to people).

- A new schedule is in draft mode
- In draft mode nothing is locked in place.
- A schedule always has a public URL. A draft schedule would show "DRAFT" somewhere.
- When the leader is happy with the schedule, it is published.
- A published schedule is automatically locked.
- A published schedule can be unpublished. With confirmation warning! It reverts to draft mode.
- Published schedules can have minor modifications (dragging people around [which is a swap], adding unavailability [removes that person from schedule])


Statistics
----------
- Number of times rostered on
- Number of times rostered on, by role. Can be used to show people most active in a role.


Functions
---------

Notifications
- When a user logs in they can see notifications
  - Pending member unavailability notifications (action: takes that person off, send email/txt to confirm that's done)
  - Requests to swap with another member (action: swaps a person in a role, with another person of a role)

Ability to enter unavailability dates
- which should notify the worship leader, but not change the schedule yet
- when the leader says 'yes', the unavailability is scheduled (the person is just taken off that role I think, assuming the schedule is locked)

Ability to request a swap with someone else
- once confirmed swap that person/role only.
- what would happen?

Record practice times
- Press to start
- Press to stop
- Provide this info to the user as well. Gamify it. If they do more, up their level.
- Provide this feeback to the worship leader (they can see this set only).
- Provide overall feedback to the ministry leader

Provide a set. Song list and links
- List of songs, with various links
    - Link name (CCLI, YouTube, etc)
    - Link
    - Intended Tempo
    - Time (4/4, 6/8 etc)
    - Notes
- Provide a metronome usable as a click track
    - Ability for a user to re-order the set (drummer)
    - Let drummer change timing


Export
------
- Export to Google Sheets (temporary I think. If the schedule were available online, less need for this)
- Get it online!


Visual
------
- Lighten 'done dates'


Locking
-------

- Pin/Unpin the whole schedule
- Pin/Unpin people in roles, on a date
- Pin/Unpin whole dates
- Pin/Unpin people

