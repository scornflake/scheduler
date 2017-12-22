import {
    defaultAccousticGuitar,
    defaultBass,
    defaultComputerRole,
    defaultDrumsRole,
    defaultElectricGuitar,
    defaultKeysRole,
    defaultLeaderRole,
    defaultSaxRole,
    defaultSoundRole,
    defaultVocalsRole
} from "../../state/roles";

import {PeopleStore, Person} from "../../state/people";
import {AvailabilityEveryNOfM, AvailabilityUnit} from "../../state/scheduling-types";
import {RootStore} from "../../state/root";
import {ScheduleOn} from "../../scheduling/rule_based/rules";
import {Organization} from "../../state/organization";
import {csd} from "../../common/date-utils";

let neil: Person = new Person("Neil Clayton");
let cherilyn: Person = new Person("Cherilyn Clayton");
let christine: Person = new Person("Christine Edlin");
let stuart: Person = new Person("Stuart Cambell");
let jeremy_selfe: Person = new Person("Jeremy Selfe");

let daniel: Person = new Person("Daniel Gibbs");
let ben: Person = new Person("Ben Watson");
let courtney: Person = new Person("Courtney Anderson");
let robs: Person = new Person("Rob Swiney");
let robp: Person = new Person("Rob Penhey");
let dave: Person = new Person("Dave Humphries");
let ralph: Person = new Person("Ralph Lambert");
let anita: Person = new Person("Anita Lambert");
let annie: Person = new Person("Annie McMullen");
let jo: Person = new Person("Jo Marquet");
let allie: Person = new Person("Allie Pope");
let craig: Person = new Person("Craig Campbell");

let chris: Person = new Person("Chris Evans");
let jeremy_l: Person = new Person("Jeremy Legg");
let andre_l: Person = new Person("Andre Legg");
let jeremy_w: Person = new Person("Jeremy Watson");
let john: Person = new Person("John Sutherland");

allie.add_unavailable_range(new Date(2017, 11, 24), new Date(2018, 0, 7));
christine.add_unavailable_range(new Date(2018, 2, 0), new Date(2050, 1, 1));
craig.add_unavailable(new Date(2018, 0, 0));

jeremy_selfe.add_unavailable_range(csd(2018, 1, 7), csd(2018, 2, 4));
jeremy_selfe.add_unavailable(csd(2018, 3, 18));
jeremy_selfe.add_unavailable(csd(2018, 4, 1), "Easter Camp");

jeremy_w.add_unavailable(csd(2018, 1, 28));
jeremy_w.add_unavailable(csd(2018, 2, 11));

courtney.add_unavailable_range(csd(2018, 1, 8), csd(2018, 1, 12));

daniel.add_unavailable_range(csd(2018, 1, 25), csd(2018, 1, 29));
daniel.add_unavailable(csd(2018, 4, 1), "Easter Camp");

dave.add_unavailable_range(csd(2018, 1, 1), csd(2018, 1, 9), "After Jan 9th");

robp.add_unavailable_range(csd(2017, 4, 20), csd(2017, 4, 22));

chris.add_unavailable(csd(2018, 2, 4));
chris.add_unavailable(csd(2018, 2, 18));
chris.add_unavailable(csd(2018, 2, 25));

jeremy_l.add_unavailable(csd(2018, 2, 18));

neil.add_unavailable_range(csd(2018, 1, 4), csd(2018, 1, 28), "Brother over");

anita.add_unavailable_range(csd(2018, 3, 25), csd(2018, 3, 26));
ralph.add_unavailable_range(csd(2018, 3, 25), csd(2018, 3, 26));

john.add_unavailable(csd(2018, 4, 22));

export class ThamesTest {
    constructor() {
    }

