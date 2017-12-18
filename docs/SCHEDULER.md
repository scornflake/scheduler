The Rethink (v3)
================


Rules have:
- Conditions (done!)
- Actions (not done!)

I think the actions were normally supposed to affect engine state.
Hmm.  Wonder if I need to change anything?

No way to set special events
============================
Need a way to say "we're gonna do accoustic here", and setup a manual team.
Then I want the scheduler to flow around that date. Basically, just skip it and work around it.


Honouring a persons perferences can lead to gaps you don't want
===============================================================
e.g: daniel wants to be on bass sometimes. Yet this can lead to a gap where there's no one on drums..
Because: It has chosen daniel, seen that he wants to be on bass, figured "yep, it's about time" and put him on bass. BUT there' no one scheduled for drums.

Solution to be to take a 2nd pass that does a 'non optimal' rearrangement, whereby  you move people to other roles if those roles need to be filled.

We don't currently have a 'need to fill' flag. Could also do this with a role ordering (which we already have), but then how do you decide?  I think a role needs a flag 'required to be filled'.


Availability can lead to lean layouts
=====================================

You can run into a problem whereby a person may not be scheduled on for a role, because they are scheduled on for another.
e.g: Stuart Campbell scheduled on to worship lead (every 4 weeks)
The problem is that he's happy to play guitar more than that - just doesn't want to LEAD more than that.


Solutions:
1. Do nothing. Put Stuart in manually.
2. Make availability optionally role based.

This means that exclusions need to take into account the roles of overlaps.
e.g: if considering stuart, we might have:

- Available every 6 weeks for leading
- Available every 2 weeks to play


[done] People often play together
==========================

Anita pretty much always sings with Ralph.
A very strict version of this would be 'teams':
If using leader X, use these people for these roles.
This would be pretty simple to implement, as a leader specific thing. Harder if it's 'per person'.

Could be modelled on person, as rules (the placement rules).
- Rework the 'dependent' as a 'If I am placed in this role, I am also playing X, Y, Z'
- If I am placed in this role, I want people X in role Y with me (a list). Only works if there's room in the roles (thus leaders will win)



Avoidance
=========

Don't put person X on more than Y times with person Z.
This at the moment can only work with/for people in roles that have already been scheduled.
That is, while we stay with a one pass solution.



TODO v3
=======
- Exclusions should be turned into rules (and can then be part of 'next suitable person')