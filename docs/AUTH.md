sooo...

Ideally:

- Any authenticated request can fail to either get/refresh a token, and trigger a login page
    - REST
    - Couch


Alternative:
- Periodically refresh token while app active
- If coming back from sleep (native iOS app etc), always start again, ensure token OK, so that we don't have to build same logic into Pouch
- Don't like this idea THAT much as it seems could fail if order is wrong at any time
