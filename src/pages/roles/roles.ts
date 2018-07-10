import {Component} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {RoleSetResponse} from "../../common/interfaces";
import {Role} from "../../scheduling/role";
import {PageUtils} from "../page-utils";
import PluralizeStatic from "pluralize";

@IonicPage({
    name: 'page-roles',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-roles',
    templateUrl: 'roles.html',
})
export class RolesPage {
    private logger: Logger;

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public pageUtils: PageUtils,
                public server: SchedulerServer,
                public alertController: AlertController,
                public navParams: NavParams) {
        this.logger = LoggingWrapper.getLogger('page.roles');
    }

    ionViewDidLoad() {
        // For debug
        if (this.store.roles.length == 0) {
            this.navCtrl.pop();
        }

    }

    addNewRole() {

    }

    addNewRoleSet($event) {
        this.server.getRoleSets().then((rs: RoleSetResponse[]) => {
            let buttons = rs.map(rs => {
                return {
                    text: rs.name,
                    handler: () => {
                        this.addRoleSet(rs);
                    }
                }
            });

            let alert = this.alertController.create({
                title: 'Add some roles',
                message: 'Choose a set and well add those roles. Tap elsewhere to cancel.',
                buttons: buttons
            });

            alert.present();
        });
    }

    private addRoleSet(rs: RoleSetResponse) {
        this.logger.info(`Adding role set: ${rs.name}`);
        for (let role of rs.roles) {
            if (this.store.roles.findThisTypeByName(role.name).length == 0) {
                this.logger.info(`Adding role: ${role.name}`);
                let roleObject = Role.roleFromRoleSet(role);
                this.store.roles.add(roleObject);

                this.server.saveRole(roleObject).then(() => {
                }, err => this.pageUtils.showError(err));
            }
        }
    }

    deleteRole(role) {
        try {
            this.store.removeRoleFromStoreWithRefcheck(role);
        } catch (err) {
            this.pageUtils.showError(err);
        }
    }

    showUsedIn(role: Role) {
        let usages = this.store.findWhatRoleIsUsedIn(role);
        if (usages.length == 0) {
            return "";
        }
        if (usages.length == 1) {
            return `Used in ${usages[0]}`;
        } else {
            let usageCount = usages.length - 1;

            return `Used in ${usages.slice(0, 1).join(", ")} and ${PluralizeStatic('other', usageCount, true)}.`;
        }
    }
}
