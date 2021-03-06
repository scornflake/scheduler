import {Injectable} from '@angular/core';
import {AccessControl} from "accesscontrol";
import {StateProvider} from "../state/state";
import {Logger, LoggingService} from "ionic-logging-service";

enum ResourceType {
    People = "people",
    Profile = "profile",
    Role = "role",
    Team = "team",
    Db = "db",
    Plan = "plan",
}

export const noOne = 'no-one';

@Injectable()
class AccessControlProvider {
    accessControl: AccessControl;
    private logger: Logger;

    constructor(private  state: StateProvider, private logService: LoggingService) {
        let grants = AccessControlProvider.defaultGrants();
        // console.log(`Grants: ${JSON.stringify(grants)}`);
        this.logger = this.logService.getLogger('service.access-control');
        this.accessControl = new AccessControl(grants);
    }

    static get normalResourceTypes() {
        return [
            ResourceType.Profile,
            ResourceType.Role,
            ResourceType.People,
            ResourceType.Team,
            ResourceType.Plan,
        ];
    }

    static get allResourceTypes() {
        return [
            ResourceType.Db,
            ...AccessControlProvider.normalResourceTypes
        ];
    }


    private static defaultGrants() {
        let defaultGrants = {};
        defaultGrants['user'] = AccessControlProvider.grantsForResources(AccessControlProvider.normalResourceTypes, AccessControlProvider.own_grant);
        defaultGrants['manager'] = AccessControlProvider.grantsForResources(AccessControlProvider.normalResourceTypes, AccessControlProvider.manager_grant);
        defaultGrants['superuser'] = AccessControlProvider.grantsForResources(AccessControlProvider.allResourceTypes, AccessControlProvider.manager_grant);
        defaultGrants[noOne] = AccessControlProvider.grantsForResources(AccessControlProvider.allResourceTypes, AccessControlProvider.deny_grant);
        return defaultGrants;
    }

    get role(): string {
        if (!this.state) {
            this.logger.debug('Role is noOne because no state');
            return noOne;
        }
        if (!this.state.loginToken) {
            this.logger.debug('Role is noOne because no login token');
            return noOne;
        }
        let decodedToken = this.state.state.decodedToken;
        if (!decodedToken || decodedToken == null) {
            this.logger.debug('Role is noOne because no decoded token');
            return noOne;
        }

        // Get the roles from the token
        let roles = decodedToken['roles'];
        if (!roles) {
            this.logger.debug('Role is noOne because no roles on decoded token');
            return noOne;
        }

        if (roles.indexOf('superuser') != -1) {
            return "superuser";
        }

        // this.logger.debug(`Possible roles are: ${SWBSafeJSON.stringify(roles)}. Our org is: ${this.state.state.lastOrganizationUUID}`);
        let managerToken = `manager_${this.state.state.lastOrganizationUUID}`;
        if (roles.indexOf(managerToken) != -1) {
            return "manager"
        }

        let memberToken = `member_${this.state.state.lastOrganizationUUID}`;
        if (roles.indexOf(memberToken) != -1) {
            return "user"
        }
        return noOne;
    }

    canReadAny(resource: ResourceType, logging: boolean = false): boolean {
        let answer = this.accessControl.can(this.role).createAny(resource).granted;
        if (logging) {
            this.logger.debug("canReadAny", `Can ${this.role} read-any ${resource}? : ${answer}`);
        }
        return answer;
    }

    canUpdateAny(resource: ResourceType, logging: boolean = false): boolean {
        let answer = this.accessControl.can(this.role).updateAny(resource).granted;
        if (logging) {
            this.logger.debug("canUpdateAny", `Can ${this.role} update any ${resource}? : ${answer}`);
        }
        return answer;
    }

    canUpdateOwn(resource: ResourceType, logging: boolean = false): boolean {
        let answer = this.accessControl.can(this.role).updateOwn(resource).granted;
        if (logging) {
            this.logger.debug("canUpdateOwn", `Can ${this.role} update own ${resource}? : ${answer}`);
        }
        return answer;
    }

    isSuperuser() {
        return this.role === 'superuser';
    }


    private static own_grant() {
        return {
            "create:own": ['*'],
            "update:own": ['*', '!uuid'],
            "read:own": ['*'],
            "delete:own": ['*']
        };
    }

    private static manager_grant() {
        return {
            "create:any": ['*'],
            "update:any": ['*', '!uuid'],
            "read:any": ['*'],
            "delete:any": ['*']
        };
    }

    private static deny_grant() {
        return {
            "create:any": [],
            "update:any": [],
            "read:any": [],
            "delete:any": []
        };
    }

    private static grantsForResources(resources: string[], grant_function) {
        let grants = {};
        for (let name of resources) {
            grants[name] = grant_function()
        }
        return grants;
    }
}


export {
    AccessControlProvider,
    ResourceType
}