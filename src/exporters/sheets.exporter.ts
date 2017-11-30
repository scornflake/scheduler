// import {GoogleApis} from "googleapis";
// const google = new GoogleApis();

// let credentials = {
//     "installed": {
//         "client_id": "408727053187-4dllrmd0gl9c55v3p6h9td7obkqiqkl7.apps.googleusercontent.com",
//         "project_id": "scheduler-187021",
//         "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//         "token_uri": "https://accounts.google.com/o/oauth2/token",
//         "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//         "client_secret": "KFmTYtjRefxGuh0BwXh0OK9-",
//         "redirect_uris": [
//             "urn:ietf:wg:oauth:2.0:oob",
//             "http://localhost"
//         ]
//     }
// };

import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";

class GoogleSheetExporter {
    constructor(scheduler: ScheduleWithRules) {

    }

    write_to_sheet(sheet_name: string) {
        // let discovered = google.discovery.v1.discovery();
        // console.log("Discovered: " + discovered);
    }
}

export {
    GoogleSheetExporter
};