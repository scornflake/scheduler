For schedule:
 * Every sunday. Every N days. 3rd sat of month, etc.

For people:
 * Preferred regularity: every 3 weeks, etc. With strict, or flexible option. Strict would mean "don't move / can't move". Flexible would mean we can move around a bit.
 * Preferred leader (strict or flexible): name of someone in a leader role
 * Slip override: override global aggressiveness, if strict == false
 * Fill override: override global fill aggressiveness, if strict == false
 * Either:
 ** Alternate between these roles; or
 ** Role preference (if more than 2)

For roles:
 * Layout priority. i.e: Leaders first. Their dates must be right. Then drums, then vocals, etc.  The idea being that laying out some roles (leaders) has major impact on others (drums)

For scheduling:
 * Slip aggressiveness: 0 = adhere to people's wishes. 1 = allow 1 week distance slip. 2 = 2 weeks. 
 * Repeat/Fill aggressiveness: 0 = adhere to peoples wishes. 1 = allow one fill in persons preferred regularity. 2 = allow 2 fills, etc.

For dates:
 * Specific leader. i.e: youth service led by J.  Scheduling then flows around these fixed dates.

Functions:
 * Swap. Intentionally swap people out.  Someone 'out' has optionally someone 'replacing' them, and may optionally 'stand in' for them.

Extra: 
 * Unsure if practical, but it'd be nice to know WHY a certain person is placed where they are: e.g: every 3 weeks, can't do day X so swapped with person Y (like a hover tool tip)

Runtime:
 * When playing a person: may need an idea of _layout weight, score, roster weight_. This is how much they have already been laid out, expressed as a %age of their rules
  * a person on once in a month, with a rule: "once every 4 weeks", is at 1.0
  * a person on once a month with no rules is at 0.25
  * *Method 1:* Can we use averages? (nope):
    * one period = one week 
    * number of times a person appears in the roster / (rule in periods * roster duration in periods) = weight
    * *this fails.* Because I could place the person 4 times in a row, over a 4 month period, and weight would be 1.0 but the rule would fail.
  * *Method 2:* Rule based 'exclusion zones'
    * "every 4 weeks" is the key phrase here.
    * It means we can place them, but then _not place them for the duration of that rule._  Put another way, the rule introduces an _exclusion zone_ for this person, for 4 weeks.  
    * the nice thing about that idea, is that 'unavailability' can be expressed as an exclusion zone covering that day.
    * Rule examples:
      * fortnightly
      * weekly
      * anytime (meaning: no exclusion zones)
      * once every 4 weeks
    * This implies the most granular placement is *once per week.*

*Unanswered:*
 * What happens if roles have same priority?  i.e: sound / media? how do we ping pong people?

Algorithm
=========

1. Sort roles by layout priority
1. Lay down by role, then person
1. For each role:
  1. Iterate over the schedule dates, for this role
    1. Find the next free person (people in the role, who are not excluded from this date)
    1. Place the 'next free person' at the this date.  If no free people, skip this date for now.
    1. Evaluate the rules for this person and placement date, which creates scheduling exclusion zones for this person

Notes
=====

1. How are we going to handle CRUD? The reducers are quite painful in this regard. There is redux-clerk, havn't tried it yet.
  1. Roles
1. Got to the point of laying out a single person across a date range. This begins to get into the algorithm, at which point I realized I don't have roles etc (all the inputs) defined. Which led me to thinking about CRUD.  However; we've only got ... Roles and People? So, do I need to care?