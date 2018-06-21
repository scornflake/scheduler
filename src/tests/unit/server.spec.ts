import {ILifecycleCallback, IState, SchedulerServer} from "../../providers/server/scheduler-server.service";
import {RootStore} from "../../store/root";
import {instance, mock, verify, when} from "ts-mockito";
import {RESTServer} from "../../providers/server/server";
import {NavControllerMock, StorageMock} from "ionic-mocks";
import {SchedulerDatabase} from "../../providers/server/db";
import {Storage} from "@ionic/storage";
import {MockConfigurationService} from "../../app/logging-configuration";
import {scheduler_db_map} from "../../assets/db.mapping";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {IObjectCache, SimpleCache} from "../../providers/mapping/cache";
import {LoginResponse, UserResponse, ValidationResponse} from "../../common/interfaces";
import {Person} from "../../scheduling/people";
import {BehaviorSubject} from "rxjs/BehaviorSubject";

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

    // afterEach((done) => {
    //     db.destroyDatabase().then(() => {
    //         done();
    //     });
    // });

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
            organization_id: 0,
            logintoken: "",
            first_name: 'neil',
            last_name: 'me',
            is_active: true
        };

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
        let config = MockConfigurationService.ServiceForTests();
        SchedulerDatabase.ConstructAndWait(config, mapper).then(new_db => {
            db = new_db;
            db.setCache(cache);

            store = new RootStore(db);
            restServer = instance(restMock);
            server = new SchedulerServer(store, restServer, storageMock, db, NavControllerMock.instance());

            done();
        });
    });

    describe('test SchedulerServer lifecycle', () => {
        let showedLoginPage: boolean = false;
        let lastShownError: string = null;

        let lifecycleCallback = <ILifecycleCallback>{
            showLoginPage: () => {
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
                lastPersonUUID: null
            };
            storageMock = StorageMock.instance('state', state);

            let vr: ValidationResponse = {ok: false, detail: 'no way!', user: null};
            when(restMock.validateLoginToken(state.loginToken)).thenResolve(vr);

            server = new SchedulerServer(store, restServer, storageMock, db, NavControllerMock.instance());
            server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                expect(showedLoginPage).toBeTruthy();
                verify(restMock.validateLoginToken(state.loginToken)).called();
                done();
            });
        });

        it('should direct to login page if token is good, but no person UUID', function (done) {
            let state: IState = {
                loginToken: "12345",
                lastPersonUUID: null
            };

            userResponse.logintoken = state.loginToken;
            userResponse.uuid = null;
            let vr: ValidationResponse = {ok: true, detail: '', user: userResponse};

            when(restMock.validateLoginToken(state.loginToken)).thenResolve(vr);

            storageMock = StorageMock.instance('state', state);
            server = new SchedulerServer(store, restServer, storageMock, db, NavControllerMock.instance());

            server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                expect(showedLoginPage).toBeTruthy();
                verify(restMock.validateLoginToken(state.loginToken)).called();
                done();
            });
        });

        it('should show error if the person from the person UUID cannot be found', function (done) {
            let personInDB = new Person("Hey its ME!");
            userResponse.uuid = personInDB.uuid;
            userResponse.logintoken = "12345";

            let state: IState = {
                loginToken: userResponse.logintoken,
                lastPersonUUID: personInDB.uuid
            };
            expect(state.lastPersonUUID).not.toBeFalsy();
            storageMock = StorageMock.instance('state', state);
            server = new SchedulerServer(store, restServer, storageMock, db, NavControllerMock.instance());

            // Intentionally do not store.
            // This means we should get an error when it tries to lookup the object ID

            let vr: ValidationResponse = {ok: true, detail: '', user: userResponse};
            when(restMock.validateLoginToken(state.loginToken)).thenResolve(vr);

            server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                expect(showedLoginPage).toBeFalsy("should not show login page");
                expect(lastShownError).toMatch(/1334/);
                done();
            });
        });

        it('should lookup the person from the DB if login token and person UUID are valid', function (done) {
            let personInDB = new Person("Hey its ME!");
            userResponse.uuid = personInDB.uuid;

            let state: IState = {
                loginToken: "12345",
                lastPersonUUID: personInDB.uuid
            };
            let dbMock = mock(SchedulerDatabase);
            let dbInstance = instance(dbMock);
            storageMock = StorageMock.instance('state', state);
            server = new SchedulerServer(store, restServer, storageMock, dbInstance, NavControllerMock.instance());

            // mock out the db so we know for certain it's being called
            when(dbMock.readyEvent).thenReturn(new BehaviorSubject(true));
            when(dbMock.async_load_object_with_id(userResponse.uuid)).thenResolve(personInDB);

            let vr: ValidationResponse = {ok: true, detail: '', user: userResponse};
            when(restMock.validateLoginToken(state.loginToken)).thenResolve(vr);

            server.asyncRunStartupLifecycle(lifecycleCallback).then(() => {
                verify(dbMock.async_load_object_with_id(userResponse.uuid)).called();
                done();
            });
        });
    });

    describe('loginUser tests', () => {
        it('should create user in DB if they dont exist', (done) => {

            // dbl check that the DB does not contain this user
            server.db_findByUUID(userResponse.uuid).then(p => {
                let actualTest = (done) => {
                    let lr: LoginResponse = {ok: true, detail: null, user: userResponse};
                    when(restMock.login(userResponse.email, "1234")).thenResolve(lr);
                    server.loginUser(userResponse.email, "1234").then(() => {

                        server.db_findByUUID(userResponse.uuid).then(p => {
                            console.log(`Hopefully new p: ${p}`);
                            expect(p).not.toBeNull();

                            expect(server.state.loginToken).toEqual(userResponse.logintoken);
                            expect(server.state.lastPersonUUID).toEqual(userResponse.uuid);

                            done();
                        });
                    });
                };

                // couldn't get afterAll to destroy the db
                if (p != null) {
                    db.asyncDeleteObject(p).then(() => {
                        actualTest(done);
                    })
                } else {
                    actualTest(done);
                }
            });
        });

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