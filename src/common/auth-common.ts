const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
];

let credentials = {
    "installed":
        {
            "client_id": "323446159269-e3nf5h9l69uvbcmnm0ve8vfd03das5vq.apps.googleusercontent.com",
            "project_id": "role-scheduler",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://accounts.google.com/o/oauth2/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": "I5yPbU_NU2l43lqFatO-g_gu",
            "javascript_origins": [
                "http://localhost:8000"
            ]
        }
};

export {
    credentials,
    SCOPES,
    DISCOVERY_DOCS
}
