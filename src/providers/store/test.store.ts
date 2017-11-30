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
import {DependentPlacementRule} from "../../scheduling/rule_based/rules";

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

christine.add_unavailable_range(new Date(2018, 3, 0), new Date(2050, 1, 1));
craig.add_unavailable(new Date(2018, 0, 0));

export class TestStoreConstruction {
    constructor() {

    }

    static SetupStore(root_store: RootStore) {
        let person_store: PeopleStore = root_store.people_store;

        person_store.add_person(neil)
            .add_role(defaultSoundRole, 1)
            .add_role(defaultSaxRole, 3)
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(cherilyn)
            .add_role(defaultKeysRole)
            .when_in_role(defaultLeaderRole, [defaultKeysRole])
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(christine)
            .when_in_role(defaultLeaderRole, [defaultVocalsRole])
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(stuart)
            .add_role(defaultAccousticGuitar)
            .add_role(defaultVocalsRole)
            .when_in_role(defaultLeaderRole, [defaultAccousticGuitar, defaultVocalsRole])
            .avail_every(6, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(jeremy_selfe)
            .add_role(defaultLeaderRole, 2)
            .add_role(defaultElectricGuitar)
            .when_in_role(defaultLeaderRole, [defaultElectricGuitar])
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(ralph)
            .when_in_role(defaultLeaderRole, [defaultAccousticGuitar, defaultVocalsRole])
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);


        person_store.add_person(daniel)
            .add_role(defaultDrumsRole, 3)
            .add_role(defaultBass);

        person_store.add_person(craig)
            .add_role(defaultDrumsRole)
            .avail_every(5, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(ben)
            .add_role(defaultDrumsRole, 1)
            .add_role(defaultBass, 3)
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
            .when_in_role(defaultAccousticGuitar, [defaultVocalsRole])
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

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
            // .addRole(defaultElectricGuitar)
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.add_person(jeremy_l)
            .add_role(defaultSoundRole)
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
