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

christine.addUnavailableRange(new Date(2018, 3, 0), new Date(2050, 1, 1));
craig.addUnavailable(new Date(2018, 0, 0));

export class TestStoreConstruction {
    constructor() {

    }

    static SetupStore(root_store: RootStore) {
        let person_store: PeopleStore = root_store.people_store;

        person_store.addPerson(neil)
            .addRole(defaultSoundRole, 1)
            .addRole(defaultSaxRole, 3)
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(cherilyn)
            .addRole(defaultKeysRole)
            .with_dep_role(defaultLeaderRole, [defaultKeysRole])
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(christine)
            .with_dep_role(defaultLeaderRole, [defaultVocalsRole])
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(stuart)
            .addRole(defaultAccousticGuitar)
            .addRole(defaultVocalsRole)
            .with_dep_role(defaultLeaderRole, [defaultAccousticGuitar, defaultVocalsRole])
            .avail_every(6, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(jeremy_selfe)
            .addRole(defaultLeaderRole, 2)
            .addRole(defaultElectricGuitar)
            .with_dep_role(defaultLeaderRole, [defaultElectricGuitar])
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(ralph)
            .with_dep_role(defaultLeaderRole, [defaultAccousticGuitar, defaultVocalsRole])
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);


        person_store.addPerson(daniel)
            .addRole(defaultDrumsRole, 3)
            .addRole(defaultBass);

        person_store.addPerson(craig)
            .addRole(defaultDrumsRole)
            .avail_every(5, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(ben)
            .addRole(defaultDrumsRole, 1)
            .addRole(defaultBass, 3)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(courtney)
            .addRole(defaultVocalsRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(robp)
            .addRole(defaultBass, 3)
            .addRole(defaultSoundRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(robs)
            .addRole(defaultBass)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(dave)
            .addRole(defaultAccousticGuitar)
            .addRole(defaultVocalsRole)
            .with_dep_role(defaultAccousticGuitar, [defaultVocalsRole])
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(anita)
            .addRole(defaultVocalsRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(annie)
            .addRole(defaultVocalsRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(jo)
            .addRole(defaultVocalsRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(allie)
            .addRole(defaultVocalsRole)
            .avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(chris)
            .addRole(defaultSoundRole)
            // .addRole(defaultElectricGuitar)
            .avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(jeremy_l)
            .addRole(defaultSoundRole)
            .addRole(defaultComputerRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(andre_l)
            .addRole(defaultSoundRole)
            .addRole(defaultElectricGuitar)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(jeremy_w)
            .addRole(defaultSoundRole, 2)
            .addRole(defaultComputerRole)
            .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);

        person_store.addPerson(john)
            .addRole(defaultSoundRole)
            .addRole(defaultComputerRole, 2)
            .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);
    }
}
