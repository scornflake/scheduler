import {ILifecycleCallback, IState, SchedulerServer} from "../../providers/server/scheduler-server.service";
import {RootStore} from "../../store/root";
import {anything, instance, mock, verify, when} from "ts-mockito";
import {RESTServer} from "../../providers/server/server";
import {StorageMock} from "ionic-mocks";
import {SchedulerDatabase} from "../../providers/server/db";
import {Storage} from "@ionic/storage";
import {MockConfigurationService} from "../../app/logging-configuration";
import {scheduler_db_map} from "../../assets/db.mapping";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {IObjectCache, SimpleCache} from "../../providers/mapping/cache";
import {LoginResponse, ServerError, UserResponse, ValidationResponse} from "../../common/interfaces";
import {Person} from "../../scheduling/people";

describe('scheduler server', () => {
    let server: SchedulerServer;
    let store: RootStore;
    let restMock: RESTServer;
    let restServer: RESTServer;
    let storageMock: Storage;
    let mapper: OrmMapper;
    let db: SchedulerDatabase;
    let cache: IObjectCache;

    let userResponse: UserResponse;

    let createServerWithStorage = (storage): Promise<SchedulerServer> => {
        server = new SchedulerServer(store, restServer, storage, mapper, MockConfigurationService.ServiceForTests());
        store = new RootStore();
        server.setStore(store);

        return server.setDatabase(db).then(() => {
            // force the cache to be US not the DB
            db.setCache(cache);
            return server;
        });
    };

    beforeEach((done) => {
        restMock = mock(RESTServer);

        storageMock = StorageMock.instance('state', null);

        cache = new SimpleCache();
        mapper = new OrmMapper();

        //Add in mappings that we need, since we reference other models in this test
        mapper.addConfiguration(scheduler_db_map);

        userResponse = {
            id: 2,
            email: 'me@there.com',
            uuid: '123345',
            organization_uuid: null,
            logintoken: "",
            first_name: 'neil',
            last_name: 'me',
            is_active: true
        };

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
        SchedulerDatabase.ConstructAndWait(MockConfigurationService.dbName, mapper).then(new_db => {
            db = new_db;
            restServer = instance(restMock);
            createServerWithStorage(storageMock).then((svr) => {
                server = svr;
                done();
            })
        });
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
        let showedLoginPage: boolean = false;
        let lastShownError: string = null;

        let lifecycleCallback = <ILifecycleCallback>{
            showLoginPage: (reason: string) => {
                console.info(`test received reason: ${reason}`);
                showedLoginPage = true;
            },
            showError: (error) => {
                lastShownError = error;
            }
        };

        beforeEach((done) => {
            showedLoginPage = false;
            lastShownError = null;

            // we DO want to wait until the DB is ready
            db.readyEvent.subscribe(r => {
                if (r) {
                    done();
                }
            })
        });

        afterEach((done) => {
            db.destroyDatabase().then(() => {
                done();
            });
        });

        it('if no saved state, direct to login page', function (done) {
            server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                expect(server.state).not.toBeNull();
                expect(server.state).not.toBeUndefined();
                expect(server.state.loginToken).toBeNull();
                expect(server.state.lastPersonUUID).toBeNull();
                expect(showedLoginPage).toBeTruthy();
                done();
            })
        });

        it('should direct to login page if token is bad', function (done) {
            let state: IState = {
                loginToken: "12345",
                lastPersonUUID: null,
                lastOrganizationUUID: null
            };
            storageMock = StorageMock.instance('state', state);

            let vr: ValidationResponse = {ok: false, detail: 'no way!', user: null};
            when(restMock.validateLoginToken(state.loginToken)).thenResolve(vr);

            createServerWithStorage(storageMock).then(server => {
                server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                    expect(showedLoginPage).toBeTruthy();
                    verify(restMock.validateLoginToken("12345")).called();
                    done();
                });
            });
        });

        it('should direct to login page if token is good, but no person UUID', function (done) {
            let state: IState = {
                loginToken: "12345",
                lastPersonUUID: null,
                lastOrganizationUUID: null
            };

            userResponse.logintoken = state.loginToken;
            userResponse.uuid = null;
            let vr: ValidationResponse = {ok: true, detail: '', user: userResponse};

            when(restMock.validateLoginToken(state.loginToken)).thenResolve(vr);

            storageMock = StorageMock.instance('state', state);
            createServerWithStorage(storageMock).then(server => {

                server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                    expect(showedLoginPage).toBeTruthy();
                    verify(restMock.validateLoginToken(state.loginToken)).called();
                    done();
                });
            });
        });

        it('should show error if the person from the person UUID cannot be found', function (done) {
            let personInDB = new Person("Hey its ME!");
            userResponse.uuid = personInDB.uuid;
            userResponse.organization_uuid = "abcvdh";
            userResponse.logintoken = "12345";

            let state: IState = {
                loginToken: userResponse.logintoken,
                lastPersonUUID: personInDB.uuid,
                lastOrganizationUUID: "abcdefg"
            };

            expect(state.lastPersonUUID).not.toBeFalsy();
            storageMock = StorageMock.instance('state', state);
            createServerWithStorage(storageMock).then(server => {
                // Intentionally do not store.
                // This means we should get an error when it tries to lookup the object ID

                let vr: ValidationResponse = {ok: true, detail: '', user: userResponse};
                when(restMock.validateLoginToken(state.loginToken)).thenResolve(vr);

                server.asyncRunStartupLifecycle(lifecycleCallback, 1500).then(() => {
                    expect(showedLoginPage).toBeFalsy("should not show login page");
                    expect(lastShownError).toMatch(/1334/);
                    server.db.destroyDatabase().then(() => {
                        done();
                    })
                });
            });
        }, 3000);

        xit('should not run cycle twice, aka: able to detect that it is ok', function () {
            // This is a bit of a fudge.
            // We put the server into a state where it thinks it's logged in OK.
            // We want to ensure that it's not actually going to reload/reassign the DB
            // if the current user token remains valid.


        });

        it('should lookup the person from the DB if login token and person UUID are valid', function (done) {
            let personInDB = new Person("Hey its ME!");
            userResponse.uuid = personInDB.uuid;
            userResponse.organization_uuid = "testing9876";

            let state: IState = {
                loginToken: "12345",
                lastPersonUUID: personInDB.uuid,
                lastOrganizationUUID: "testing9876"
            };

            let dbMock = mock(SchedulerDatabase);

            // mock out the db so we know for certain it's being called
            when(dbMock.setCache(anything()));

            // Intentional, so that the test STOPS here and doesn't run the rest
            when(dbMock.async_does_object_with_id_exist(userResponse.uuid)).thenResolve(true);
            when(dbMock.async_load_object_with_id(userResponse.uuid)).thenResolve(personInDB);

            let dbInstance = instance(dbMock);

            server.asyncWaitForDBToContainPerson(userResponse.uuid, dbInstance, 1500).then(p => {
                verify(dbMock.async_does_object_with_id_exist(userResponse.uuid)).called();
                verify(dbMock.async_load_object_with_id(userResponse.uuid)).called();
                expect(p).toBe(personInDB);
                done();
            });
        }, 3000);
    });

    describe('loginUser tests', () => {
        it('good login sets both login token, and person UUID', (done) => {
            userResponse.logintoken = "424345";
            userResponse.uuid = "AmazeBalls";
            let lr: LoginResponse = {ok: true, detail: null, user: userResponse};
            when(restMock.login(userResponse.email, "1234")).thenResolve(lr);
            server.loginUser(userResponse.email, "1234").then(() => {
                verify(restMock.login(userResponse.email, "1234")).called();
                expect(server.state.loginToken).toEqual(userResponse.logintoken);
                expect(server.state.lastPersonUUID).toEqual(userResponse.uuid);
                done();
            });
        })
    });

    describe('test SchedulerServer directly', () => {
        it('should clear REST login token if token validation fails', function (done) {
            let token = 'hahahahhaha';
            let vr: ValidationResponse = {ok: false, detail: 'no way!', user: null};
            when(restMock.validateLoginToken(token)).thenResolve(vr);

            server.validateLoginToken(token).then(resp => {
                expect(resp).toEqual(vr);
                expect(restServer.loginToken).toEqual(null);
                done();
            })
        });

        it('should set REST login token if token validation succeeds', function (done) {
            let token = 'hahahahhaha';
            userResponse.logintoken = token;
            let vr: ValidationResponse = {ok: true, detail: 'no way!', user: userResponse};
            when(restMock.validateLoginToken(token)).thenResolve(vr);

            server.validateLoginToken(token).then(resp => {
                expect(resp).toEqual(vr);
                expect(restServer.loginToken).toEqual(token);
                done();
            })
        });
    })
});