Administrator
=============

Schedule Dashboard
------------------
- Make it look nicer
- Consider what a single user is going to want to see on a phone
  - the 'Person Edit' view I think
  - tap on individual schedule to see that row in more detail
  - maybe make that a list, with nice icon, and subdetails (like who else is on) so you can get most info you need by just looking at it.
  - will want to see whole thing at some point (scroll around it)


TODO:
-----
- Work out why mobx not updating in ng
- Research GraphQL and see if pluggable into mobx.
- Work out possible hosting. Google? AWS? Cost?

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
- Organizations
  - Users
  - Roles
  - Allow an admin to enter users. (state = new)
  - Allow an admin to send bulk invites to all users they have entered (in state = invited)
  - Users have to confirm an email send before they become (state = active)
  - Last login date
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
  - This would include unavailability notifications (action: takes that person off)
  - Requests to swap with another member (action: swaps a person in a role, with another person of a role)

Ability to enter unavailability dates
- which should notify the worship leader, but not change the schedule yet
- when the leader says 'yes', the unavailability is scheduled (the person is just taken off that role I think, assuming the schedule is locked)

Ability to request a swap with someone else
- once confirmed swap that person/role only.
- what would happen


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

