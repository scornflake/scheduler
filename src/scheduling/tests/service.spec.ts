import {Person} from "../people";
import {AssignedToRoleCondition, OnThisDate, ScheduleOn} from "../rule_based/rules";
import {
    defaultAcousticGuitar,
    defaultBass,
    defaultKeysRole,
    defaultLeaderRole,
    defaultSaxRole,
    defaultSoundRole, SetupDefaultRoles
} from "./sample-data";
import {Service, ServiceRole} from "../service";
import {RuleFacts} from "../rule_based/rule-facts";
import {Assignment} from "../assignment";
import {Team} from "../teams";

describe('service', () => {
    let service: Service;
    let team: Team;
    let neil: Person;
    let cherilyn: Person;
    let tim: Person;

    beforeEach(() => {
        team = new Team("test team");
        cherilyn = team.add_person(new Person("Cherilyn"));
        neil = team.add_person(new Person("neil"));
        tim = team.add_person(new Person("Tim"));

        service = new Service("test", team);

        SetupDefaultRoles();
    });

    it('can add dependent roles', () => {
        let cher_assignment = service.assignment_for(cherilyn);
        cher_assignment.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(cherilyn, defaultKeysRole));

        expect(cher_assignment.roles.length).toEqual(1);
        let rules = cher_assignment.conditional_rules;
        expect(rules.length).toEqual(1);

        let first_rule = rules[0];
        expect(first_rule instanceof AssignedToRoleCondition).toBeTruthy();

        // TODO: could do more here
        // We don't test that the condition has actions, or that they fire
    });

    it('can sort people by role layout priority', () => {
        // people are in roles. Get a list of people based on their max role layout priority
        let leader = service.add_role(defaultLeaderRole);
        leader.layout_priority = 10;
        let keys = service.add_role(defaultKeysRole);
        keys.layout_priority = 5;
        let gopher = service.add_role(new ServiceRole("Gopher"));

        let tim = team.add_person(new Person("Tim"));
        let janice = team.add_person(new Person("Janice"));

        // Tim = Keys
        let p2 = service.assignment_for(tim).add_role(keys);

        // Janice = Gopher
        let p3 = service.assignment_for(janice).add_role(gopher);

        // Neil = Gopher + Leader
        let neil_assignment = service.assignment_for(neil).add_role(gopher).add_role(leader);

        // // Expect Neil, Tim, Janice
        // let ordered = service.people();
        // expect(ordered[0]).toEqual(p1.person);
        // expect(ordered[1]).toEqual(p2.person);
        // expect(ordered[2]).toEqual(p3.person);
    });

    it('can return roles sorted by layout order', () => {
        let sr2 = service.add_role(defaultSaxRole);
        let sr1 = service.add_role(defaultLeaderRole);
        sr1.layout_priority = 3;

        // Highest first
        let sorted = service.roles_in_layout_order;
        expect(sorted[0]).toEqual(sr1);
        expect(sorted[1]).toEqual(sr2);
    });

    it('can sort roles by priority, into groups', () => {
        service.assignment_for(neil).add_role(defaultSoundRole);
        service.assignment_for(tim).add_role(defaultAcousticGuitar);
        service.assignment_for(cherilyn).add_role(defaultLeaderRole);

        defaultSoundRole.layout_priority = 1;
        defaultAcousticGuitar.layout_priority = 1;
        defaultLeaderRole.layout_priority = 2;
        service.add_role(defaultSoundRole);
        service.add_role(defaultAcousticGuitar);
        service.add_role(defaultLeaderRole);

        let groups = service.roles_in_layout_order_grouped;
        console.log(`Groups are: ${groups}`);
        console.log(`Groups zero: ${groups[0]}`);
        console.log(`Groups one: ${groups[1]}`);
        expect(groups.length).toEqual(2, 'group length isnt correct');
        expect(groups[0].length).toEqual(1, 'expected single with priority 1');
        expect(groups[1].length).toEqual(2, 'expected two with priority 2');
    });

    describe('rules', () => {
        let rob: Person;
        let neil_assignment: Assignment, rob_assignment: Assignment;
        let state: RuleFacts;
        let date: Date;

        beforeEach(() => {
            date = new Date(2017, 10, 1);

            service.add_role(defaultSaxRole);
            service.add_role(defaultSoundRole);
            service.add_role(defaultBass);

            neil_assignment = service.assignment_for(neil).add_role(defaultSaxRole, 3).add_role(defaultSoundRole, 1);

            rob = team.add_person(new Person("rob"));
            rob_assignment = service.assignment_for(rob).add_role(defaultBass).add_role(defaultSoundRole);

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