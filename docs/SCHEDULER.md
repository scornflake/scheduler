The Rethink (v2)
================

There's no chance in v1 to 'iterate to try other outcomes'
Depth first (by single role & date) fails because it doesn't take into account other roles the person might choose. So if it's possible to place someone in "vocal", it does so, ignoring other roles.
Breadth first is better, but it is hard to implement a weighted-role system... and it means you have to have *every role* on the same layout priority to have any chance at all.

How might weighted roles work?
------------------------------
#### Objects
- Roles
    - [done] Priority
    - [done] Has "pick" rules (used to pick the next person to fulfill this role), examples: "Usage Weighted Sequential", "Definitely on this Date"
    - [done] Priority could still be used to group roles together, or force a role to be laid out first (e.g: leaders)
- Person
    - has roles, role rules & placement rules.
    - Roles are just a list. Possibilities.
    - default rule might be "in sequence (round robbin)"
    - Alternative might be "Weighted: Sax 80%, Sound 20%"
    - Another "Weighted: Leader 90%, Guitar: 10%"
    - not on this date
    - not on this date range
- Placement
    - date
    - original role
    - actual role
    - rules used
- Pick Rules
    - Group of PickRule
- Pick Rule
    - execute(state):Person
- Role Rules
    - Group of RoleRule
    - execute(state):Role

#### Algorithm
- Iterate all dates, in order
- Initialize pick rules for all roles
- [done] Sort people by the max role layout priority they are in. This puts leaders, sound and computer guys first in the list (meaning they are chosen first)
- Choose the next role to look at (using existing role priority groups as a way to perform grouped layouts)
- Choose the next person using the pick rule for that role
- It would then try to re-pick the next role in which to place the person.
  - This is done with the role rules of the person.
  - Execute each active rule in priority order.
    - A rule returns a set of possible roles, in order. If no roles, can't place.
    - Input to the rule is the last ordered set of roles.
    - A rule can halt execution by returning no roles
- If the role differs, recurse (to place the person), then return and restart the process of placing someone in the role for the current date.
- If no role is returned, we cannot place the person. For now, we HAVE to go back, choose the NEXT person, and try again for this date. If no people can be found, only then do we move on.
- If a role is returned
  - trigger placement rules
  - record the placement reasoning (date, roles, all rules triggered)

Pick Rules
----------
Validation would be needed (can't have two Def on date rules for diff people on same date)
- Definitely on Date X (a high priority rule that overrides other pick rules)
- e.g: Usage Weighted Sequential
    - Thinking about layout of leaders. If a leader can't make it, they can be skipped. BUT we really want to use them next possible chance.
    - So the REAL "sequence" is usage based.
    - Each person in the list starts with a counter of 0.
    - As they are placed, the counter is incremented for them.
    - The people "order" is sort by count (asc), then by original index order.


This gives us access to the people that have been on the least.
But in an order where it's fair to all leaders (round robbin).

Role Rules
----------
- They have to have priority (so you know which to execute first)
- They might have enabled, disabled or a active date range (so you can pin people to teams)
- "Weighted: Sax 80%, Sound 20%"
- With X up to Y times (Never with X is just 'with X up to 0 times')
- Always with person Z in role Y (a way of pinning someone to a leader)
- Always with person Z (a way of pinning someone to someone else)

Placement Rules
---------------
Used when a person is placed into a position
- When placing in role Y, add roles Q,P

Example
-------
- Lay down all leaders
- This will leave some keys, vocal and guitar positions also filled
- Lay down Neil (sound, sax, with 80% sax weighting):
  - 1) lay down sax first (ranked the highest) - score is now { sax: 100%, sound: 0%)
  - 2) sound next, because sax >= weighting - score is now { sax: 50%, sound: 50%)
  - 3) sax next, because sax < weighting - score is now { sax: 66%, sound: 33%)
  - 4) sax next, because sax < weighting - score is now { sax: 75%, sound: 25%)
  - 5) sax next, because sax < weighting - score is now { sax: 80%, sound: 20%)
  - 6) sound next, because sax >= weighting - score is now { sax: 66%, sound: 33%)

Previously, we laid out a role fully. This didn't work because it stopped other roles from being fired (cos the person already had an exclusion zone).

This might work better because we are intentionally laying out a persons roles in full.



What happens if things are full and you can't?
----------------------------------------------
The above is really simple when the roster is empty.




Obstacles / TODO:
=================
- People placed first win, automatically (because the roster is less full, they are likely to get the spots).
  - this may be naturally what we want. We could in fact sort by 'leader, sound, computer ... rest' as a good alternative to role layout priority. *It's not about the role, it's about the person?*. Inherent favortism.
  - The person ordering could be modified by the interface, and run in that order. It'd let you play a bit (and show favortism to people).
- The existing 'layout priority' doesn't lend itself to anything other than "layout the leaders first". Anything split by layout priority means it's gets *total* preference.
- Roles might need a 'required' flag on them. In the case where we are trying to do weighted layout, but the role is required, we might choose it instead of whatever is 'correct' at the time.
- Have I an answer for "cherilyn would *like to have* X,Y,Z as vocalists"
- With the rule "With X up to Y times"
    - how do you evaluate it? You can't really until you have run the whole thing.
    - Do you then re-run it with additional exclusions for that person?
    - How do you make this part work?

Wondering about:
================
1. Placing leaders first. I think this works well. Placing their dependent roles is sensible.



Everything is rules?
====================

- Availability is a rule "place me once every 2 weeks"
- Unavailability is a rule "don't place me here"
- Don't pair me with X
- DOn't pair me with X more than Y times

Can the entire placement algorithm be expressed as rules?
It'd make extending it MUCH easier.



