import {ApplicationRef, Injectable} from "@angular/core";
import {credentials, DISCOVERY_DOCS, SCOPES} from "./auth-common";
import {RootStore} from "../state/root";
import {Storage} from "@ionic/storage";
import {SavedState, UIStore} from "../state/UIState";
import {Observable} from "rxjs/Observable";
import {IReactionDisposer} from "mobx";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import Spreadsheet = gapi.client.sheets.Spreadsheet;
import Sheet = gapi.client.sheets.Sheet;
import ValueRange = gapi.client.sheets.ValueRange;
import * as _ from 'lodash';

const API_KEY = "AIzaSyCVhzG0pEB1NfZsxpdPPon3XhEK4pctEYE";

@Injectable()
class GAPIS {
    private init_done: boolean;
    private callback: any;
    private saving: IReactionDisposer;

    constructor(private rootStore: RootStore,
                private storage: Storage,
                private appRef: ApplicationRef) {
    }

    init(callback = null) {
        console.log("Loading GAPI...");
        this.callback = callback;

        this.initClient = this.initClient.bind(this);
        this.loadDrive = this.loadDrive.bind(this);
        this.updateSigninStatus = this.updateSigninStatus.bind(this);

        this.loadAuthentication();
    }

    authenticate() {
        if (!this.init_done) {
            this.init(this.authenticate);
            return;
        }
        gapi.auth2.getAuthInstance().signIn();
    }

    signout() {
        if (!this.init_done) {
            this.init(this.signout);
            return;
        }
        gapi.auth2.getAuthInstance().signOut();
    }

    list_all_sheets(): Observable<any> {
        console.log("Listing all sheets");
        let sheets_only = {
            q: "mimeType='application/vnd.google-apps.spreadsheet'"
        };
        return Observable.create((observable) => {
            let f = gapi.client;
            f.drive.files.list(sheets_only).then((response) => {
                let files = response.result.files;
                // for(let file of files) {
                // console.log("got: " + JSON.stringify(file));
                observable.next(files);
                // }
                observable.complete();
            });
        });
    }

    private initClient() {
        console.log("Initializing GAPI...");
        gapi.client.init({
            apiKey: API_KEY,
            clientId: credentials.installed.client_id,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES.join(" ")
        }).then(() => {
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus);

            // Handle the initial sign-in state.
            this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

            this.init_done = true;
            if (this.callback) {
                this.callback();
                this.callback = null;
            }
        });
    }

    private updateSigninStatus(isSignedIn: boolean) {
        console.log("Updating signed in state to: " + isSignedIn);
        this.ui_store.signed_in = isSignedIn;
        this.appRef.tick();
    }

    private loadAuthentication() {
        console.log("Loading Auth API...");
        gapi.load('client:auth2', this.loadDrive);
    }

    private loadDrive() {
        console.log("Loading drive API...");
        gapi.client.load('drive', 'v3').then((v) => {
            this.loadSheets();
        });
    }

    private loadSheets() {
        console.log("Loading sheets API...");
        gapi.client.load('sheets', 'v4').then((v) => {
            this.initClient();
        });
    }

    get state(): SavedState {
        return this.rootStore.state;
    }

    get ui_store(): UIStore {
        return this.rootStore.ui_store;
    }

    public load_sheet_with_id(sheet_id): Observable<Spreadsheet> {
        return Observable.create((observer) => {
            console.log("Loading spreadsheet with ID: " + sheet_id);
            if (sheet_id == null || sheet_id == "") {
                // throw new Error("No sheet");
                throw new Error("No sheet ID specified");
            }
            // Try to read this sheet to see if we can
            let request = {spreadsheetId: sheet_id, includeGridData: true};
            gapi.client.sheets.spreadsheets.get(request).then((result) => {
                // console.log("Hey! We got the sheet! Awesome!");
                observer.next(result.result);
                observer.complete();
            });
        });
    }

    range_for_sheet(s: Sheet, range?: string): string {
        if (!range) {
            return "'" + s.properties.title + "'";
        }
        return "'" + s.properties.title + "'!" + range;
    }

    clear_and_write_schedule(spreadsheet: Spreadsheet, sheet: Sheet, schedule: ScheduleWithRules) {
        // Righteo. Lets do a batch update!
        console.log("Clearing sheet...");
        gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheet.spreadsheetId,
            range: this.range_for_sheet(sheet)
        }).then((clear_response) => {
            console.log("Sending new data...");

            let fields = schedule.jsonFields();
            let rows = schedule.jsonResult().map(row => {
                // Want to remap this structure
                let new_row = [row.date.toDateString()];
                for (let field of fields) {
                    if (field == 'Date') continue;
                    let all_names = _.map(row[field], p => p.name);
                    new_row.push(_.join(all_names, ", "));
                }
                return new_row;
            });

            let data: ValueRange[] = [
                {
                    range: this.range_for_sheet(sheet, "1:1"),
                    values: [fields]
                }
            ];

            let row_index = 2;
            for (let r of rows) {
                data.push({
                    range: this.range_for_sheet(sheet, "" + row_index + ":" + row_index),
                    values: [r]
                });
                row_index++;
            }

            let searchRow = rows.length + 5;
            let searchCondition = "=and(search($B$" + searchRow + ",B2), len($B$" + searchRow + ")>0)";

            // Add in the Search Titles
            data.push({
                range: this.range_for_sheet(sheet, "B" + (searchRow - 1) + ":B" + (searchRow - 1)),
                values: [['Super Search!']]
            });
            data.push({
                range: this.range_for_sheet(sheet, "" + (searchRow) + ":" + (searchRow)),
                values: [['Enter name here:']]
            });

            gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: spreadsheet.spreadsheetId,
                resource: {
                    valueInputOption: "USER_ENTERED",
                    data: data
                }
            }).then((r) => {
                console.log("Updated all data. Formatting...");

                gapi.client.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: spreadsheet.spreadsheetId,
                    requests: [
                        {
                            addConditionalFormatRule: {
                                rule: {
                                    ranges: [
                                        {
                                            sheetId: sheet.properties.sheetId,
                                            startRowIndex: 1,
                                            endRowIndex: rows.length,
                                            startColumnIndex: 1,
                                            endColumnIndex: fields.length
                                        }
                                    ],
                                    booleanRule: {
                                        condition: {
                                            type: "CUSTOM_FORMULA",
                                            values: [
                                                {
                                                    userEnteredValue: searchCondition
                                                }
                                            ]
                                        },
                                        format: {
                                            textFormat: {
                                                foregroundColor: {
                                                    red: 1, green: 1, blue: 1
                                                },
                                            },
                                            backgroundColor: {
                                                red: 0.5, green: 0.6, blue: 0.2
                                            }
                                        }
                                    }
                                },
                                index: 0
                            }
                        },
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sheet.properties.sheetId,
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        textFormat: {
                                            bold: true
                                        }
                                    }
                                },
                                fields: "userEnteredFormat.textFormat.bold"
                            },
                        },
                        {
                            autoResizeDimensions: {
                                dimensions: {
                                    sheetId: sheet.properties.sheetId,
                                    dimension: "COLUMNS",
                                    startIndex: 0,
                                    endIndex: 20
                                }
                            }
                        }
                    ]
                }).then((r) => {
                    console.log("I did some nice formatting!");
                })
            })
        });


    }
}


export {
    GAPIS
}