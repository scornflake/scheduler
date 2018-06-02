import {Person} from "../people";
import {Role} from "../role";
import {AssignedToRoleCondition, OnThisDate, ScheduleOn} from "../rule_based/rules";
import {
    defaultAcousticGuitar,
    defaultBass,
    defaultKeysRole,
    defaultLeaderRole,
    defaultSaxRole,
    defaultSoundRole, SetupDefaultRoles
} from "./sample-data";
import {RolesStore} from "./role-store";
import {Service} from "../service";
import {RuleFacts} from "../rule_based/rule-facts";
import {Assignment} from "../assignment";

describe('service', () => {
    let service: Service;

    beforeEach(() => {
        service = new Service("test");
        SetupDefaultRoles();
    });

    it('can add dependent roles', () => {
        let cherilyn = new Person("Cherilyn");
        let cher_assignment = service.add_person(cherilyn);
        cher_assignment.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(cherilyn, defaultKeysRole));

        expect(cher_assignment.roles.length).toEqual(1);
        let rules = cher_assignment.conditional_rules;
        expect(rules.length).toEqual(1);

        let first_rule = rules[0];
        expect(first_rule instanceof AssignedToRoleCondition).toBeTruthy();

        // TODO: could do more here
        // We don't test that the condition has actions, or that they fire
    });

    it('can derive roles based on people that have been added', () => {
        service.add_person(new Person("neil")).add_role(defaultSoundRole);
        service.add_person(new Person("cher")).add_role(defaultKeysRole);
        let roles = service.roles;
        expect(roles.length).toBe(2);
        expect(roles).toContain(defaultKeysRole);
        expect(roles).toContain(defaultSoundRole);
    });


    it('can sort people by role layout priority', () => {
        // people are in roles. Get a list of people based on their max role layout priority
        let role_store = new RolesStore();
        let leader = role_store.addRole(new Role("Leader", 10));
        let keys = role_store.addRole(new Role("Keys", 5));
        let gopher = role_store.addRole(new Role("Gopher", 1));

        // Tim = Keys
        let p2 = service.add_person(new Person("Tim")).add_role(keys);
        // Janice = Gopher
        let p3 = service.add_person(new Person("Janice")).add_role(gopher);
        // Neil = Gopher + Leader
        let neil_assignment = service.add_person(new Person("Neil"));
        let p1 = neil_assignment.add_role(gopher).add_role(leader);

        // Expect Neil, Tim, Janice
        let ordered = service.order_people_by_role_layout_priority();
        expect(ordered[0]).toEqual(p1.person);
        expect(ordered[1]).toEqual(p2.person);
        expect(ordered[2]).toEqual(p3.person);
    });

    it('can return roles sorted by layout order', () => {
        service.add_person(new Person("Neil")).add_role(defaultSaxRole);
        service.add_person(new Person("Cherilyn")).add_role(defaultLeaderRole);

        defaultSaxRole.layout_priority = 1;
        defaultLeaderRole.layout_priority = 3;

        // Highest first
        let sorted = service.roles_in_layout_order;
        expect(sorted[0]).toEqual(defaultLeaderRole);
        expect(sorted[1]).toEqual(defaultSaxRole);
    });

    it('can sort roles by priority, into groups', () => {
        service.add_person(new Person("Neil")).add_role(defaultSoundRole);
        service.add_person(new Person("Tim")).add_role(defaultAcousticGuitar);
        service.add_person(new Person("Cherilyn")).add_role(defaultLeaderRole);

        defaultSoundRole.layout_priority = 1;
        defaultAcousticGuitar.layout_priority = 1;

        defaultLeaderRole.layout_priority = 2;

        let groups = service.roles_in_layout_order_grouped;
        console.log(`Groups are: ${groups}`);
        console.log(`Groups zero: ${groups[0]}`);
        console.log(`Groups one: ${groups[1]}`);
        expect(groups.length).toEqual(2, 'group length isnt correct');
        expect(groups[0].length).toEqual(1, 'expected single with priority 1');
        expect(groups[1].length).toEqual(2, 'expected two with priority 2');
    });

    describe('rules', () => {
        let neil: Person, rob: Person;
        let neil_assignment: Assignment, rob_assignment: Assignment;
        let state: RuleFacts;
        let date: Date;

        beforeEach(() => {
            date = new Date(2017, 10, 1);

            neil = new Person("neil");
            neil_assignment = service.add_person(neil).add_role(defaultSaxRole, 3).add_role(defaultSoundRole, 1);

            rob = new Person("rob");
            rob_assignment = service.add_person(rob).add_role(defaultBass).add_role(defaultSoundRole);

            state = new RuleFacts(service);
            state.current_date = date;
        });

        it('creates role rules given people', () => {
            let pick_roles = service.pick_rules();
            expect(pick_roles.size).toEqual(3);

            let just_roles = Array.from(pick_roles.keys());
            expect(just_roles).toContain(defaultSaxRole);
            expect(just_roles).toContain(defaultSoundRole);
            expect(just_roles).toContain(defaultBass);

            // If we choose sound, we should get a single UsageWeightedRule at the moment
            let sound_rules = pick_roles.get(defaultSoundRole);
            expect(sound_rules.length).toEqual(1);
            // expect(sound_rules[0].constructor.name).toEqual("UsageWeightedSequential")
        });

        it('a person can have a fixed role on a date', () => {
            // This would be the normal order
            // [neil, rob]

            console.log(`will run for date: ${date}`);
            service.addPickRule(new OnThisDate(date, rob_assignment, defaultSoundRole));
            state.begin();
            state.begin_new_role(date);

            // If however; we give rob a 'fixed date' then we expect this to be reversed
            let assignment = state.get_next_suitable_assignment_for(defaultSoundRole);
            console.log(`Received next suitable assign of: ${assignment.name}`);
            expect(assignment.person).toEqual(rob);

            // Move to the next date, and it'll be OK.
            state.current_date = new Date(2000, 1, 1);
            assignment = state.get_next_suitable_assignment_for(defaultSoundRole);
            expect(assignment.person).toEqual(neil);

        });

    })

});