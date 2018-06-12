import {Availability, AvailabilityEveryNOfM} from "../scheduling/availability";
import {SavedState} from "../store/UIState";
import {Team} from "../scheduling/teams";
import {Person} from "../scheduling/people";
import {Plan} from "../scheduling/plan";
import {Organization} from "../scheduling/organization";
import {Unavailability} from "../scheduling/unavailability";
import {ClassFieldMapping, MappingType, PropertyHint} from "../providers/mapping/orm-mapper-type";

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
                {name: 'manual_layouts', type: MappingType.ReferenceMap, hint: PropertyHint.Date},
                {name: 'team', type: MappingType.Reference}
            ],
            inherit: 'NamedObject',
            factory: () => new Plan("New Plan", null)
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