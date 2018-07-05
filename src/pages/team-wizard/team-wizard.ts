import {IonicPage, NavController, NavParams} from 'ionic-angular';
import {Person} from "../../scheduling/people";
import {RootStore} from "../../store/root";
import {Team} from "../../scheduling/teams";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {WizardPage} from "./wizard";
import {Component} from "@angular/core";

@IonicPage({
    name: 'page-team-wizard',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-team-wizard',
    templateUrl: 'team-wizard.html',
})
export class TeamWizardPage extends WizardPage {
    teamName: string;
    people: Array<Person>;

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public server: SchedulerServer,
                public navParams: NavParams) {
        super();
        this.people = new Array<Person>();
        this.addAnotherPerson();
    }

    get nonNullPeople(): Array<Person> {
        if (!this.people) {
            console.error(`no prople return none`);
            return [];
        }
        return this.people.filter(p => p.name.length > 0);
    }

    get nextIsEnabled(): boolean {
        let activeIndex = this.slides.getActiveIndex();
        if (activeIndex == 0) {
            if (!this.teamName) {
                return false;
            }
        }
        if (activeIndex == 1) {
            if (!this.nonNullPeople) {
                return false;
            }
            console.warn(`Have ${this.nonNullPeople.length} non null`);
            if (this.nonNullPeople.length == 0) {
                return false;
            }
        }
        return true;
    }

    addAnotherPerson(name = '') {
        this.people.push(new Person(name));
    }

    deletePerson(p: Person) {
        let index = this.people.findIndex(person => person.uuid == p.uuid);
        if (index >= 0) {
            this.people.splice(index, 1);
        }
    }

    createTheTeam() {
        let newTeam = new Team(this.teamName);
        this.nonNullPeople.forEach(p => newTeam.getOrAddPerson(p));
        this.store.teams.add(newTeam);
        this.saving = true;

        this.server.saveTeam(newTeam).then(() => {
            this.navCtrl.pop();
            this.saving = false;
        });
    }
}
