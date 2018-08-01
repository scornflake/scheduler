How Auth works
===

- JWT, basically
- Any authenticated request can fail with a 401 'Unauthorized', which should trigger a token refresh, and if that fails, the login page
    - REST API calls
    - Pouch -> Couch replication
- The server implements additional token checks and a sliding window. Default token expiry is 15m, with refresh in 30 days (or thereabouts).
- There is no explicit refresh token. The original token is used (but there are additional checks in place to ensure a password change means you cannot use previous tokens as refresh tokens)


Login
=====

If online, the async lifecycle (startup) attempts to get the user profile.
If there's a valid token, that'll work. If it requires refresh, that'll happen.  So we use this to 'validate' the token.


Couch / Pouch
=============

Pouch (7) allows customization of the headers.
To do this (without errors) I had to remove the @types/pouchdb. Some reading showed that the @types aren't up to date anyway.
See the 'remoteCouchOptions' for a custom fetch handler, that both adds the required header for JWT, using the token from current state.

Retry is handled by the continuos replication method. As far as I can tell, an error stops replication.
We check for 401/unauthorized in the error handler, and fire a delegate if thats the case. We want for the delegate, and if it returns OK we restart replication.


REST API
========

Using HttpInterceptor (from @auth0/angular-jwt) and custom Refresh interceptor.
The token is stored in StateProvider.loginToken (which is persistent to local storage)
