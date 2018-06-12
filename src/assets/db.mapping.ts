import {Availability, AvailabilityEveryNOfM} from "../scheduling/availability";
import {SavedState} from "../store/UIState";
import {Team} from "../scheduling/teams";
import {Person} from "../scheduling/people";
import {Plan} from "../scheduling/plan";
import {Organization} from "../scheduling/organization";
import {Unavailability} from "../scheduling/unavailability";
import {ClassFieldMapping, MappingType, PropertyHint} from "../providers/mapping/orm-mapper-type";
import {FixedRoleOnDate, Rule, WeightedRoles} from "../scheduling/rule_based/rules";
import {csd} from "../scheduling/common/date-utils";

let scheduler_db_map: ClassFieldMapping = {
    classes: [
        {
            name: 'SavedState',
            fields: [
                {name: '*'} // means: discover the properties by yourself, everything
            ],
            factory: () => new SavedState()
        },
        {
            name: 'Person',
            fields: [
                {name: 'phone'},
                {name: 'email'},
                {name: 'availability', type: MappingType.NestedObject},
                {name: 'unavailable', type: MappingType.NestedObjectList}
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
                {name: 'manual_layouts', type: MappingType.MapWithReferenceValues, hint: PropertyHint.Date},
                {name: 'team', type: MappingType.Reference},
                {name: 'assignments', type: MappingType.NestedObjectList},
                {name: 'specific_role_rules', type: MappingType.NestedObjectList}
            ],
            inherit: 'NamedObject',
            factory: () => new Plan("New Plan", null)
        },
        {
            name: 'Rule',
            fields: [
                {name: 'priority'}
            ],
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
            inherit: 'TypedObject',
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
                {name: 'from_date', hint: PropertyHint.Date},
                {name: 'to_date', hint: PropertyHint.Date},
                {name: 'reason'},
            ],
            inherit: 'TypedObject',
            factory: () => new Unavailability()
        },

    ]
};

export {
    scheduler_db_map
}