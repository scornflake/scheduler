import {Availability, AvailabilityEveryNOfM} from "../scheduling/availability";
import {Person, Preferences} from "../scheduling/people";
import {Team} from "../scheduling/teams";
import {Plan} from "../scheduling/plan";
import {Organization} from "../scheduling/organization";
import {Unavailability} from "../scheduling/unavailability";
import {ClassFieldMapping, MappingType, PropertyHint} from "../providers/mapping/orm-mapper-type";
import {
    AssignedToRoleCondition,
    ConditionAction,
    ConditionalRule,
    FixedRoleOnDate,
    OnThisDate,
    Rule,
    ScheduleOn,
    SecondaryAction,
    TryToScheduleWith,
    WeightedRoles
} from "../scheduling/rule_based/rules";
import {csd} from "../scheduling/common/date-utils";
import {Role} from "../scheduling/role";
import {Assignment} from "../scheduling/assignment";
import {TypedObject} from "../scheduling/base-types";

let scheduler_db_map: ClassFieldMapping = {
    classes: [
        {
            name: 'Preferences',
            fields: [{name: '*'},],
            exclude: ['logger'],
            inherit: 'ObjectWithUUID',
            factory: () => new Preferences('Moooo')
        },
        {
            name: 'Role',
            fields: [
                {name: '*'}
            ],
            inherit: 'NamedObject',
            factory: () => new Role('New Role')
        },
        {
            name: 'Person',
            fields: [
                {name: 'phone'},
                {name: 'email'},
                {name: 'availability', type: MappingType.Reference},
                {name: 'unavailable', type: MappingType.NestedObjectList},
                {name: 'organization', type: MappingType.Reference},
                {name: 'preferences', type: MappingType.Reference}
            ],
            inherit: 'NamedObject',
            factory: () => new Person()
        },
        {
            name: 'Team',
            fields: [
                {name: 'people', type: MappingType.ReferenceList}
            ],
            inherit: 'NamedObject',
            factory: () => new Team("New Team")
        },
        {
            name: 'Plan',
            fields: [
                {name: 'start_date', hint: PropertyHint.Date},
                {name: 'end_date', hint: PropertyHint.Date},
                {name: 'days_per_period'},
                {name: 'roles', type: MappingType.ReferenceList},
                {name: 'team', type: MappingType.Reference},
                {name: 'assignments', type: MappingType.ReferenceList},
            ],
            inherit: 'NamedObject',
            factory: () => new Plan("New Plan", null)
        },
        /*
        Model
         */
        {
            name: 'Organization',
            inherit: 'NamedObject',
            factory: () => new Organization("New Org")
        },
        {
            name: 'Availability',
            fields: [
                {name: 'period'},
                {name: 'unit'},
            ],
            inherit: 'ObjectWithUUID',
            factory: () => new Availability()
        },
        {
            name: 'AvailabilityEveryNOfM',
            fields: [
                {name: 'period_to_look_at'},
            ],
            inherit: 'Availability',
            factory: () => new AvailabilityEveryNOfM()
        },
        {
            name: 'Unavailability',
            fields: [
                {name: 'fromDate', hint: PropertyHint.Date},
                {name: 'toDate', hint: PropertyHint.Date},
                {name: 'reason'},
            ],
            inherit: 'TypedObject',
            factory: () => new Unavailability()
        },
        {
            name: 'Assignment',
            fields: [
                {name: 'person', type: MappingType.Reference},
                {name: 'role_weightings', type: MappingType.MapWithReferenceKeys, hint: PropertyHint.Number},
                {
                    name: 'specific_roles',
                    type: MappingType.MapWithReferenceValues,
                    hint: PropertyHint.String
                },
                {name: 'condition_rules', type: MappingType.NestedObjectList},
                {name: 'secondary_action_list', type: MappingType.NestedObjectList}
            ],
            inherit: 'ObjectWithUUID',
            factory: () => new Assignment()
        },
        /*
        Rules
         */
        {
            name: 'Rule',
            fields: [
                {name: 'priority'}
            ],
            inherit: 'TypedObject',
            factory: () => new Rule()
        },
        {
            name: 'FixedRoleOnDate',
            fields: [
                {name: 'date', hint: PropertyHint.Date},
                {name: 'role', type: MappingType.Reference}
            ],
            inherit: 'Rule',
            factory: () => new FixedRoleOnDate(csd(2000, 1, 1), null)
        },
        {
            name: 'WeightedRoles',
            fields: [
                {name: 'weightedRoles', type: MappingType.MapWithReferenceKeys, hint: PropertyHint.Number},
            ],
            inherit: 'Rule',
            factory: () => new WeightedRoles()
        },
        {
            name: 'OnThisDate',
            fields: [
                {name: 'role', type: MappingType.Reference},
                {name: 'date', hint: PropertyHint.Date},
                {name: 'assignment', type: MappingType.Reference}
            ],
            inherit: 'Rule',
            factory: () => new OnThisDate(null, null, null)
        },
        {
            name: 'ConditionalRule',
            fields: [{name: 'actions', type: MappingType.NestedObjectList}],
            inherit: 'Rule',
            factory: () => new ConditionalRule()
        },
        {
            name: 'AssignedToRoleCondition',
            fields: [{name: 'role', type: MappingType.Reference}],
            inherit: 'ConditionalRule',
            factory: () => new AssignedToRoleCondition(null)
        },
        {
            name: 'SecondaryAction',
            fields: [
                {name: 'owner', type: MappingType.Reference}
            ],
            inherit: 'Rule',
            factory: () => new SecondaryAction()
        },
        {
            name: 'TryToScheduleWith',
            fields: [
                {name: 'other_person', type: MappingType.Reference},
                {name: 'reach', type: MappingType.Reference},
                {name: 'max_number_of_times'}
            ],
            inherit: 'SecondaryAction',
            factory: () => new TryToScheduleWith(null, null)
        },
        /*
        Actions
         */
        {
            name: 'ConditionAction',
            fields: [],
            inherit: 'Rule',
            factory: () => new ConditionAction()
        },
        {
            name: 'ScheduleOn',
            fields: [
                {name: 'role', type: MappingType.Reference},
                {name: 'person', type: MappingType.Reference}
            ],
            inherit: 'ConditionAction',
            factory: () => new ScheduleOn(null, null)
        },
    ]
};

export {
    scheduler_db_map
}