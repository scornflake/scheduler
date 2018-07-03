import {Person} from "../../scheduling/people";
import {Team} from "../../scheduling/teams";
import {Plan} from "../../scheduling/plan";
import {RootStore} from "../../store/root";
import {MockConfigurationService} from "../../app/logging-configuration";
import {SchedulerDatabase} from "../../providers/server/db";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {SimpleCache} from "../../providers/mapping/cache";
import {scheduler_db_map} from "../../assets/db.mapping";
import {defaultSaxRole, defaultSoundRole, SetupDefaultRoles} from "../sample-data";
import {isObservableArray} from "mobx";

describe('root store', () => {
    let store;
    let plan;
    let team;
    let neil;

    let cache, mapper, db;

    beforeEach((done) => {
        neil = new Person('neilos!');
        team = new Team('Super Team', [neil]);
        plan = new Plan('Pin a tail on it', team);

        cache = new SimpleCache();
        mapper = new OrmMapper();

        SetupDefaultRoles();

        //Add in mappings that we need, since we reference other models in this test
        mapper.addConfiguration(scheduler_db_map);

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 4000;
        SchedulerDatabase.ConstructAndWait(MockConfigurationService.dbName, "1234", mapper).then(new_db => {
            db = new_db;
            db.setCache(cache);
            store = new RootStore(null);
            store.setDatabase(db).then(() => {
                done();
            });
        });
    });

    it('should be able to clone a plan', function (done) {
        store.asyncSaveOrUpdateDb(team).then(() => {

            // Lets give it some meaningful data
            plan.assignmentFor(neil).addRole(defaultSoundRole);
            plan.assignmentFor(neil).addRole(defaultSaxRole, 4);

            // Store this plan so it's live in the db
            store.asyncSaveOrUpdateDb(plan).then(() => {
                console.log(`Stored original plan`);
                store.asyncDuplicateExistingPlan('New Plan', plan).then((duplicated: Plan) => {
                    console.log(`Got back a duplicated plan!`);
                    expect(duplicated.name).toEqual('New Plan');
                    expect(duplicated.uuid).not.toEqual(plan.uuid);

                    // Should be able to save this to the DB
                    store.asyncSaveOrUpdateDb(duplicated).then((savedObject) => {
                        console.log(`Stored the duplicated plan`);
                        expect(savedObject).not.toBeFalsy();
                        done();
                    });
                    // done();
                })
            });
        });
    });

    it('items of a BaseStore should still be observable after "remove" is called', function () {
        expect(store).not.toBeNull();
        expect(neil).not.toBeNull();

        store.addObjectToStore(neil);
        expect(store.length).toEqual(1, "huh? not added");
        expect(isObservableArray(store.items)).toBeTruthy();

        expect(store.findIndexOfObject(neil)).not.toBe(-1, "why not found?");

        store.removeObjectFromStore(neil);
        expect(store.length).toEqual(0, "not removed!");
        expect(isObservableArray(store.items)).toBeTruthy();
    });
});