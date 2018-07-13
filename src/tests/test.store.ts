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
import {PersonManager} from "../scheduling/common/scheduler-store";
import {HttpClient} from "@angular/common/http";
import {SWBSafeJSON} from "../common/json/safe-stringify";
import {action} from "mobx-angular";


export class NPBCStoreConstruction {
    constructor() {
    }

    // static SetupOrganization(org_store, name: string) {
    //     let org = org_store.find_by_name(name);
    //     if (!org) {
    //         let organization = new Organization(name);
    //         org_store.add_organisation(organization);
    //         return organization;
    //     }
    //     return null;
    // }

    static async load(url: string, httpClient: HttpClient) {
        try {
            return await httpClient.get(url).toPromise();
        } catch (e) {
            throw new Error(`${url} could not be loaded: ${SWBSafeJSON.stringify(e)}`);
        }
    }

    static SetupTeamUnavailability(team: Team) {
        // noinspection JSUnusedLocalSymbols
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
        chris.addUnavailable(csd(2018, 7, 15));

        jeremy_selfe.addUnavailable(csd(2018, 6, 3));
        jeremy_selfe.addUnavailable(csd(2018, 7, 1));

        cherilyn.addUnavailableRange(csd(2018, 7, 14), csd(2018, 7, 29));
        cherilyn.addUnavailable(csd(2018, 6, 17), 'ob meeting');
        cherilyn.addUnavailable(csd(2018, 7, 1), 'ob meeting');
        cherilyn.addUnavailable(csd(2018, 8, 19), 'mental health!');

        christine.addUnavailable(csd(2018, 5, 6));
        christine.addUnavailable(csd(2018, 6, 17));
        christine.addUnavailable(csd(2018, 7, 22));

        jeremy_l.addUnavailable(csd(2018, 6, 17));

        jeremy_w.addUnavailable(csd(2018, 6, 3));
        jeremy_w.addUnavailable(csd(2018, 7, 8));
        jeremy_w.addUnavailable(csd(2018, 7, 22));

        stuart.addUnavailableRange(csd(2018, 8, 12), csd(2018, 9, 9));

        allie.addUnavailable(csd(2018, 6, 3));
        allie.addUnavailable(csd(2018, 7, 22));

        craig.addUnavailableRange(csd(2018, 8, 12), csd(2018, 9, 9));

        /*
        Add specifics here
        */
        // daniel.put_on_specific_role_for_date(defaultComputerRole, csd(2018, 6, 17));


    }

