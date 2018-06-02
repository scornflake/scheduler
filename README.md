# Scheduler of people
Smart &amp; easy scheduling of music teams and/or people within a church setting.

Basically it takes the pain out of working out the roster. It'll handle all of the layout for you (including unavailability etc). It'll do probably 95% of your scheduling work.

Born from having to schedule rosters for everyone in the music team at our church. There *has* to be a better (faster!) way! And there is.

Still in its early stages as I work out if "it's a thing" or not.

Currently I'm working on the scheduling algorithm. If it works out to not suck, I'll probably put an Ionic2 UI over the top.

So far, it's doing at least as good as my manual attempts. Its about a billion times quicker than I am :)

How does it think?
==================

It's based on people being capable of one or more roles, with the ability to be in many roles and have a preference weighting across those roles e.g: I can do sound desk and play the sax. I want to play the sax 75% of the time.

Layout occurs in a mix of date/role order. Roles have priorities, and layout always prefers higher priority roles first. e.g: if leaders have a higher priority than vocals, leaders are laid out first.

Generally it'll layout in date order. If you give it a 3 month range, it'll try to layout 3 months for each role it comes across.

This has a side effect of giving people in higher priority roles the best pick of times. aka: somewhat preferential treatment.  For me, I want this. I want to protect those people putting in more work (leaders).

It will try to give people what they want. In my case above I'd prefer to be playing sax than on the sound desk. It'll do a pretty good job of achieving that overall.


What it does now:
=================

- Models people & their roles
- People can have 'unavailable' dates, e.g: I'm away on holiday on the 11th Jan. I'm away for June.
- People can have availability preferences, e.g: every 2 weeks, Every 2 out of 3 weeks, All the time.
- People can have weighted roles, e.g: I do bass and drums, but prefer to be on drums 80% of the time
- Grouped role layout. In our case I layout leaders first (that's one group), sound desk and computer next (another group) then everyone else.
- Layouts are by role group, by date. e.g: Pick a role from a group, layout the entire role from start -> end. Pick the next role in that group, continue.
- Simplistic conditionals.
  - "if I am put in role 'worship leader' then also put me on vocals and acoustic guitar"
  - If I'm on worship, please also put on 'person Foo' in role 'Bar' (good for spouses!)
- Attempts fairness. People capable of a role are put into that role sequentially. If someone can't make it (unavailable, etc) then they are put on ASAP afterwards.



TODO:
- More UI
- [Scheduler](SCHEDULER.md) notes