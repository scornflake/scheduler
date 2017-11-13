import {AnyAction} from "redux";
import {RoleActions} from "../actions/roles";
import ShortUniqueId from 'short-unique-id';

export interface IRole {
    uuid: string,
    name: string,
}

let defaultMusicianRole: IRole = {
    uuid: "0",
    name: "Musician",
};
let defaultLeaderRole: IRole = {
    uuid: "1",
    name: "Leader",
};
let defaultSoundRole: IRole = {
    uuid: "2",
    name: "Sound",
};
let defaultComputerRole: IRole = {
    uuid: "3",
    name: "Computer",
};

let defaultRoles: IRole[] = [
    defaultLeaderRole,
    defaultSoundRole,
    defaultMusicianRole,
    defaultComputerRole,
];


export let roleReducer = (state: IRole[] = defaultRoles, action: AnyAction): IRole[] => {
        switch (action.type) {
            case RoleActions.ADD_ROLE:
                // If it's already here, based on UUID, don't add twice
                let role: IRole = action.payload;
                let existing_index = Array.from(state).findIndex(v => {
                    return v.uuid == role.uuid;
                });
                if (existing_index != -1) {
                    return state;
                }
                if (role.uuid == null || role.uuid == "0") {
                    let uuid = new ShortUniqueId();
                    role.uuid = uuid.randomUUID(8);
                }
                return [
                    ...state,
                    ...[action.payload]
                ];

            case RoleActions.UPDATE_ROLE: {
                let new_state = Object.assign({}, state);
                let index = Array.from(new_state).findIndex(i => {
                    return i.uuid == action.uuid
                });

                if (index == -1) {
                    return state;
                }

                new_state[index] = action.payload;
                return new_state;
            }

            case RoleActions.REMOVE_ROLE: {
                let new_state = Array.from(state);
                return new_state.filter(v => {
                    return v.uuid != action.payload
                });
            }
        }
    }
;
