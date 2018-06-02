Opps
----

Beginning of June - after the big-refactor:
-----
- Ordering on the screen is now incorrect, because roles at the same layout priority are executed out of order now (well, not in the same order they were ADDED to the roles list, like they were before). This is because roles are now derived from the people, so there's no real way to know which order they will be.
    - Grouping is still really important, as whole groups (things with same layout priority) are still executed in order. e.g: all of group 12 is done before all of group 11, etc.
    - Add a way to order within a group (maybe allow string based layout priority **multipart X.Y.Z?)
- Movement of people ('Try' rules) aren't working. I'm not being moved from my computed 'Sax' positions. Dunno why yet.
- Need 'teams', groups of people. Services run with people from a 'team'.
- Technically the service should have roles defined on it. It's the entity that has those needs.  Currently roles are global, and 'appear' on a service based on people being given those roles once added to the service. This means there's no way to say "can we fulfull this services needs?" - cos we can't define roles ahead of time.
    - That would also mean it'd be possible to add roles for one service, if needed (like 'acrobat'!)

End of April 2018
---
- Login takes you to home, which DOES NOT generate a schedule. Idea was to begin adding schedules on the server side (even if generated on client) and add a dropdown or some other kind of schedule selection to the UI.
- Was also thinking to add saved schedule snapshots to be used with a schedule that is in 'draft mode', so that the snapshot didn't have to be read from google spreadsheets for every generation.
- Had *great* trouble getting tests to run, failed at karma-typescript. Original karma worked but it exceedingly slow to compile.


Other (as I refactored)
---

- Email is on ScheduledUser. Opps. Should be on person, then scheduled user references person to check it, otherwise we can't have people with email addresses who can't login (possible for initial setup)


- We model user/person on the server, but don't do this on the client.
  So we don't yet have a sensible place to put the login info returned by the server.


- Two logins. One account, then the google stuff. We prob need to begin storing the google tokens as part of the user profile so they can be used by he UI. The UI would need to then persist these on the server.
  - Have token on server for the user. Done.
  - Allow a client to auth to google. I think that auth can be restored automatically (via GAPI).
  - Snapshots and such could be taken by the client, processed, and stored on the server so the client doesn't ALWAYS have to process them

