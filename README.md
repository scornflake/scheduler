# Scheduler of people: aka CunningPlan
Smart &amp; easy scheduling of teams and/or people within an organisation.
Born from having to sort out the schedules for a music team in a church setting. There *has* to be a better (faster!) way! And there is.

It takes the pain out of working out the plan. It'll handle all of the layout for you (including unavailability, preferred roles etc). It aims to do ~95% of your "grunt" scheduling work.

Still in its early stages as I work out if "it's a thing" or not.

How does it think?
==================

It's based on people being capable of one or more roles (not necessarily at the same time), with the ability to be in many roles and have a preference weighting across those roles e.g: I can do sound desk and play the sax. I want to play the sax 75% of the time.

Layout occurs in a mix of date & role priority. Roles have priorities, and layout always prefers higher priority roles first. e.g: if leaders have a higher priority than vocals, leaders are laid out first.

Generally it'll layout in date order. If you give it a 3 month range, it'll try to layout 3 months for each "group of roles with a priority" it comes across.

This has a side effect of giving people in higher priority roles the best pick of times. aka: somewhat preferential treatment.  For me, I want this. I want to protect those people putting in more work (leaders) and provide them the dates and/or availability choices that they ask for.

It will try to give people what they want. Example: In my case I'd prefer to be playing sax than on the sound desk.  I can give myself a weighting of "3" on sax and "1" on sound. The scheduling algorithm will do a pretty good job of achieving that over the life of the plan (I'll be put on sax 3 times out of 4).


What it does now:
=================
- Models people & their roles
- People can have 'unavailable' dates and ranges, e.g: I'm away on holiday on the 11th Jan. I'm away for June.
- People can have availability preferences, e.g: every 2 weeks, Every 2 out of 3 weeks, All the time.
- People can have weighted roles, e.g: I do bass and drums, but prefer to be on drums 80% of the time
- Grouped role layout. In our case I layout leaders first (that's one group), sound desk and computer next (another group) then everyone else.
- Has 'fairness' built in. If people are scheduled and can't make it, they are first in line next time the role comes up. In other words the algorithm isn't just round robbin, it's usage weighted (where usage = placement in a role on a date)
- Layouts are by role group, by date. e.g: Pick a role from a group, layout the entire role from start -> end. Pick the next role in that group, continue.
- Simplistic conditionals.
  - "if I am put in role 'worship leader' then also put me on vocals and acoustic guitar"
  - If I'm on worship, please also put on 'person Foo' in role 'Bar' (good for spouses!), at most "n" times per schedule (to be fair to everyone else)

