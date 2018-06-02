///<reference path="./fix.broken.gapi.types.d.ts"/>
///<reference path="../../node_modules/@types/gapi.client.sheets/index.d.ts"/>
import {ApplicationRef, Injectable} from "@angular/core";
import {credentials, DISCOVERY_DOCS, SCOPES} from "./auth-common";
import {Observable} from "rxjs/Observable";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {Subject} from "rxjs/Subject";
import {fromPromise} from "rxjs/observable/fromPromise"

import * as _ from 'lodash';

import {Logger} from "ionic-logging-service";
import {formatDateForGoogleSpreadsheet} from "../scheduling/common/date-utils";
import {LoggingWrapper} from "./logging-wrapper";
import {ServerProvider} from "../providers/server/server";
import {RootStore} from "../store/root";
import {SavedState, UIStore} from "../store/UIState";
import Spreadsheet = gapi.client.sheets.Spreadsheet;
import Sheet = gapi.client.sheets.Sheet;
import ValueRange = gapi.client.sheets.ValueRange;

const API_KEY = "AIzaSyCVhzG0pEB1NfZsxpdPPon3XhEK4pctEYE";


@Injectable()
class GAPIS {
    private init_done: boolean;
    private callback: any;

    private logger: Logger;

    constructor(private rootStore: RootStore,
                private server: ServerProvider,
                private appRef: ApplicationRef) {
        this.logger = LoggingWrapper.getLogger("google");
    }

    init(callback = null) {
        this.logger.info("Loading GAPI...");
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
        // gapi.auth2.getAuthInstance().signIn();
        gapi.auth2.getAuthInstance().grantOfflineAccess().then(this.offlineAccess.bind(this));

    }

    offlineAccess(json) {
        const {code} = json;
        this.server.storeGoogleAccessCode(code).subscribe(r => {
            if (!r.ok) {
                this.logger.error(r.detail)
            } else {
                this.logger.info("Server stored and converted the one-time code to a token!");
            }
        })
    }

    signout() {
        if (!this.init_done) {
            this.init(this.signout);
            return;
        }
        gapi.auth2.getAuthInstance().signOut();
    }

    list_all_sheets(): Observable<any> {
        this.logger.info("Listing all sheets");
        let sheets_only = {
            q: "mimeType='application/vnd.google-apps.spreadsheet'"
        };
        return Observable.create((observable) => {
            gapi.client.drive.files.list(sheets_only).then((response) => {
                let files = response.result.files;
                // for(let file of files) {
                // this.logger.info("got: " + SafeJSON.stringify(file));
                observable.next(files);
                // }
                observable.complete();
            });
        });
    }

    private initClient() {
        this.logger.info("Initializing GAPI...");
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
        this.logger.info("Updating signed in state to: " + isSignedIn);
        let store = this.ui_store;
        store.signed_in_to_google = isSignedIn;
        this.appRef.tick();
    }

    private loadAuthentication() {
        this.logger.info("Loading Auth API...");
        gapi.load('client:auth2', this.loadDrive);
    }

    private loadDrive() {
        this.logger.info("Loading drive API...");
        gapi.client.load('drive', 'v3').then((v) => {
            this.loadSheets();
        });
    }

    private loadSheets() {
        this.logger.info("Loading sheets API...");
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
            this.logger.info("Loading spreadsheet with ID: " + sheet_id);
            if (sheet_id == null || sheet_id == "") {
                // throw new Error("No sheet");
                throw new Error("No sheet ID specified");
            }
            // Try to read this sheet to see if we can
            let request = {spreadsheetId: sheet_id, includeGridData: true};
            gapi.client.sheets.spreadsheets.get(request).then((result) => {
                // this.logger.info("Hey! We got the sheet! Awesome!");
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

    read_spreadsheet_data(spreadsheet: Spreadsheet, sheet: Sheet): Observable<Array<any>> {
        let promise = gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheet.spreadsheetId,
            range: this.range_for_sheet(sheet),
            includeGridData: true
        });

        return fromPromise(promise).map(v => {
            let result = v['result'];
            return result['values'];
        });
    }

    clear_and_write_schedule(spreadsheet: Spreadsheet, sheet: Sheet, schedule: ScheduleWithRules): Observable<number> {
        // Righteo. Lets do a batch update!
        let progressObservable = new Subject<number>();
        progressObservable.next(0);
        let num_format_rules = sheet.conditionalFormats ? sheet.conditionalFormats.length : 0;
        this.logger.info("Clearing sheet (with " + num_format_rules + " format rules)...");

        gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheet.spreadsheetId,
            range: this.range_for_sheet(sheet)
        }).then((clear_response) => {
            progressObservable.next(0.25);
            this.logger.info("Sending new data...");
            let fields = schedule.jsonFields();
            let rows = schedule.jsonResult().map(row => {
                // Want to remap this structure
                let new_row = [formatDateForGoogleSpreadsheet(row.date)];
                for (let field of fields) {
                    if (field.name == 'Date') continue;
                    let all_names = _.map(row[field.name], p => p.name);
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

            progressObservable.next(0.5);
            gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: spreadsheet.spreadsheetId,
                resource: {
                    valueInputOption: "USER_ENTERED",
                    data: data
                }
            }).then((r) => {
                progressObservable.next(0.66);
                this.logger.info("Updated all data. Formatting...");
                let requests = [];
                for (let index = num_format_rules - 1; index >= 0; index--) {
                    requests.push({
                            deleteConditionalFormatRule: {
                                sheetId: sheet.properties.sheetId,
                                index: 0
                            },
                        }
                    )
                }
                if (requests.length > 0) {
                    progressObservable.next(0.75);
                    gapi.client.sheets.spreadsheets.batchUpdate({
                        spreadsheetId: spreadsheet.spreadsheetId,
                        requests: requests
                    }).then(this.setConditionalFormats(spreadsheet, sheet, rows, fields, searchCondition, progressObservable));
                } else {
                    this.setConditionalFormats(spreadsheet, sheet, rows, fields, searchCondition, progressObservable);
                }
            })
        });
        return progressObservable;
    }

    private setConditionalFormats(spreadsheet: gapi.client.sheets.Spreadsheet, sheet: gapi.client.sheets.Sheet, rows: string[][], fields: any[], searchCondition: string, progressObservable: Subject<number>) {
        progressObservable.next(0.85);
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
                                    endRowIndex: rows.length + 1
                                }
                            ],
                            booleanRule: {
                                condition: {
                                    type: "CUSTOM_FORMULA",
                                    values: [
                                        {
                                            userEnteredValue: "=$A2<today()"
                                        }
                                    ]
                                },
                                format: {
                                    textFormat: {
                                        foregroundColor: {
                                            red: 0.2, green: 0.2, blue: 0.2
                                        },
                                    },
                                }
                            }
                        },
                        index: 0
                    }
                }
            ]
        }).then((v) => {
            progressObservable.next(0.95);
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
                                        endRowIndex: rows.length + 1,
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
                        },
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
                progressObservable.next(1.0);
                this.logger.info("Finished updating Google Sheet");
                progressObservable.complete();
            })
        });
    }
}


export {
    GAPIS
}