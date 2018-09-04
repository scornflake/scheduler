///<reference path="./fix.broken.gapi.types.d.ts"/>
///<reference path="../../node_modules/@types/gapi.client.sheets/index.d.ts"/>
import {ApplicationRef, Injectable} from "@angular/core";
import {credentials, DISCOVERY_DOCS, SCOPES} from "./auth-common";
import {Observable} from "rxjs/Observable";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {Subject} from "rxjs/Subject";
import {fromPromise} from "rxjs/observable/fromPromise"

import * as _ from 'lodash';
import {formatDateForGoogleSpreadsheet} from "../scheduling/common/date-utils";
import {RootStore} from "../store/root";
import {UIStore} from "../store/UIState";
import {Preferences} from "../scheduling/people";
import {action, computed} from "mobx-angular";
import {BehaviorSubject, ReplaySubject} from "rxjs";
import {flatMap} from "rxjs/operators";
import {Logger, LoggingService} from "ionic-logging-service";
import {of} from "rxjs/observable/of";
import {autorun, trace} from "mobx";
import {SWBSafeJSON} from "./json/safe-stringify";
import {PageUtils} from "../pages/page-utils";
import Spreadsheet = gapi.client.sheets.Spreadsheet;
import Sheet = gapi.client.sheets.Sheet;
import ValueRange = gapi.client.sheets.ValueRange;

const API_KEY = "AIzaSyCVhzG0pEB1NfZsxpdPPon3XhEK4pctEYE";


@Injectable()
class GAPIS {
    ready$: Subject<boolean>;
    selectedSheet$: Subject<Spreadsheet>;

    progress: Subject<number>;
    private logger: Logger;

    constructor(private rootStore: RootStore,
                private logSvc: LoggingService,
                private pageUtils: PageUtils,
                private appRef: ApplicationRef) {

        this.ready$ = new BehaviorSubject(false);
        this.selectedSheet$ = new ReplaySubject(1);
        this.progress = new BehaviorSubject(0);
        this.logger = this.logSvc.getLogger('google');

        this.logger.info("ngOnInit", "Loading GAPI...");

        this.initClient = this.initClient.bind(this);
        this.loadDrive = this.loadDrive.bind(this);
        this.updateSigninStatus = this.updateSigninStatus.bind(this);

        this.loadAuthentication();
    }

    private listenForChangesToSelectedSheet() {
        autorun(() => {
            trace();
            if (this.state) {
                if (this.state.google_sheet_id === undefined || this.state.google_sheet_id === null) {
                    this.logger.warn("listenForChangesToSelectedSheet", `No sheet selected. Setting selected sheet to null`);
                    this.selectedSheet$.next(null)
                } else {
                    this.logger.warn("listenForChangesToSelectedSheet", `Get selected sheet`);
                    this.load_sheet_with_id(this.state.google_sheet_id).subscribe((n) => {
                        this.selectedSheet$.next(n);
                    }, (err) => {
                        this.selectedSheet$.next(null)
                    });
                }
            }
        })
    }

    authenticate() {
        return this.ready$.pipe(
            flatMap(() => {
                    this.logger.info("authenticate", `Begin auth`);
                    return gapi.auth2.getAuthInstance().signIn();
                }
            ));
    }

    signout() {
        return this.ready$.pipe(
            flatMap(() => {
                    this.logger.info("signout", `Signing out`);
                    return gapi.auth2.getAuthInstance().disconnect()
                }
            ));
    }