    @action static AddPeopleToPlanWithRoles(service: Plan, team: Team) {
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


        service.assignmentFor(neil)
            .addRole(defaultSoundRole, 1)
            .addRole(defaultSaxRole, 3)
            .add_secondary_action(new TryToScheduleWith(cherilyn, new Availability(1, AvailabilityUnit.EVERY_N_WEEKS), 2));

        service.assignmentFor(cherilyn)
            .addRole(defaultKeysRole)
            .if_assigned_to(defaultLeaderRole).thenDo(new ScheduleOn(cherilyn, defaultKeysRole));

        service.assignmentFor(christine)
            .addRole(defaultVocalsRole);
        // christine.if_assigned_to(defaultLeaderRole).then(new ScheduleOn(christine, defaultVocalsRole));

        let stuart_assignment = service.assignmentFor(stuart);
        stuart_assignment
            .addRole(defaultAcousticGuitar)
            .addRole(defaultVocalsRole)
            .if_assigned_to(defaultLeaderRole).thenDo(new ScheduleOn(stuart, defaultAcousticGuitar));
        stuart_assignment.if_assigned_to(defaultLeaderRole).thenDo(new ScheduleOn(stuart, defaultVocalsRole));

        service.assignmentFor(kylie)
            .addRole(defaultAcousticGuitar)
            .if_assigned_to(defaultAcousticGuitar).thenDo(new ScheduleOn(kylie, defaultVocalsRole));

        service.assignmentFor(jeremy_selfe)
            .addRole(defaultLeaderRole, 2)
            .addRole(defaultElectricGuitar)
            .if_assigned_to(defaultLeaderRole).thenDo(new ScheduleOn(jeremy_selfe, defaultElectricGuitar));

        service.assignmentFor(ralph)
            .addRole(defaultAcousticGuitar)
            .if_assigned_to(defaultAcousticGuitar).thenDo(new ScheduleOn(anita, defaultVocalsRole));

        service.assignmentFor(daniel)
            .addRole(defaultDrumsRole, 3)
            .addRole(defaultBass);

        service.assignmentFor(craig)
            .addRole(defaultDrumsRole);

        service.assignmentFor(ben)
            .addRole(defaultBass, 1);

        service.assignmentFor(courtney)
            .addRole(defaultVocalsRole);

        service.assignmentFor(robp)
            .addRole(defaultBass, 3)
            .addRole(defaultSoundRole);

        service.assignmentFor(robs)
            .addRole(defaultBass);

        service.assignmentFor(dave)
            .addRole(defaultAcousticGuitar)
            .addRole(defaultVocalsRole)
            .if_assigned_to(defaultAcousticGuitar).thenDo(new ScheduleOn(dave, defaultVocalsRole));

        service.assignmentFor(anita)
            .addRole(defaultVocalsRole);

        service.assignmentFor(annie)
            .addRole(defaultVocalsRole);

        service.assignmentFor(jo)
            .addRole(defaultVocalsRole);

        service.assignmentFor(allie)
            .addRole(defaultVocalsRole);

        service.assignmentFor(chris)
            .addRole(defaultSoundRole)
            .addRole(defaultElectricGuitar);

        service.assignmentFor(jeremy_l)
            .addRole(defaultSoundRole, 2)
            .addRole(defaultComputerRole);

        service.assignmentFor(andre_l)
            .addRole(defaultSoundRole)
            .addRole(defaultElectricGuitar);

        service.assignmentFor(suzie_l)
            .addRole(defaultElectricGuitar);

        service.assignmentFor(jeremy_w)
            .addRole(defaultSoundRole, 2)
            .addRole(defaultComputerRole);

        service.assignmentFor(john_sutherland)
            .addRole(defaultSoundRole)
            .addRole(defaultComputerRole, 2)
    }

    static async asyncFixPeoplesEmail(peopleStore: PersonManager, http: HttpClient) {
        let emails = await NPBCStoreConstruction.load('assets/people.json', http) as any[];
        if (emails == null) {
            return;
        }
        console.warn(`Got: ${JSON.stringify(emails)}`);
        for (let record of emails) {
            let email = record['email'];
            let name = record['name'];

            let person = peopleStore.firstThisTypeByName(name, false);
            if(person) {
                if(person.email != email) {
                    person.setEmail(email);
                }
            }
        }
    }

    static SetupPeople(people_store: PersonManager): Array<Person> {
        let people_added = [];

        function aint(name: string, email: string = null) {
            let person = people_store.firstThisTypeByName(name, false);
            if (person == null) {
                let p = people_store.add(new Person(name));
                people_added.push(p);
                return p;
            }
            if (email != null) {
                if (person.email != email) {
                    person.email = email;
                }
            }
            return person;
        }

        let neil = aint("Neil Clayton", "neil@cloudnine.net.nz");
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
        plan.addRole(defaultLeaderRole);
        plan.addRole(defaultSoundRole);
        plan.addRole(defaultComputerRole);
        plan.addRole(defaultKeysRole);
        plan.addRole(defaultVocalsRole).maximum_wanted = 2;
        plan.addRole(defaultDrumsRole);
        plan.addRole(defaultBass);
        plan.addRole(defaultAcousticGuitar).maximum_wanted = 2;
        plan.addRole(defaultElectricGuitar).minimum_needed = 0;
        plan.addRole(defaultSaxRole).minimum_needed = 0;

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
