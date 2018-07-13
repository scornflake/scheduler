import {defaultComputerRole, defaultSaxRole, defaultSoundRole, SetupDefaultRoles} from "../sample-data";
import {
    AssignedToRoleCondition,
    ConditionalRule,
    ScheduleOn,
    TryToScheduleWith
} from "../../scheduling/rule_based/rules";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {csd} from "../../scheduling/common/date-utils";
import {Team} from "../../scheduling/teams";
import {Plan} from "../../scheduling/plan";
import {Person} from "../../scheduling/people";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {scheduler_db_map} from "../../assets/db.mapping";
import {OrmConverter} from "../../providers/server/orm-converter";
import {SchedulerDatabase} from "../../providers/server/db";
import {MockConfigurationService} from "../../app/logging-configuration";
import {IObjectCache, SimpleCache} from "../../providers/mapping/cache";
import {Assignment} from "../../scheduling/assignment";
import {Availability, AvailabilityUnit} from "../../scheduling/availability";

describe('app based tests', () => {
    SetupDefaultRoles();

    let cache: IObjectCache;
    let mapper: OrmMapper;
    let converter: OrmConverter;
    let db: SchedulerDatabase;

    let neil;
    let cherilyn;
    let bob;
    let team;
    let thePlan;
    let specificDate;
    let soundRoleRef;
    let computerRoleRef;

    beforeEach((done) => {
        specificDate = csd(2018, 2, 10);

        neil = new Person("neil");
        cherilyn = new Person("cherilyn");
        bob = new Person("bob");
        team = new Team("My team", [neil, bob]);
        thePlan = new Plan("Cunning", team);

        cache = new SimpleCache();
        mapper = new OrmMapper();
        mapper.addConfiguration(scheduler_db_map);

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1500;

        SchedulerDatabase.ConstructAndWait(MockConfigurationService.dbName, "1234", mapper).then(new_db => {
            db = new_db;
            db.setCache(cache);

            converter = db.converter;
            converter.writer.ignoreOldObjectsWhenUpdating = true;

            soundRoleRef = mapper.referenceForObject(defaultSoundRole);
            computerRoleRef = mapper.referenceForObject(defaultComputerRole);

            thePlan.start_date = csd(2018, 1, 21);
            thePlan.end_date = csd(2018, 3, 21);
            thePlan.addRole(defaultSoundRole);
            thePlan.addRole(defaultComputerRole);

            thePlan.assignmentFor(neil).addRole(defaultSoundRole, 5);
            thePlan.assignmentFor(neil).addRole(defaultComputerRole);
            thePlan.assignmentFor(bob).addRole(defaultComputerRole);

            thePlan.assignmentFor(neil).put_on_specific_role_for_date(defaultSoundRole, specificDate);

            done();
        });
    });

    it('should convert object with nested list of objects to a dict', function (done) {
        let rule = new AssignedToRoleCondition(defaultSoundRole);
        rule.thenDo(new ScheduleOn(neil, defaultComputerRole));
        converter.writer.async_createDocFromJSObject(rule).then(doc => {
            expect(doc).not.toBeNull();
            // console.warn(`Created DOC: ${SafeJSON.stringify(doc)}`);
            expect(doc['type']).toEqual('AssignedToRoleCondition');
            let actions = doc['actions'];
            expect(actions.length).toBe(1);
            let firstAction = actions[0];
            expect(firstAction['type']).toEqual('ScheduleOn');
            expect(firstAction['role']).toEqual(mapper.referenceForObject(defaultComputerRole));
            expect(firstAction['person']).toEqual(mapper.referenceForObject(neil));
            done();
        });
    });

    /*
    This was a GREAT test.
    It made me EVENTUALLY find a fault where I had a method named 'then'
    Which is REALLY BAD IN AN ASYNC/AWAIT environment!!!!
     */
    it('should convert ConditionalRule, that used to have a then method', function (done) {
        let doc = {
            "type": "ConditionalRule",
        };
        converter.reader.async_createJSObjectFromDoc(doc, doc['type']).then((jsObject: ConditionalRule) => {
            // console.warn(`Created DOC: ${SafeJSON.stringify(jsObject)}`);
            expect(jsObject).not.toBeNull();
            expect(jsObject.type).toEqual('ConditionalRule');
            expect(jsObject.priority).toEqual(0);
            expect(jsObject.actions).toEqual([]);
            done();
        });
    });

    it('can convert dict of condition rules back into an object', function (done) {
        cache.saveInCache(defaultComputerRole);
        cache.saveInCache(defaultSoundRole);
        cache.saveInCache(neil);

        let role1ref = mapper.referenceForObject(defaultSoundRole);
        let role2ref = mapper.referenceForObject(defaultComputerRole);
        let neilRef = mapper.referenceForObject(neil);

        let doc = {
            "type": "Assignment",
            "_id": "ac48e7c6-6952-a336-4871-77dfa1318dfe",
            "_rev": null,
            "person": neilRef,
            "role_weightings": {}
        };
        doc['role_weightings'][role1ref] = 1;
        doc['role_weightings'][role2ref] = 2;
        converter.reader.async_createJSObjectFromDoc(doc, 'Assignment').then((assign: Assignment) => {
            // console.warn(`Created Object: ${SafeJSON.stringify(assign)}`);
            expect(assign).not.toBeNull();
            expect(assign.uuid).toEqual("ac48e7c6-6952-a336-4871-77dfa1318dfe");

            expect(assign.role_weightings.size).toBe(2);
            expect(assign.role_weightings.get(defaultSoundRole)).toBe(1);
            expect(assign.role_weightings.get(defaultComputerRole)).toBe(2);
            done();
        })
    });

    it('can produce dict for assignment condition_rules', function (done) {
        let assignment = thePlan.assignmentFor(neil);
        assignment.if_assigned_to(defaultSoundRole).thenDo(new ScheduleOn(neil, defaultComputerRole));

        converter.writer.async_createDocFromJSObject(assignment).then(doc => {
            // console.warn(`have: ${JSON.stringify(doc)}`);

            let condition_rules_array = doc['condition_rules'];
            expect(condition_rules_array.length).toEqual(1);

            let firstCondition = condition_rules_array[0];
            expect(firstCondition['type']).toEqual('AssignedToRoleCondition');
            expect(firstCondition['role']).toEqual(mapper.referenceForObject(defaultSoundRole));
            let theActions = firstCondition['actions'];

            expect(theActions.length).toEqual(1);
            let firstAction = theActions[0];
            expect(firstAction['type']).toEqual('ScheduleOn');
            expect(firstAction['role']).toEqual(mapper.referenceForObject(defaultComputerRole));
            expect(firstAction['person']).toEqual(mapper.referenceForObject(neil));
            done();
        })
    });

    it('should create dict of secondary_actions on Assignment', function (done) {
        thePlan.assignmentFor(neil)
            .addRole(defaultSoundRole, 1)
            .addRole(defaultSaxRole, 3)
            .add_secondary_action(new TryToScheduleWith(cherilyn, new Availability(1, AvailabilityUnit.EVERY_N_WEEKS), 2));
        let assignment = thePlan.assignmentFor(neil);

        converter.writer.async_createDocFromJSObject(assignment).then(doc => {
            // console.warn(`have: ${JSON.stringify(doc)}`);
            expect(doc['secondary_action_list']).not.toBeFalsy();

            let actionList = doc['secondary_action_list'];
            expect(actionList.length).toBe(1);
            let firstAction = actionList[0];
            expect(firstAction.type).toBe('TryToScheduleWith');
            expect(firstAction.max_number_of_times).toBe(2);
            done();
        })
    });

    it('should create JS from assignment that has secondary actions', function (done) {
        let dict = {
            "type": "Assignment",
            "_id": "799ad328-4070-513f-d72c-81a84ba85c41",
            "_rev": null,
            "person": "rrr:Person:a70093d6-72e0-5fa0-cfd1-83b39958e7a9",
            "role_weightings": {
                "rrr:Role:694434ca-705a-710d-3714-942c0b419a24": 1,
                "rrr:Role:b8e4e55b-dd71-5090-7d29-3152aee3ef7e": 1,
                "rrr:Role:392ffeb8-5405-93c0-4e5e-136e9eb78ca9": 3
            },
            "specific_roles": {"2018/1/10@0": ["rrr:Role:694434ca-705a-710d-3714-942c0b419a24"]},
            "condition_rules": [],
            "secondary_action_list": [{
                "type": "TryToScheduleWith",
                "priority": 0,
                "owner": "rrr:Person:a70093d6-72e0-5fa0-cfd1-83b39958e7a9",
                "other_person": "rrr:Person:ba331384-eb7e-00de-5d2d-5c54329654ff",
                "reach": "rrr:Availability:9763b892-438a-a664-7fe4-a09e21542b00",
                "max_number_of_times": 2
            }]
        };

        /*
        Put some data in place for the resolver
         */

        let firstPerson = new Person('first', "a70093d6-72e0-5fa0-cfd1-83b39958e7a9");
        cache.saveInCache(firstPerson);
        let secondPerson = new Person('second', "ba331384-eb7e-00de-5d2d-5c54329654ff");
        cache.saveInCache(secondPerson);
        let reach = new Availability(3, AvailabilityUnit.EVERY_N_DAYS);
        reach._id = "9763b892-438a-a664-7fe4-a09e21542b00";
        cache.saveInCache(reach);

        converter.reader.async_createJSObjectFromDoc(dict, 'Assignment').then((assign: Assignment) => {
            let secondaries = assign.secondary_actions;
            expect(assign.type).toBe('Assignment');
            expect(secondaries.length).toBe(1);
            let tryTo = secondaries[0] as TryToScheduleWith;
            expect(tryTo.type).toBe('TryToScheduleWith');
            expect(tryTo.owner).not.toBeFalsy();
            expect(tryTo.max_number_of_times).toBe(2);
            expect(tryTo.other_person).not.toBeFalsy("other person not rhere?");
            expect(tryTo.reach).not.toBeFalsy('reach is null, why?');
            expect(tryTo.reach.period).toBe(3, "incorrect period on reach");
            expect(tryTo.reach.unit).toBe(AvailabilityUnit.EVERY_N_DAYS);
            // console.warn(`Created Object: ${SafeJSON.stringify(tryTo)}`);
            done();
        });
    });
});