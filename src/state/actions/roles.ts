import {Injectable} from "@angular/core";
import {NgRedux} from "@angular-redux/store";
import {IAppState} from "../app";
import {IRole} from "../reducers/roles";

@Injectable()
export class RoleActions {
    static ADD_ROLE: string = "ADD_ROLE";
    static REMOVE_ROLE: string = "REMOVE_ROLE";
    static UPDATE_ROLE: string = "UPDATE_ROLE";

    constructor(private ngRedux: NgRedux<IAppState>) {

    }

    static addRole(role: IRole) {
        return {
            type: RoleActions.ADD_ROLE,
            payload: role
        }
    }

    static removeRole(uuid: string) {
        return {
            type: RoleActions.REMOVE_ROLE,
            payload: uuid
        }
    }

    static updateRole(role: IRole) {
        return {
            type: RoleActions.UPDATE_ROLE,
            payload: role
        }
    }
}