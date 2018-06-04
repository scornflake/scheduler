import {SavedState} from "../../store/UIState";
import {Availability, AvailabilityEveryNOfM} from "../../scheduling/availability";
import {Person} from "../../scheduling/people";
import {Unavailablity} from "../../scheduling/unavailability";

class Creator {
    static makeNew(type: string) {
        switch (type) {
            case 'SavedState': {
                return new SavedState();
            }
            case 'Person': {
                return new Person();
            }
            case 'Availability': {
                return new Availability();
            }
            case 'AvailabilityEveryNOfM': {
                return new AvailabilityEveryNOfM();
            }
            case 'Unavailablity': {
                return new Unavailablity();
            }

            default:
                throw Error(`No type ${type} registered. Cannot create the object`);
        }
    }
}

export {
    Creator
}