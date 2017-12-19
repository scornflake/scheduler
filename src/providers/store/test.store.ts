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
import {AvailabilityUnit} from "../../state/scheduling-types";
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
let jo: Person = new Person("Jo");
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

neil.add_unavailable_range(csd(2018, 1, 4), csd(2018, 1, 28), "Brother over");

anita.add_unavailable_range(csd(2018, 3, 25), csd(2018, 3, 26));
ralph.add_unavailable_range(csd(2018, 3, 25), csd(2018, 3, 26));

john.add_unavailable(csd(2018, 4, 22));

export class TestStoreConstruction {
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
