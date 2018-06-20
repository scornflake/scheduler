import {ObjectWithUUID} from "../../scheduling/base-types";
import {configure, getDependencyTree, getObserverTree, observe, spy, transaction} from "mobx";
import {action, observable} from "mobx-angular";
import {RootStore} from "../../store/root";
import {MockConfigurationService} from "../../app/logging-configuration";
import {SchedulerDatabase} from "../../providers/server/db";
import {setupOrmMapper} from "../../providers/mapping/setup";
import {Person} from "../../scheduling/people";
import {Plan} from "../../scheduling/plan";
import {Team} from "../../scheduling/teams";
import {defaultSoundRole} from "../sample-data";
import {csd} from "../../scheduling/common/date-utils";
import {SafeJSON} from "../../common/json/safe-stringify";
import {printDependencyMap} from "@ionic/app-scripts";
import {ObjectUtils} from "../../pages/page-utils";

class SomeThing extends ObjectWithUUID {
    @observable some_field: string = "a value";

    @action setField(value) {
        this.some_field = value;
    }

    toString() {
        return this.some_field;
    }
}

describe('observation', () => {
    let db;
    let store;
    beforeEach((done) => {
        configure({
            enforceActions: true
        });

        let config = MockConfigurationService.ServiceForTests();
        let mapper = setupOrmMapper();
        SchedulerDatabase.ConstructAndWait(config, mapper).then(new_db => {
            db = new_db;
            store = new RootStore(db);
            store.load().then(() => {
                done();
            });
        });

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
    });

    it('can observe change to prefs', function (done) {
        expect(store.ui_store).not.toBeNull();
        expect(store.ui_store.preferences).not.toBeNull();

        store.preferences$.subscribe(ss => {
            console.log(`subscriber got ${SafeJSON.stringify(ss)}`);
            if (ss) {
                if (ss.selected_plan_uuid == "1234") {
                    done();
                }
            }
        });
        store.ui_store.preferences.setSelectedPlanUUID("1234");
    });

    it('can observe change to selected plan', function (done) {
        let newplan = new Plan("haha", null);
        store.db.cache.saveInCache(newplan);
        store.selectedPlan$.subscribe(plan => {
            if (plan) {
                if (plan.name == "haha") {
                    done();
                }
            }
        });
        store.ui_store.preferences.setSelectedPlanUUID(newplan.uuid);
    });

    it('can observe change to logged in person', function (done) {
        let person = new Person("Neilos");
        store.db.cache.saveInCache(person);
        store.loggedInPerson$.subscribe(lip => {
            if (lip) {
                console.log(`Saw saved: ${lip}`);
                if (lip.name == "Neilos") {
                    // expect(lip.name).toEqual("Neilos");
                    done();
                }
            }
        });

        store.ui_store.preferences.setLoggedInPersonUUID(person.uuid);
    });

    it('can observe change to schedule', function (done) {
        let person = new Person("Neilos Neilski");
        let team = new Team("A Team", [person]);
        let newplan = new Plan("haha", team);
        newplan.addRole(defaultSoundRole);
        newplan.assignmentFor(person).addRole(defaultSoundRole);
        newplan.start_date = csd(2018, 6, 17);
        newplan.end_date = csd(2018, 7, 17);

        store.db.cache.saveInCache(person);
        store.db.cache.saveInCache(team);
        store.db.cache.saveInCache(newplan);

        expect(store.schedule).toBeUndefined();

        store.schedule$.subscribe(swr => {
            if (swr) {
                if (swr.plan == newplan) {
                    done();
                }
            }
        });

        // Select the new plan!
        store.ui_store.preferences.setSelectedPlanUUID(newplan.uuid);
    });

    it('can observe property on class', (done) => {
        let instance = new SomeThing();

        observe(instance, 'some_field', (change) => {
            console.log(`Yup! it changed, ${JSON.stringify(change)}`);
            done();
        });

        // change the object
        instance.setField('1234');
    });

});