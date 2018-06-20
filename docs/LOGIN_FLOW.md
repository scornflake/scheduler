Login flows:
 - App starts
 - Load the local DB.
Normal create-user flow:
 - No user, so go to login screen.
 - User clicks create account
 - Creates a new account on server. User has to verify their email first.
 - When verification succeeds, ask the server to create a DB for this users Organization
   - Server:
     - Create new DB on Couch, for this users Org.
     - Record this on the server Org?
     - Return the relevant details (DB name, for example) to the client
   - Creates a new Organization in the local DB
   - Creates a new Person in the local DB (for the just logged in person). This person has a UUID
     from the server (not generated by pouch).
   - Set logged in user
   - Start replication

Normal user-token-expired flow:
 - Find token expired. Go to login screen.
 - User authenticates OK.
 - Find that user (by UUID) in local DB. If not found ERRRRRRROR!!!! (Ask to sync?!?!)
 - Set logged in user
 - Start replication

Munge it for dev:
 - Login screen
 - Auth ok
 - If UUID doesn't match Server UUID:
   - Assume this user OK. Ram the UUID into the server's copy of this person.
   - Ask server to get or create the OrganizationDB.
   - Make sure the ID/URL/Path for that is in the Org.
   - Return org to user
 - Set logged in user
 - Start replication