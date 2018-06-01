import {PeopleStore, Person} from "../../scheduling/people";
import {Availability, AvailabilityEveryNOfM, AvailabilityUnit} from "../../scheduling/availability";
import {ScheduleOn, TryToScheduleWith} from "../../scheduling/rule_based/rules";
import {Organization, OrganizationStore} from "../../scheduling/organization";
import {csd} from "../../scheduling/common/date-utils";
import {RootStore} from "../../store/root";
import {
    defaultAcousticGuitar, defaultBass, defaultComputerRole, defaultDrumsRole, defaultElectricGuitar,
    defaultKeysRole,
    defaultLeaderRole,
    defaultSaxRole,
    defaultSoundRole,
    defaultVocalsRole
} from "../../scheduling/tests/sample-data";
import {RolesStore} from "../../scheduling/tests/role-store";
import {Service} from "../../scheduling/service";


export class NPBCStoreConstruction {
    constructor() {
    }

    static SetupStore(person_store: PeopleStore, org_store: OrganizationStore, service: Service) {
        let neil = person_store.find_person_with_name("Neil Clayton");
        let cherilyn = person_store.find_person_with_name("Cherilyn Clayton");
        let kylie = person_store.find_person_with_name("Kylie Welch-Herekiuha");
        let christine = person_store.find_person_with_name("Christine Edlin");
        let stuart = person_store.find_person_with_name("Stuart Campbell");
        let jeremy_selfe = person_store.find_person_with_name("Jeremy Selfe");

        let daniel = person_store.find_person_with_name("Daniel Gibbs");
        let ben = person_store.find_person_with_name("Ben Watson");
        let courtney = person_store.find_person_with_name("Courtney Anderson");
        let robs = person_store.find_person_with_name("Rob Sweeney");
        let robp = person_store.find_person_with_name("Rob Penhey");
        let dave = person_store.find_person_with_name("Dave Humphries");
        let ralph = person_store.find_person_with_name("Ralph Lambert");
        let anita = person_store.find_person_with_name("Anita Lambert");
        let annie = person_store.find_person_with_name("Annie McMullen");
        let jo = person_store.find_person_with_name("Jo Marquet");
        let allie = person_store.find_person_with_name("Allie Pope");
        let craig = person_store.find_person_with_name("Craig Campbell");

        let chris = person_store.find_person_with_name("Chris Evans");
        let jeremy_l = person_store.find_person_with_name("Jeremy Legg");
        let andre_l = person_store.find_person_with_name("Andre Legg");
        let suzie_l = person_store.find_person_with_name("Suzie Legg");
        let jeremy_w = person_store.find_person_with_name("Jeremy Watson");
        let john_sutherland = person_store.find_person_with_name("John Sutherland");

        /*
        Add unavailability here
         */
        chris.add_unavailable(csd(2018, 7, 15));

        jeremy_selfe.add_unavailable(csd(2018, 6, 3));
        jeremy_selfe.add_unavailable(csd(2018, 7, 1));

        cherilyn.add_unavailable_range(csd(2018, 7, 14), csd(2018, 7, 29));
        cherilyn.add_unavailable(csd(2018, 6, 17), 'ob meeting');
        cherilyn.add_unavailable(csd(2018, 7, 1), 'ob meeting');
        cherilyn.add_unavailable(csd(2018, 8, 19), 'mental health!');

        christine.add_unavailable(csd(2018, 5, 6));
        christine.add_unavailable(csd(2018, 6, 17));
        christine.add_unavailable(csd(2018, 7, 22));

        jeremy_l.add_unavailable(csd(2018, 6, 17));

        jeremy_w.add_unavailable(csd(2018, 6, 3));
        jeremy_w.add_unavailable(csd(2018, 7, 8));
        jeremy_w.add_unavailable(csd(2018, 7, 22));

        stuart.add_unavailable_range(csd(2018, 8, 12), csd(2018, 9, 9));

        allie.add_unavailable(csd(2018, 6, 3));
        allie.add_unavailable(csd(2018, 7, 22));

        craig.add_unavailable_range(csd(2018, 8, 12), csd(2018, 9, 9));

        /*
        Add specifics here
        */
        // daniel.put_on_specific_role_for_date(defaultComputerRole, csd(2018, 6, 17));


        org_store.addOrganizaton(new Organization("North Porirua Baptist Church"));

        neil.avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);
        cherilyn.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        christine.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        stuart.avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);
        kylie.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        jeremy_selfe.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        ralph.avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);
        craig.set_availability(new AvailabilityEveryNOfM(1, 3));
        ben.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        courtney.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        robp.avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);
        robs.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        dave.avail_every(2.2, AvailabilityUnit.EVERY_N_WEEKS);
        annie.avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);
        anita.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        jo.avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);
        allie.avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);
        chris.avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);
        jeremy_l.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        andre_l.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        suzie_l.avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);
        jeremy_w.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        john_sutherland.avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);


        service.add_person(neil)
            .add_role(defaultSoundRole, 1)
            .add_role(defaultSaxRole, 3)
            .add_secondary_action(new TryToScheduleWith(cherilyn, new Availability(1, AvailabilityUnit.EVERY_N_WEEKS), 2));

        service.add_person(cherilyn)
            .add_role(defaultKeysRole)
            .if_assigned_to(defaultLeaderRole).then(new ScheduleOn(cherilyn, defaultKeysRole));

        service.add_person(christine)
            .add_role(defaultVocalsRole);
        // christine.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(christine, defaultVocalsRole));

        let stuart_assignment = service.add_person(stuart);
        stuart_assignment
            .add_role(defaultAcousticGuitar)
            .add_role(defaultVocalsRole)
            .if_assigned_to(defaultLeaderRole).then(new ScheduleOn(stuart, defaultAcousticGuitar));
        stuart_assignment.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(stuart, defaultVocalsRole));

        service.add_person(kylie)
            .add_role(defaultAcousticGuitar)
            .if_assigned_to(defaultAcousticGuitar).then(new ScheduleOn(kylie, defaultVocalsRole));

        service.add_person(jeremy_selfe)
            .add_role(defaultLeaderRole, 2)
            .add_role(defaultElectricGuitar)
            .if_assigned_to(defaultLeaderRole).then(new ScheduleOn(jeremy_selfe, defaultElectricGuitar));

        service.add_person(ralph)
            .add_role(defaultAcousticGuitar)
            .if_assigned_to(defaultAcousticGuitar).then(new ScheduleOn(anita, defaultVocalsRole));

        service.add_person(daniel)
            .add_role(defaultDrumsRole, 3)
            .add_role(defaultBass);

        service.add_person(craig)
            .add_role(defaultDrumsRole);

        service.add_person(ben)
            .add_role(defaultBass, 1);

        service.add_person(courtney)
            .add_role(defaultVocalsRole);

        service.add_person(robp)
            .add_role(defaultBass, 3)
            .add_role(defaultSoundRole);

        service.add_person(robs)
            .add_role(defaultBass);

        service.add_person(dave)
            .add_role(defaultAcousticGuitar)
            .add_role(defaultVocalsRole)
            .if_assigned_to(defaultAcousticGuitar).then(new ScheduleOn(dave, defaultVocalsRole));

        service.add_person(anita)
            .add_role(defaultVocalsRole);

        service.add_person(annie)
            .add_role(defaultVocalsRole);

        service.add_person(jo)
            .add_role(defaultVocalsRole);

        service.add_person(allie)
            .add_role(defaultVocalsRole);

        service.add_person(chris)
            .add_role(defaultSoundRole)
            .add_role(defaultElectricGuitar);

        service.add_person(jeremy_l)
            .add_role(defaultSoundRole, 2)
            .add_role(defaultComputerRole);

        service.add_person(andre_l)
            .add_role(defaultSoundRole)
            .add_role(defaultElectricGuitar);

        service.add_person(suzie_l)
            .add_role(defaultElectricGuitar);

        service.add_person(jeremy_w)
            .add_role(defaultSoundRole, 2)
            .add_role(defaultComputerRole);

        service.add_person(john_sutherland)
            .add_role(defaultSoundRole)
            .add_role(defaultComputerRole, 2)
    }

    static SetupPeople(people_store: PeopleStore) {
        people_store.add_person(new Person("Neil Clayton"));
        people_store.add_person(new Person("Cherilyn Clayton"));
        people_store.add_person(new Person("Kylie Welch-Herekiuha"));
        people_store.add_person(new Person("Christine Edlin"));
        people_store.add_person(new Person("Stuart Campbell"));
        people_store.add_person(new Person("Jeremy Selfe"));

        people_store.add_person(new Person("Daniel Gibbs"));
        people_store.add_person(new Person("Ben Watson"));
        people_store.add_person(new Person("Courtney Anderson"));
        people_store.add_person(new Person("Rob Sweeney"));
        people_store.add_person(new Person("Rob Penhey"));
        people_store.add_person(new Person("Dave Humphries"));
        people_store.add_person(new Person("Ralph Lambert"));
        people_store.add_person(new Person("Anita Lambert"));
        people_store.add_person(new Person("Annie McMullen"));
        people_store.add_person(new Person("Jo Marquet"));
        people_store.add_person(new Person("Allie Pope"));
        people_store.add_person(new Person("Craig Campbell"));

        people_store.add_person(new Person("Chris Evans"));
        people_store.add_person(new Person("Jeremy Legg"));
        people_store.add_person(new Person("Andre Legg"));
        people_store.add_person(new Person("Suzie Legg"));
        people_store.add_person(new Person("Jeremy Watson"));
        people_store.add_person(new Person("John Sutherland"));


    }

    static SetupRoles(roles_store: RolesStore) {
        roles_store.addRoles([
            // defaultSpeakerRole,
            // defaultThemeRole,
            defaultLeaderRole,
            defaultSoundRole,
            defaultComputerRole,
            defaultKeysRole,
            defaultVocalsRole,
            defaultDrumsRole,
            defaultBass,
            defaultAcousticGuitar,
            defaultElectricGuitar,
            defaultSaxRole
        ]);
    }
}


