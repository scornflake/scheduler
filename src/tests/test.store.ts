import {Person} from "../scheduling/people";
import {Availability, AvailabilityEveryNOfM, AvailabilityUnit} from "../scheduling/availability";
import {ScheduleOn, TryToScheduleWith} from "../scheduling/rule_based/rules";
import {csd} from "../scheduling/common/date-utils";
import {RootStore} from "../store/root";
import {
    defaultAcousticGuitar,
    defaultBass,
    defaultComputerRole,
    defaultDrumsRole,
    defaultElectricGuitar,
    defaultKeysRole,
    defaultLeaderRole,
    defaultSaxRole,
    defaultSoundRole,
    defaultVocalsRole,
    SetupDefaultRoles
} from "./sample-data";
import {Plan} from "../scheduling/plan";
import {Team} from "../scheduling/teams";
import {Organization} from "../scheduling/organization";
import {PeopleManager} from "../scheduling/common/scheduler-store";


export class NPBCStoreConstruction {
    constructor() {
    }

    static SetupOrganization(org_store, name: string) {
        let org = org_store.find_by_name(name);
        if (!org) {
            let organization = new Organization(name);
            org_store.add_organisation(organization);
            return organization;
        }
        return null;
    }

    static SetupTeamUnavailability(team: Team) {
        let neil = team.findPersonWithName("Neil Clayton");
        let cherilyn = team.findPersonWithName("Cherilyn Clayton");
        let kylie = team.findPersonWithName("Kylie Welch-Herekiuha");
        let christine = team.findPersonWithName("Christine Edlin");
        let stuart = team.findPersonWithName("Stuart Campbell");
        let jeremy_selfe = team.findPersonWithName("Jeremy Selfe");

        let daniel = team.findPersonWithName("Daniel Gibbs");
        let ben = team.findPersonWithName("Ben Watson");
        let courtney = team.findPersonWithName("Courtney Anderson");
        let robs = team.findPersonWithName("Rob Sweeney");
        let robp = team.findPersonWithName("Rob Penhey");
        let dave = team.findPersonWithName("Dave Humphries");
        let ralph = team.findPersonWithName("Ralph Lambert");
        let anita = team.findPersonWithName("Anita Lambert");
        let annie = team.findPersonWithName("Annie McMullen");
        let jo = team.findPersonWithName("Jo Marquet");
        let allie = team.findPersonWithName("Allie Pope");
        let craig = team.findPersonWithName("Craig Campbell");

        let chris = team.findPersonWithName("Chris Evans");
        let jeremy_l = team.findPersonWithName("Jeremy Legg");
        let andre_l = team.findPersonWithName("Andre Legg");
        let suzie_l = team.findPersonWithName("Suzie Legg");
        let jeremy_w = team.findPersonWithName("Jeremy Watson");
        let john_sutherland = team.findPersonWithName("John Sutherland");


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


    }

    static AddPeopleToPlanWithRoles(service: Plan, team: Team) {
        let neil = team.findPersonWithName("Neil Clayton");
        let cherilyn = team.findPersonWithName("Cherilyn Clayton");
        let kylie = team.findPersonWithName("Kylie Welch-Herekiuha");
        let christine = team.findPersonWithName("Christine Edlin");
        let stuart = team.findPersonWithName("Stuart Campbell");
        let jeremy_selfe = team.findPersonWithName("Jeremy Selfe");

        let daniel = team.findPersonWithName("Daniel Gibbs");
        let ben = team.findPersonWithName("Ben Watson");
        let courtney = team.findPersonWithName("Courtney Anderson");
        let robs = team.findPersonWithName("Rob Sweeney");
        let robp = team.findPersonWithName("Rob Penhey");
        let dave = team.findPersonWithName("Dave Humphries");
        let ralph = team.findPersonWithName("Ralph Lambert");
        let anita = team.findPersonWithName("Anita Lambert");
        let annie = team.findPersonWithName("Annie McMullen");
        let jo = team.findPersonWithName("Jo Marquet");
        let allie = team.findPersonWithName("Allie Pope");
        let craig = team.findPersonWithName("Craig Campbell");

        let chris = team.findPersonWithName("Chris Evans");
        let jeremy_l = team.findPersonWithName("Jeremy Legg");
        let andre_l = team.findPersonWithName("Andre Legg");
        let suzie_l = team.findPersonWithName("Suzie Legg");
        let jeremy_w = team.findPersonWithName("Jeremy Watson");
        let john_sutherland = team.findPersonWithName("John Sutherland");


        service.assignment_for(neil)
            .add_role(defaultSoundRole, 1)
            .add_role(defaultSaxRole, 3)
            .add_secondary_action(new TryToScheduleWith(cherilyn, new Availability(1, AvailabilityUnit.EVERY_N_WEEKS), 2));

        service.assignment_for(cherilyn)
            .add_role(defaultKeysRole)
            .if_assigned_to(defaultLeaderRole).then(new ScheduleOn(cherilyn, defaultKeysRole));

        service.assignment_for(christine)
            .add_role(defaultVocalsRole);
        // christine.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(christine, defaultVocalsRole));

        let stuart_assignment = service.assignment_for(stuart);
        stuart_assignment
            .add_role(defaultAcousticGuitar)
            .add_role(defaultVocalsRole)
            .if_assigned_to(defaultLeaderRole).then(new ScheduleOn(stuart, defaultAcousticGuitar));
        stuart_assignment.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(stuart, defaultVocalsRole));

