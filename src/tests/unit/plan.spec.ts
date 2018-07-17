import {Person} from "../../scheduling/people";
import {AssignedToRoleCondition, OnThisDate, ScheduleOn} from "../../scheduling/rule_based/rules";
import {
    CleanupDefaultRoles,
    defaultAcousticGuitar,
    defaultBass,
    defaultKeysRole,
    defaultLeaderRole,
    defaultSaxRole,
    defaultSoundRole, SetupDefaultRoles
} from "../sample-data";
import {Plan} from "../../scheduling/plan";
import {RuleFacts} from "../../scheduling/rule_based/rule-facts";
import {Assignment} from "../../scheduling/assignment";
import {Team} from "../../scheduling/teams";
import {Role} from "../../scheduling/role";

describe('service', () => {
    let plan: Plan;
    let team: Team;
    let neil: Person;
    let cherilyn: Person;
    let tim: Person;

    beforeAll(() => {
        SetupDefaultRoles();
    });

    afterAll(() => {
        CleanupDefaultRoles();
    });

    beforeEach(() => {
        team = new Team("test team");
        cherilyn = team.add(new Person("Cherilyn"));
        neil = team.add(new Person("neil"));
        tim = team.add(new Person("Tim"));

        plan = new Plan("test", team);

    });

    it('should construct sensible names for duplicate plans', function () {
        expect(Plan.newPlanName('Plan')).toBe('Plan 2');
        expect(Plan.newPlanName('Plan 2')).toBe('Plan 3');
    });

    it('can add dependent roles', () => {
        let cher_assignment = plan.assignmentFor(cherilyn);
        cher_assignment.if_assigned_to(defaultLeaderRole).thenDo(new ScheduleOn(cherilyn, defaultKeysRole));

        expect(cher_assignment.roles.length).toEqual(1);
        let rules = cher_assignment.conditional_rules;
        expect(rules.length).toEqual(1);

        let first_rule = rules[0];
        expect(first_rule instanceof AssignedToRoleCondition).toBeTruthy();

        // TODO: could do more here
        // We don't test that the condition has actions, or that they fire
    });

    it('can return roles sorted by layout order', () => {
        let sr2 = plan.addRole(defaultSaxRole);
        let sr1 = plan.addRole(defaultLeaderRole);
        sr1.layout_priority = 3;
        sr2.layout_priority = 1;
        console.log(`Plan has roles: ${plan.roles}`);

        // Highest first
        let sorted = plan.roles_in_layout_order;
        console.log(`Sorted by layout order =: ${plan.roles}`);
        expect(sorted[0]).toEqual(sr1);
        expect(sorted[1]).toEqual(sr2);
    });

    it('can sort roles by priority, into groups', () => {
        plan.assignmentFor(neil).addRole(defaultSoundRole);
        plan.assignmentFor(tim).addRole(defaultAcousticGuitar);
        plan.assignmentFor(cherilyn).addRole(defaultLeaderRole);

        defaultSoundRole.setLayoutPriority(1);
        defaultAcousticGuitar.setLayoutPriority(1);
        defaultLeaderRole.setLayoutPriority(2);
        plan.addRole(defaultSoundRole);
        plan.addRole(defaultAcousticGuitar);
        plan.addRole(defaultLeaderRole);

        let groups = plan.roles_in_layout_order_grouped;
        console.log(`Groups are: ${groups}`);
        console.log(`Groups zero: ${groups[0]}`);
        console.log(`Groups one: ${groups[1]}`);
        expect(groups.length).toEqual(2, 'group length isnt correct');
        expect(groups[0].roles.length).toEqual(1, 'expected single with priority 1');
        expect(groups[1].roles.length).toEqual(2, 'expected two with priority 2');
    });

    describe('rules', () => {
        let rob: Person;
        let neil_assignment: Assignment, rob_assignment: Assignment;
        let state: RuleFacts;
        let date: Date;

        beforeEach(() => {
            date = new Date(2017, 10, 1);

            plan.addRole(defaultSaxRole);
            plan.addRole(defaultSoundRole);
            plan.addRole(defaultBass);

            neil_assignment = plan.assignmentFor(neil).addRole(defaultSaxRole, 3).addRole(defaultSoundRole, 1);

            rob = team.add(new Person("rob"));
            rob_assignment = plan.assignmentFor(rob).addRole(defaultBass).addRole(defaultSoundRole);

            state = new RuleFacts(plan);
            state.current_date = date;
        });

        it('should be able to remove a role from a plan', function () {
            // OK. doesn't make SENSE, but the method should work
            expect(plan.roles.indexOf(defaultSaxRole)).not.toBe(-1);
            plan.removeRole(defaultSaxRole);
            expect(plan.roles.indexOf(defaultSaxRole)).toBe(-1, 'role still there?');
        });

        it('creates role rules given people', () => {
            let pick_roles = plan.pick_rules();
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
            plan.addPickRule(new OnThisDate(date, rob_assignment, defaultSoundRole));
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