Ponder
---

In redux, you'd have an immutable data store.
You'd subscribe to changes to that store, with rxjs.  You'd then receive a stream of updates to various values/leaves.
Also, you're subscribing to a path on a tree. You're NOT saying "Tell me when person X changes"

In mobx, you *use* data, and that usage gets tracked, such that the function USING it would get called.

I have a schedule.
Whenever that schedule is modified:
    - name changed
    - person unavailability changed
    - rule change
    - role changes
    - persons added/removed
    - dates changed
    ... and so on

I want a new person object to be emitted.
OR: I want to be able to subscribe to multiple points of the data model, and say "oi, I need to regen schedule".

That's a huge difference from by default monitoring every field of every object for a change.
It makes whatever monitoring is put in place explicit.

So I would ask for:
    schedule.start_date
    schedule.end_date
    schedule.people (add/remove)
    schedule.assignments.role_weightings (set)
    schedule.assignments.specific_roles (set)



I guess partly I have not got my head around:
- mobx expressions (because I don't use them in my UI)