        service.assignment_for(kylie)
            .add_role(defaultAcousticGuitar)
            .if_assigned_to(defaultAcousticGuitar).then(new ScheduleOn(kylie, defaultVocalsRole));

        service.assignment_for(jeremy_selfe)
            .add_role(defaultLeaderRole, 2)
            .add_role(defaultElectricGuitar)
            .if_assigned_to(defaultLeaderRole).then(new ScheduleOn(jeremy_selfe, defaultElectricGuitar));

        service.assignment_for(ralph)
            .add_role(defaultAcousticGuitar)
            .if_assigned_to(defaultAcousticGuitar).then(new ScheduleOn(anita, defaultVocalsRole));

        service.assignment_for(daniel)
            .add_role(defaultDrumsRole, 3)
            .add_role(defaultBass);

        service.assignment_for(craig)
            .add_role(defaultDrumsRole);

        service.assignment_for(ben)
            .add_role(defaultBass, 1);

        service.assignment_for(courtney)
            .add_role(defaultVocalsRole);

        service.assignment_for(robp)
            .add_role(defaultBass, 3)
            .add_role(defaultSoundRole);

        service.assignment_for(robs)
            .add_role(defaultBass);

        service.assignment_for(dave)
            .add_role(defaultAcousticGuitar)
            .add_role(defaultVocalsRole)
            .if_assigned_to(defaultAcousticGuitar).then(new ScheduleOn(dave, defaultVocalsRole));

        service.assignment_for(anita)
            .add_role(defaultVocalsRole);

        service.assignment_for(annie)
            .add_role(defaultVocalsRole);

        service.assignment_for(jo)
            .add_role(defaultVocalsRole);

        service.assignment_for(allie)
            .add_role(defaultVocalsRole);

        service.assignment_for(chris)
            .add_role(defaultSoundRole)
            .add_role(defaultElectricGuitar);

        service.assignment_for(jeremy_l)
            .add_role(defaultSoundRole, 2)
            .add_role(defaultComputerRole);

        service.assignment_for(andre_l)
            .add_role(defaultSoundRole)
            .add_role(defaultElectricGuitar);

        service.assignment_for(suzie_l)
            .add_role(defaultElectricGuitar);

        service.assignment_for(jeremy_w)
            .add_role(defaultSoundRole, 2)
            .add_role(defaultComputerRole);

        service.assignment_for(john_sutherland)
            .add_role(defaultSoundRole)
            .add_role(defaultComputerRole, 2)
    }

    static SetupPeople(people_store: PeopleManager): Array<Person> {
        let people_added = [];

        function aint(name: string) {
            let person = people_store.firstThisTypeByName(name);
            if (person == null) {
                let p = people_store.add(new Person(name));
                people_added.push(p);
                return p;
            }
            return person;
        }

        let neil = aint("Neil Clayton");
        let cherilyn = aint("Cherilyn Clayton");
        let kylie = aint("Kylie Welch-Herekiuha");
        let christine = aint("Christine Edlin");
        let stuart = aint("Stuart Campbell");
        let jeremy_selfe = aint("Jeremy Selfe");

        let daniel = aint("Daniel Gibbs");
        let ben = aint("Ben Watson");
        let courtney = aint("Courtney Anderson");
        let robs = aint("Rob Sweeney");
        let robp = aint("Rob Penhey");
        let dave = aint("Dave Humphries");
        let ralph = aint("Ralph Lambert");
        let anita = aint("Anita Lambert");
        let annie = aint("Annie McMullen");
        let jo = aint("Jo Marquet");
        let allie = aint("Allie Pope");
        let craig = aint("Craig Campbell");

        let chris = aint("Chris Evans");
        let jeremy_l = aint("Jeremy Legg");
        let andre_l = aint("Andre Legg");
        let suzie_l = aint("Suzie Legg");
        let jeremy_w = aint("Jeremy Watson");
        let john_sutherland = aint("John Sutherland");

        neil.avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);
        cherilyn.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        christine.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        stuart.avail_every(4, AvailabilityUnit.EVERY_N_WEEKS);
        kylie.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        jeremy_selfe.avail_every(2, AvailabilityUnit.EVERY_N_WEEKS);
        ralph.avail_every(3, AvailabilityUnit.EVERY_N_WEEKS);
        craig.availability = new AvailabilityEveryNOfM(1, 3);
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

        return people_added;
    }

    static AttachRolesToPlan(plan: Plan) {
        SetupDefaultRoles();
        plan.add_role(defaultLeaderRole);
        plan.add_role(defaultSoundRole);
        plan.add_role(defaultComputerRole);
        plan.add_role(defaultKeysRole);
        plan.add_role(defaultVocalsRole).maximum_wanted = 2;
        plan.add_role(defaultDrumsRole);
        plan.add_role(defaultBass);
        plan.add_role(defaultAcousticGuitar).maximum_wanted = 2;
        plan.add_role(defaultElectricGuitar).minimum_needed = 0;
        plan.add_role(defaultSaxRole).minimum_needed = 0;

        defaultAcousticGuitar.minimum_needed = 0;
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
