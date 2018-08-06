import {Component, OnInit} from '@angular/core';
import {AlertController, IonicPage, NavController, NavParams} from 'ionic-angular';
import {RootStore} from "../../store/root";
import {Logger, LoggingService} from "ionic-logging-service";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {RoleSetResponse} from "../../common/interfaces";
import {Role} from "../../scheduling/role";
import {PageUtils} from "../page-utils";
import PluralizeStatic from "pluralize";
import {AccessControlProvider, ResourceType} from "../../providers/access-control/access-control";

@IonicPage({
    name: 'page-roles',
    defaultHistory: ['home']
})
@Component({
    selector: 'page-roles',
    templateUrl: 'roles.html',
})
export class RolesPage implements OnInit {
    private logger: Logger;

    public RoleResource = ResourceType.Role;

    constructor(public navCtrl: NavController,
                public store: RootStore,
                public pageUtils: PageUtils,
                private logService: LoggingService,
                public accessControl: AccessControlProvider,
                public server: SchedulerServer,
                public alertController: AlertController,
                public navParams: NavParams) {
        this.logger = this.logService.getLogger('page.roles');
    }

    ngOnInit() {
        // For debug
        if (this.store.roles.length == 0) {
            this.navCtrl.pop();
        } else {
            this.showRoleDetail(this.store.roles[0]);
        }
    }

    ngAfterContentInit() {
        // For debug only
        // if (this.store) {
        //     if (this.store.roles.length > 0) {
        //         this.showRoleDetail(this.store.roles[0]);
        //     }
        // }
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

    showUsedInSummary(role: Role, maxToShow: number = 1) {
        let usages = this.store.findWhatRoleIsUsedIn(role);
        if (usages.length == 0) {
            return "";
        }
        if (usages.length <= maxToShow) {
            return `${usages[0]}`;
        } else {
            let usageCount = usages.length - maxToShow;
            return `${usages.slice(0, maxToShow).join(", ")} and ${PluralizeStatic('other', usageCount, true)}.`;
        }
    }

    showRoleDetail(role) {
        this.navCtrl.push('page-role-editor', {role: role})
    }
}
