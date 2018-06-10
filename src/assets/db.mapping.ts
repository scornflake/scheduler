import {ClassFieldMapping} from "../providers/mapping/mapper";
import {PersistenceType} from "../providers/server/db-types";
import {Availability, AvailabilityEveryNOfM} from "../scheduling/availability";

let scheduler_db_map: ClassFieldMapping = {
    classes: [
        {
            name: 'SavedState',
            fields: [
                {name: '*'} // means: discover the properties by yourself, everything
            ],
        },
        {
            name: 'Person',
            fields: [
                {name: 'phone'},
                {name: 'email'},
                {name: 'availability', type: PersistenceType.NestedObject},
                {name: 'unavailable', type: PersistenceType.NestedObjectList}
            ],
            inherit: 'NamedObject'
        },
        {
            name: 'Team',
            fields: [
                {name: 'people', type: PersistenceType.ReferenceList}
            ],
            inherit: 'NamedObject'
        },
        {
            name: 'Plan',
            fields: [
                {name: 'start_date'},
                {name: 'end_date'},
                {name: 'days_per_period'},
                {name: 'manual_layouts', type: PersistenceType.ReferenceList},
                {name: 'team', type: PersistenceType.Reference}
            ],
            inherit: 'NamedObject'
        },
        {
            name: 'Organization',
            inherit: 'NamedObject'
        },
        {
            name: 'Availability',
            fields: [
                {name: 'period'},
                {name: 'unit'},
            ],
            inherit: 'TypeObject'
        },
        {
            name: 'AvailabilityEveryNOfM',
            fields: [
                {name: 'period_to_look_at'},
            ],
            inherit: 'Availability'
        },
        {
            name: 'Unavailability',
            fields: [
                {name: 'from_date'},
                {name: 'to_date'},
                {name: 'reason'},
            ],
            inherit: 'TypeObject'
        },

    ]
};

export {
    scheduler_db_map
}