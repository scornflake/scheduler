import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {RootStore} from "../../store/root";
import {anything, instance, mock, verify, when} from "ts-mockito";
import {RESTServer} from "../../providers/server/server";
import {StorageMock} from "ionic-mocks";
import {SchedulerDatabase} from "../../providers/server/db";
import {Storage} from "@ionic/storage";
import {MockConfigurationService} from "../mock-logging-configuration";
import {scheduler_db_map} from "../../assets/db.mapping";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {IObjectCache, SimpleCache} from "../../providers/mapping/cache";
import {ServerError, UserResponse} from "../../common/interfaces";
import {Person} from "../../scheduling/people";
import {ConnectivityService} from "../../common/network/connectivity";
import {StateProvider} from "../../providers/state/state";
import {IState} from "../../providers/state/state.interface";
import {AuthorizationService} from "../../providers/token/authorization.service";
import {HttpErrorResponse} from "@angular/common/http";
import {TestILifecycleCallback} from "./server.callback";
import {newLoggingServiceAfterReset} from "./test-helpers";

describe('scheduler server', () => {
    let server: SchedulerServer;
    let store: RootStore;
    let restMock: RESTServer;
    let storageMock: Storage;
    let mapper: OrmMapper;
    let db: SchedulerDatabase;
    let cache: IObjectCache;
    let stateMock;
    let authMock;

    let userResponse: UserResponse;

    beforeEach((done) => {
        stateMock = mock(StateProvider);
        when(stateMock.state).thenReturn({});

        restMock = mock(RESTServer);
        authMock = mock(AuthorizationService);

        let connectivityServiceMock = mock(ConnectivityService);
        when(connectivityServiceMock.isOnline).thenReturn(true);

        storageMock = StorageMock.instance('state', null);

        let logService = newLoggingServiceAfterReset();
        cache = new SimpleCache();
        mapper = new OrmMapper(logService);

        //Add in mappings that we need, since we reference other models in this test
        mapper.addConfiguration(scheduler_db_map);

        userResponse = {
            id: 2,
            email: 'me@there.com',
            uuid: '123345',
            organization_uuid: null,
            first_name: 'neil',
            last_name: 'me',
            is_active: true
        };

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
        SchedulerDatabase.ConstructAndWait(MockConfigurationService.dbName, null, mapper, logService).then(new_db => {
            db = new_db;
            server = new SchedulerServer(
                store,
                instance(restMock),
                instance(authMock),
                instance(stateMock),
                logService,
                instance(connectivityServiceMock),
                mapper,
                MockConfigurationService.ServiceForTests());
            store = new RootStore(null, logService);
            server.setStore(store);

            server.setDatabase(db).then(() => {
                // force the cache to be US not the DB
                db.setCache(cache);
                done();
            });
        });
    });

    afterEach((done) => {
        db.destroyDatabase().then(() => {
            done();
        });
    });

    it('ServerError for no-HTTP should say so', function () {
        let err = {
            "headers": {
                "normalizedNames": {},
                "lazyUpdate": null,
                "headers": {}
            },
            "status": 0,
            "statusText": "Unknown Error",
            "url": null,
            "ok": false,
            "name": "HttpErrorResponse",
            "message": "Http failure response for (unknown url): 0 Unknown Error",
            "error": {
                "isTrusted": true
            }
        };
        let se = new ServerError(err);
        expect(se.isHTTPServerNotThere).toBeTruthy();
    });

    it('should turn errors into ServerErrors', function () {
        let aRealError = {
            "headers": {"normalizedNames": {}, "lazyUpdate": null},
            "status": 400,
            "statusText": "Bad Request",
            "url": "http://192.168.1.168:8000/api/login/",
            "ok": false,
            "name": "HttpErrorResponse",
            "message": "Http failure response for http://192.168.1.168:8000/api/login/: 400 Bad Request",
            "error": {"email": ["user with this email address already exists."]}
        };

        let se = new ServerError(aRealError);
        expect(se).not.toBeNull();
        expect(se.status).toEqual(400);
        expect(se.ok).toBeFalsy();

        expect(se.errors.length).toBe(1);
        expect(se.allErrors).toBe("user with this email address already exists.");
        console.log(`got: ${JSON.stringify(se)}`)
    });

    describe('test SchedulerServer lifecycle', () => {
        let lifecycleCallback = new TestILifecycleCallback();

        beforeEach((done) => {
            lifecycleCallback.showedLoginPage = false;
            lifecycleCallback.lastShownError = null;

            // we DO want to wait until the DB is ready
            db.readyEvent.subscribe(r => {
                if (r) {
                    done();
                }
            })
        });

        it('redirect to login page if null token', function (done) {
            when(stateMock.hasStateChangedSinceLastLifecycleRun()).thenReturn(true);
            when(stateMock.loginToken).thenReturn(null);

            expect(lifecycleCallback.showedLoginPage).toBeFalsy();

            server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                expect(lifecycleCallback.showedLoginPage).toBeTruthy();
                done();
            })
        });
        it('should direct to login page if token not valid', function (done) {
            let state: IState = {
                loginToken: "12345",
                lastPersonUUID: null,
                lastOrganizationUUID: null,
                isForcedOffline: false
            };

            storageMock = StorageMock.instance('state', state);
            when(restMock.getOwnUserDetails()).thenReject(new HttpErrorResponse({status: 401, error: 'expired'}));

            server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                expect(lifecycleCallback.showedLoginPage).toBeTruthy();
                verify(restMock.getOwnUserDetails()).called();
                done();
            });
        });

        it('should direct to login page if token is good, but no person UUID', function (done) {
            let state: IState = {
                loginToken: "12345",
                lastPersonUUID: null,
                lastOrganizationUUID: null,
                isForcedOffline: false
            };

            when(stateMock.state).thenReturn(state);
            when(authMock.isAuthenticatedAndNotExpired()).thenReturn(true);
            when(restMock.getOwnUserDetails()).thenResolve([]);

            storageMock = StorageMock.instance('state', state);
            server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                expect(lifecycleCallback.showedLoginPage).toBeTruthy();
                verify(restMock.getOwnUserDetails()).called();
                done();
            });
        });

        xit('should throw error if it cant login to the local DB', function () {
            // TODO because we dunno what this means yet, when we define security properly
        });

        // Skipped cos I dont know how to do this given the need to login to the local DB
        xit('should show error if the person from the person UUID cannot be found', function (done) {
            let personInDB = new Person("Hey its ME!");

            let state: IState = {
                loginToken: '1234567e',
                lastPersonUUID: personInDB.uuid,
                lastOrganizationUUID: "shouldn't see THIS in the thing",
                isForcedOffline: false
            };

            expect(state.lastPersonUUID).not.toBeFalsy();

            when(stateMock.state).thenReturn(state);
            when(stateMock.loginToken).thenReturn(state.loginToken);
            when(authMock.isAuthenticatedAndNotExpired()).thenReturn(true);
            when(restMock.getOwnUserDetails()).thenResolve([]);

            // Took this out when doing auth rewrite, didn't replace yet
            // server.forceStateReload();
            server.asyncRunStartupLifecycle(lifecycleCallback, 1500).then(() => {
                expect(lifecycleCallback.showedLoginPage).toBeFalsy("should not show login page");
                expect(lifecycleCallback.lastShownError).toMatch(/1334/);
                done();
            });
        }, 3000);

        it('should lookup the person from the DB if login token and person UUID are valid', function (done) {
            let personInDB = new Person("Hey its ME!");
            userResponse.uuid = personInDB.uuid;
            userResponse.organization_uuid = "testing9876";

            let dbMock = mock(SchedulerDatabase);

            // mock out the db so we know for certain it's being called
            when(dbMock.setCache(anything()));

            // Intentional, so that the test STOPS here and doesn't run the rest
            when(dbMock.async_DoesObjectExistWithUUID(userResponse.uuid)).thenResolve(true);
            when(dbMock.async_LoadObjectWithUUID(userResponse.uuid)).thenResolve(personInDB);

            let dbInstance = instance(dbMock);

            server.asyncWaitForDBToContainObjectWithUUID(userResponse.uuid, dbInstance, 1500).then(p => {
                verify(dbMock.async_DoesObjectExistWithUUID(userResponse.uuid)).called();
                verify(dbMock.async_LoadObjectWithUUID(userResponse.uuid)).called();
                expect(p).toBe(personInDB);
                done();
            });
        }, 3000);


    });
});