    static SetupStore(root_store: RootStore) {
        let lynette = new Person("Lynette Mill");
        let eddie = new Person("Eddie");
        let donald = new Person("Donald");
        let levi = new Person("Levi");
        let brian = new Person("Brian");
        let zoe = new Person("Zoe");
        let paul = new Person("Paul");
        let shaz = new Person("Shaz");
        let aria = new Person("Aria");
        let bronwyn = new Person("Bronwyn");
        let foster = new Person("Foster");
        let elizabeth = new Person("Elizabeth");
        let gael = new Person("Gael");
        let bernard = new Person("Bernard");
        let felicia = new Person("Felicia");
        let henryk = new Person("Henryk");
        let rose = new Person("Rose");

        let person_store: PeopleStore = root_store.people_store;
        let org_store = root_store.organization_store;

        org_store.addOrganizaton(new Organization("Thames Baptist Church"));

        person_store.add_person(foster)
            .add_role(defaultComputerRole)
            .avail_every(12, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(lynette)
            .add_role(defaultLeaderRole)
            .set_availability(new AvailabilityEveryNOfM(2, 3));

        lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(lynette, defaultKeysRole));
        lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(eddie, defaultVocalsRole));
        lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(donald, defaultVocalsRole));
        lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(henryk, defaultSoundRole));
        lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(donald, defaultSaxRole));
        lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(donald, defaultAccousticGuitar));
        lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(levi, defaultBass));

        person_store.add_person(eddie)
            .add_role(defaultVocalsRole)
            .add_role(defaultSoundRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(donald)
            .add_role(defaultSoundRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(levi)
            .add_role(defaultBass)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(elizabeth)
            .add_role(defaultComputerRole)
            .avail_every(6, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(gael)
            .add_role(defaultComputerRole)
            .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(felicia)
            .add_role(defaultComputerRole)
            .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(rose)
            .add_role(defaultComputerRole)
            .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(bernard);

        person_store.add_person(henryk)
            .add_role(defaultSoundRole)
            .avail_every(10, AvailabilityUnit.EVERY_N_WEEKS);
        henryk.if_assigned_to(defaultSoundRole).then(new ScheduleOn(felicia, defaultComputerRole));

        person_store.add_person(shaz)
            .add_role(defaultLeaderRole)
            .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);

        shaz.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(shaz, defaultAccousticGuitar));
        shaz.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(bronwyn, defaultVocalsRole));
        shaz.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(aria, defaultDrumsRole));
        shaz.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(bernard, defaultSoundRole));

        person_store.add_person(brian)
            .add_role(defaultLeaderRole)
            .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);
        brian.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(zoe, defaultLeaderRole));
        brian.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(bronwyn, defaultVocalsRole));
        brian.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(donald, defaultSoundRole));
        brian.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(paul, defaultSaxRole));

        /*
        2 levels of availability.
        1) Always on when leader X is on (which is what we do now)
        2) Alternating people in a dependent role (weighting), when leader X is on
         */

        gael.add_unavailable(csd(2018, 3, 4), "trip");
        brian.add_unavailable_range(csd(2018, 2, 10), csd(2018, 3, 4));
        lynette.add_unavailable_range(csd(2017, 12, 24), csd(2018, 1, 28));
        // lynette.add_unavailable(csd(2018, 2, 11))
    }
}

export class NPBCStoreConstruction {
    constructor() {
    }

    static SetupStore(root_store: RootStore) {
        let person_store: PeopleStore = root_store.people_store;
        let org_store = root_store.organization_store;

        org_store.addOrganizaton(new Organization("North Porirua Baptist Church"));

        person_store.add_person(neil)
            .add_role(defaultSoundRole, 1)
            .add_role(defaultSaxRole, 3)
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(cherilyn)
            .add_role(defaultKeysRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        cherilyn.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(cherilyn, defaultKeysRole));

        person_store.add_person(christine)
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);
        christine.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(christine, defaultVocalsRole));

        person_store.add_person(stuart)
            .add_role(defaultAccousticGuitar)
            .add_role(defaultVocalsRole)
            .avail_every(6, AvailabilityUnit.EVERY_N_WEEKS);
        stuart.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(stuart, defaultAccousticGuitar));
        stuart.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(stuart, defaultVocalsRole));

        person_store.add_person(jeremy_selfe)
            .add_role(defaultLeaderRole, 2)
            .add_role(defaultElectricGuitar)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        jeremy_selfe.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(jeremy_selfe, defaultElectricGuitar));

        person_store.add_person(ralph)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);
        ralph.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(ralph, defaultAccousticGuitar));
        ralph.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(ralph, defaultVocalsRole));
        ralph.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(anita, defaultVocalsRole));


        person_store.add_person(daniel)
            .add_role(defaultDrumsRole, 3)
            .add_role(defaultBass);

        person_store.add_person(craig)
            .add_role(defaultDrumsRole)
            .avail_every(5, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(ben)
            .add_role(defaultDrumsRole, 1)
            // .add_role(defaultBass, 3)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(courtney)
            .add_role(defaultVocalsRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(robp)
            .add_role(defaultBass, 3)
            .add_role(defaultSoundRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(robs)
            .add_role(defaultBass)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(dave)
            .add_role(defaultAccousticGuitar)
            .add_role(defaultVocalsRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        dave.if_assigned_to(defaultAccousticGuitar).then(new ScheduleOn(dave, defaultVocalsRole));

        person_store.add_person(anita)
            .add_role(defaultVocalsRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(annie)
            .add_role(defaultVocalsRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(jo)
            .add_role(defaultVocalsRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(allie)
            .add_role(defaultVocalsRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(chris)
            .add_role(defaultSoundRole)
            // .add_role(defaultElectricGuitar)
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(jeremy_l)
            .add_role(defaultSoundRole, 2)
            .add_role(defaultComputerRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(andre_l)
            .add_role(defaultSoundRole)
            .add_role(defaultElectricGuitar)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(jeremy_w)
            .add_role(defaultSoundRole, 2)
            .add_role(defaultComputerRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(john)
            .add_role(defaultSoundRole)
            .add_role(defaultComputerRole, 2)
            .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);
    }
}
