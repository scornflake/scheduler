Opps
----

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

- Get the tests going. They don't run. Karma complains about a lack of a constructor. Gee this JS/transpiling is pretty .... "Crap-O"