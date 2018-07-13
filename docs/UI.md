Administrator
=============

Schedule Dashboard
------------------
- Make it look nicer
  - I don't like the 'light red' for exclusion zones. I would prefer a blue line down the left hand side, which I think would convey this better.  Then I can light up more of the cell (better spacing) while still showing 'youre booked out over this time'.
  - Perhaps put a colour key there as well so people know what the colours mean


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
- which should notify the worship leader (after a cooling down period, say 15m). The draft schedule can be updated.
  - if the date is for an existing schedule, admin needs to take manual action

Manual Editing
- allow admin to manually change a schedule
  - add someone on a role
  - remove someone from a role
  - swap people around

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



Locking
-------

- Pin/Unpin the whole schedule
- Pin/Unpin people in roles, on a date
- Pin/Unpin whole dates
- Pin/Unpin people


Data Model
-----

All data is stored by Organization.

- Users / Authentication
  - Name
  - TXT number (for SMS notifications)
  - Email (for ... email!)
  - Last login date
- Roles
- Teams
- People
