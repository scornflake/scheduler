import {ApplicationRef, Injectable} from "@angular/core";
import {credentials, DISCOVERY_DOCS, SCOPES} from "./auth-common";
import {RootStore} from "../state/root";
import {Storage} from "@ionic/storage";
import {UIStore} from "../state/UIState";
import {Observable} from "rxjs/Observable";
import {flatMap} from 'rxjs/operators';

const API_KEY = "AIzaSyCVhzG0pEB1NfZsxpdPPon3XhEK4pctEYE";

@Injectable()
class GAPIS {
    private init_done: boolean;
    private callback: any;

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
            gapi.client.drive.files.list(sheets_only).then((response) => {
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
        if (isSignedIn != this.rootStore.ui_store.signed_in && isSignedIn) {
            this.get_sheet_id().subscribe();
            // this.list_all_sheets();
        }
        this.ui_store.signed_in = isSignedIn;
        this.appRef.tick();
    }

    private loadAuthentication() {
        gapi.load('client:auth2', this.loadDrive);
    }

    private loadDrive() {
        console.log("Loading drive API...");
        gapi.client.load('drive', 'v3').then((v) => {
            this.initClient();
        });
    }

    get ui_store(): UIStore {
        return this.rootStore.ui_store;
    }

    get_sheet_id(): Observable<string> {
        return Observable.create((observer) => {
            console.log("Getting sheet ID...");
            if (!this.ui_store.google_sheet_id_retrieved) {
                console.log("No sheet in storage. Getting...");
                this.storage.get('sheet_id').then((sheet_id) => {
                    console.log("Stored sheet ID: " + sheet_id);
                    this.ui_store.google_sheet_id = sheet_id;
                    this.ui_store.google_sheet_id_retrieved = true;
                    observer.next(this.ui_store.google_sheet_id);
                    observer.complete();
                });
            } else {
                console.log("Returning cached sheet ID: " + this.ui_store.google_sheet_id);
                observer.next(this.ui_store.google_sheet_id);
                observer.complete();
            }
        });
    }

    get_verified_sheet(): Observable<any> {
        return this.get_sheet_id()
            .pipe(
                flatMap((sheet_id) => {
                        return this.validate_sheet_id(sheet_id);
                    }
                ))
    }

    private validate_sheet_id(sheet_id: string): Observable<any> {
        return Observable.create((observer) => {
            console.log("Validating sheet ID: " + sheet_id);
            if (sheet_id == null || sheet_id == "") {
                // throw new Error("No sheet");
                throw new Error("No sheet");
            }
            // Try to read this sheet to see if we can
            let request = {spreadsheetId: sheet_id};
            gapi.client.spreadsheets.get(request).then((sheet) => {
                console.log("Hey! We got it! Awesome!");
                observer.next(sheet);
                observer.complete();
            });
        });
    }
}


export {
    GAPIS
}