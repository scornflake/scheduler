The Rethink (v3)
================


Rules have:
- Conditions (done!)
- Actions (not done!)

I think the actions were normally supposed to affect engine state.
Hmm.  Wonder if I need to change anything?

Themes, Speaker/Preacher
========================
A way to have user created columns, for the schedule.
 - These are filled later manually.
 - These columns can be moved in order, to appear whereever the user wants

##### Hmm
 - In doing this, I discovered that I want notes on roles to be persistent across schedule reconstructions.
   - This kinda implies that construction is overlaid onto a parent object.
   - i.e: the schedule exists, has notes on it, manually entered stuff (like special events) and then the scheduler works around those.
   - or; the notes are persistent, and applied to the schedule before the generation is performed? So they become fixed in place FIRST?


##### Want a way to have a blank sheet
As part of themes, speakers, user cells...
- Probably want to be able to have a sheet with the dates, but empty.
- This would let us setup the schedule, enter manual stuff, and THEN generate over the top of it.
  - Do dates first. Can do this and generate empty ScheduleForDate objects.
  - Store notes separate from the schedule
  - Choice:
    - Either populate the notes into the schedule; or
    - When generating it for render, pull notes first, leaving schedule alone...


##### Might be in for a restructure
- The root schedule object doesn't store state
  - Means we cannot store notes at the moment
- When rendering, we're doing 'json stuff', not really rendering the rows via object calls.
  - This makes it harder to detect changes in the object model.
  - It would be (maybe) nicer to ask the schedule: get_value_for(date, role), rather than doing this in the view. That way the scheduler can return text/schedule info as it sees fit.


[done] Flexibile Availability
======================
I would like to be on every month or so, but prefer to be on with Cherilyn.
The fairness scheduler might put me on according to preference, but cannot 'shift' my dates according to team preference.
Options:
- Allow a 2nd pass, to 'shift' schedules dates to closes preference match.
  - Tempting but unsure what rabbit hole this opens up.  Works for me, but if I do if for others? What mess is created?
  - Going with this option as it's the simplest to implement.
- Model this preference as part of availability. That works, except 'exclusion zones' are currently separate state and taken into account *before availability*. So even if done, I have to modify exclusion zones somehow.

I did this April 2018 by allowing people to be shifted by some amount.
It's crude, but works for the case I had in mind. Will leave it this way until it breaks.


No way to set special events
============================
Need a way to say "we're gonna do an accoustic set here", and setup a manual team.
 - I want the scheduler to flow around that date. Basically, just skip it and work around it.
 - This should be doable when the schedule is in draft mode, or when it's published.
 - It should count people's usage as well (so that weights, and N out of M rules work).




Wiki Manual
===========
I like what spirit did, with the Wiki, that'd be a good idea for this.

Fairness should be optional?
============================
Could make that usage weighted fairness optional?
That way you can have the round robin without the usage weighting.


Honouring a persons perferences can lead to gaps you don't want
===============================================================
e.g: daniel wants to be on bass sometimes. Yet this can lead to a gap where there's no one on drums.
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