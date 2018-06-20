export type LoginCallback = (loginTokenValid:boolean) => void;

export interface ValidationResponse {
    user?: UserResponse,
    ok: boolean,
    detail: string
}

export class OrganizationResponse {
    id?: number;
    name: string;
    enabled?: boolean;
    uuid?: string;
    user?: number;
}

export class UserResponse {
    id: number;
    email: string;
    is_active: string;
    first_name: string;
    last_name: string;
    logintoken: string;
    uuid: string;
    organization_id: number;
}

export class LoginResponse implements ValidationResponse {
    user?: UserResponse;
    ok: boolean;
    detail: string;

    constructor(ok: boolean = true, reason: string = "", user: UserResponse = null) {
        this.ok = ok;
        this.detail = reason;
        this.user = user;
    }
}

