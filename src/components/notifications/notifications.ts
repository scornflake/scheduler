import {Component} from '@angular/core';
import {RootStore} from "../../store/root";
import {PageUtils} from "../../pages/page-utils";
import {Invitation} from "../../scheduling/people";
import {NavController, ViewController} from "ionic-angular";
import {SchedulerServer} from "../../providers/server/scheduler-server.service";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";

@Component({
    selector: 'notifications',
    templateUrl: 'notifications.html'
})
export class NotificationsComponent {
    private logger: Logger;

    constructor(public store: RootStore,
                public pageUtils: PageUtils,
                public nav: NavController,
                public viewCtrl: ViewController,
                public server: SchedulerServer) {
        this.logger = LoggingWrapper.getLogger('notifications');
    }

    close() {
        this.viewCtrl.dismiss();
    }

    acceptInvitation(invite: Invitation) {
        // Prompt if:
        // have > 1 person
        // have a team, or plan

        // what does 'accept' mean?
        // it means we associate this user, with the OTHER org.
        // we have to have this user IN the other org.
        // we log them out? then log them in...  this will reload the DB with the new org data.

        this.pageUtils.areYouSure("Please confirm", "Accept", () => {
            // first, delete this invite from the DB
            this.store.loggedInPerson.removeInvitesMatching(invite);
            this.server.waitForReplicationToQuietenDown(this.server.db).then(() => {
                this.logger.info('Moving person to new organization...');
                this.server.movePersonToOrganization(invite.organizationUUID).then(() => {
                    // Logout, without killing validation token.
                    // We want the login to happen immediately, and bring back new user data
                    this.server.asyncLogout(false).then(() => {
                        this.logger.info('Logged out, going to go back home');
                        this.nav.setRoot('home');
                    })
                }, err => this.pageUtils.showError(err));
            })
        });
    }

    declineInvitation(invite: Invitation) {
        this.pageUtils.areYouSure("Sure you want to decline the invite?", "Decline", () => {
            this.store.loggedInPerson.removeInvitesMatching(invite);
        });
    }

}