export class ThamesTest {
    constructor() {
    }

    static SetupStore(root_store: RootStore) {
        // let lynette = new Person("Lynette Mill");
        // let eddie = new Person("Eddie");
        // let donald = new Person("Donald");
        // let levi = new Person("Levi");
        // let brian = new Person("Brian");
        // let zoe = new Person("Zoe");
        // let paul = new Person("Paul");
        // let shaz = new Person("Shaz");
        // let aria = new Person("Aria");
        // let bronwyn = new Person("Bronwyn");
        // let foster = new Person("Foster");
        // let elizabeth = new Person("Elizabeth");
        // let gael = new Person("Gael");
        // let bernard = new Person("Bernard");
        // let felicia = new Person("Felicia");
        // let henryk = new Person("Henryk");
        // let rose = new Person("Rose");
        //
        // let org_store = root_store.organization_store;
        //
        // org_store.addOrganizaton(new Organization("Thames Baptist Church"));

        // person_store.add_person(foster)
        //     .add_role(defaultComputerRole)
        //     .avail_every(12, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // person_store.add_person(lynette)
        //     .add_role(defaultLeaderRole)
        //     .set_availability(new AvailabilityEveryNOfM(2, 3));
        //
        // lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(lynette, defaultKeysRole));
        // lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(eddie, defaultVocalsRole));
        // lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(donald, defaultVocalsRole));
        // lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(henryk, defaultSoundRole));
        // lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(donald, defaultSaxRole));
        // lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(donald, defaultAcousticGuitar));
        // lynette.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(levi, defaultBass));
        //
        // person_store.add_person(eddie)
        //     .add_role(defaultVocalsRole)
        //     .add_role(defaultSoundRole)
        //     .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // person_store.add_person(donald)
        //     .add_role(defaultSoundRole)
        //     .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // person_store.add_person(levi)
        //     .add_role(defaultBass)
        //     .avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // person_store.add_person(elizabeth)
        //     .add_role(defaultComputerRole)
        //     .avail_every(6, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // person_store.add_person(gael)
        //     .add_role(defaultComputerRole)
        //     .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // person_store.add_person(felicia)
        //     .add_role(defaultComputerRole)
        //     .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // person_store.add_person(rose)
        //     .add_role(defaultComputerRole)
        //     .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // person_store.add_person(bernard);
        //
        // person_store.add_person(henryk)
        //     .add_role(defaultSoundRole)
        //     .avail_every(10, AvailabilityUnit.EVERY_N_WEEKS);
        // henryk.if_assigned_to(defaultSoundRole).then(new ScheduleOn(felicia, defaultComputerRole));
        //
        // person_store.add_person(shaz)
        //     .add_role(defaultLeaderRole)
        //     .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);
        //
        // shaz.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(shaz, defaultAcousticGuitar));
        // shaz.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(bronwyn, defaultVocalsRole));
        // shaz.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(aria, defaultDrumsRole));
        // shaz.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(bernard, defaultSoundRole));
        //
        // person_store.add_person(brian)
        //     .add_role(defaultLeaderRole)
        //     .avail_every(1, AvailabilityUnit.EVERY_N_WEEKS);
        // brian.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(zoe, defaultLeaderRole));
        // brian.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(bronwyn, defaultVocalsRole));
        // brian.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(donald, defaultSoundRole));
        // brian.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(paul, defaultSaxRole));
        //
        // /*
        // 2 levels of availability.
        // 1) Always on when leader X is on (which is what we do now)
        // 2) Alternating people in a dependent role (weighting), when leader X is on
        //  */
        //
        // gael.add_unavailable(csd(2018, 3, 4), "trip");
        // brian.add_unavailable_range(csd(2018, 2, 10), csd(2018, 3, 4));
        // lynette.add_unavailable_range(csd(2017, 12, 24), csd(2018, 1, 28));
        // // lynette.add_unavailable(csd(2018, 2, 11))
    }
}