    list_all_sheets(): Observable<any> {
        this.logger.info("list_all_sheets", "Listing all sheets");
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
        this.logger.info("initClient", "Initializing GAPI...");
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

            this.logger.info("initClient", "Initializing GAPI complete");
            try {
                this.listenForChangesToSelectedSheet();
            } catch(err) {
                console.error(`error while doing listenForChangesToSelectedSheet, ${SWBSafeJSON.stringify(err)}`)
            }
            this.pageUtils.executeInZone(() => {
                this.ready$.next(true);
            });
        });
    }

    @computed get isSignedInToGoogle(): boolean {
        let store = this.ui_store;
        return store.signed_in_to_google;
    }

    @action
    private updateSigninStatus(isSignedIn: boolean) {
        this.logger.info("updateSigninStatus", "Updating signed in state to: " + isSignedIn);
        let store = this.ui_store;
        store.signed_in_to_google = isSignedIn;
        this.appRef.tick();
    }

    private loadAuthentication() {
        this.logger.info("loadAuthentication", "Loading Auth API...");
        gapi.load('client:auth2', this.loadDrive);
    }

    private loadDrive() {
        this.logger.info("loadDrive", "Loading drive API...");
        gapi.client.load('drive', 'v3').then((v) => {
            this.loadSheets();
        });
    }

    private loadSheets() {
        this.logger.info("loadSheets", "Loading sheets API...");
        gapi.client.load('sheets', 'v4').then(() => {
            this.initClient();
        });
    }

    @computed get state(): Preferences {
        if (!this.rootStore) {
            return null;
        }
        if (!this.rootStore.ui_store) {
            return null;
        }
        if (!this.rootStore.ui_store.loggedInPerson) {
            return null;
        }
        return this.rootStore.ui_store.loggedInPerson.preferences;
    }

    get ui_store(): UIStore {
        return this.rootStore.ui_store;
    }

    findSheetWithIDIn(ss: Spreadsheet, sheetTabId: number): Sheet | undefined {
        this.logger.debug(`Trying to find sheet with ID ${sheetTabId} in ${ss.properties.title}, ${ss.sheets.length} sheets...`);
        return ss.sheets.find(s => {
            let isThisTheOne = s.properties.sheetId === sheetTabId;
            this.logger.debug(`${s.properties.sheetId} === ${sheetTabId}?  : ${isThisTheOne}`);
            return isThisTheOne;
        });
    }

    public load_sheet_with_id(sheet_id): Observable<Spreadsheet> {
        if (sheet_id === undefined || sheet_id === null) {
            this.logger.warn("load_sheet_with_id", `sheet_id is null, returning observable with null`);
            return of(null);
        }

        return Observable.create((observer) => {
            this.logger.debug("gapi", `Loading spreadsheet with ID: ${sheet_id}`);
            // Try to read this sheet to see if we can
            let request = {spreadsheetId: sheet_id, includeGridData: true};
            gapi.client.sheets.spreadsheets.get(request).then((result) => {
                // this.logger.info("Hey! We got the sheet! Awesome!");
                this.logger.info("gapi", `Loaded spreadsheet with ID: ${sheet_id}`);
                this.pageUtils.executeInZone(() => {
                    observer.next(result.result);
                    observer.complete();
                });
            }, (reason) => {
                console.error(`Failed to load: ${SWBSafeJSON.stringify(reason)}`);
                observer.error(reason);
                return null;
            });
        });
    }

    static range_for_sheet(s: Sheet, range?: string): string {
        if (!range) {
            return "'" + s.properties.title + "'";
        }
        return "'" + s.properties.title + "'!" + range;
    }

    static read_spreadsheet_data(spreadsheet: Spreadsheet, sheet: Sheet): Observable<Array<any>> {
        let promise = gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheet.spreadsheetId,
            range: GAPIS.range_for_sheet(sheet),
            includeGridData: true
        });

        return fromPromise(promise).map(v => {
            let result = v['result'];
            return result['values'];
        });
    }

    async clearAndWriteSchedule(spreadsheet: Spreadsheet, sheet: Sheet, schedule: ScheduleWithRules) {
        // Righteo. Lets do a batch update!
        this.progress.next(0);
        let num_format_rules = sheet.conditionalFormats ? sheet.conditionalFormats.length : 0;
        this.logger.info("clearAndWriteSchedule", "Clearing sheet (with " + num_format_rules + " format rules)...");

        await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheet.spreadsheetId,
            range: GAPIS.range_for_sheet(sheet)
        });

        this.progress.next(0.25);
        this.logger.info("clearAndWriteSchedule", "Sending new cell data...");
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
                range: GAPIS.range_for_sheet(sheet, "1:1"),
                values: [fields.map(field => field.name)]
            }
        ];

        let row_index = 2;
        for (let r of rows) {
            data.push({
                range: GAPIS.range_for_sheet(sheet, "" + row_index + ":" + row_index),
                values: [r]
            });
            row_index++;
        }

        let searchRow = rows.length + 5;
        let searchCondition = "=and(search($B$" + searchRow + ",B2), len($B$" + searchRow + ")>0)";

        // Add in the Search Titles
        data.push({
            range: GAPIS.range_for_sheet(sheet, "B" + (searchRow - 1) + ":B" + (searchRow - 1)),
            values: [['Super Search!']]
        });
        data.push({
            range: GAPIS.range_for_sheet(sheet, "" + (searchRow) + ":" + (searchRow)),
            values: [['Enter name here:']]
        });

        this.logger.debug(`Going up to Google: ${SWBSafeJSON.stringify(data)}`);

        this.progress.next(0.50);
        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: spreadsheet.spreadsheetId,
            resource: {
                valueInputOption: "USER_ENTERED",
                data: data
            }
        });

        this.progress.next(0.66);
        this.logger.info("clearAndWriteSchedule", "Updated all data. Formatting...");
        let formatRequests = [];
        for (let index = num_format_rules - 1; index >= 0; index--) {
            formatRequests.push({
                    deleteConditionalFormatRule: {
                        sheetId: sheet.properties.sheetId,
                        index: 0
                    },
                }
            )
        }
        if (formatRequests.length > 0) {
            this.progress.next(0.75);
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheet.spreadsheetId,
                requests: formatRequests
            });
        }
        await this.setConditionalFormats(spreadsheet, sheet, rows, fields, searchCondition);
        this.progress.next(1.0);
        this.logger.info("clearAndWriteSchedule", "Finished updating Google Sheet");
    }

    private async setConditionalFormats(spreadsheet: gapi.client.sheets.Spreadsheet, sheet: gapi.client.sheets.Sheet, rows: string[][], fields: any[], searchCondition: string) {
        this.progress.next(0.85);
        await gapi.client.sheets.spreadsheets.batchUpdate({
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
        });

        this.progress.next(0.95);
        await gapi.client.sheets.spreadsheets.batchUpdate({
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
        });
    }
}


export {
    GAPIS
}