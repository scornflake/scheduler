// export type LoginCallback = (loginTokenValid: boolean) => void;

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
    is_active: boolean;
    first_name: string;
    last_name: string;
    logintoken: string;
    uuid: string;
    organization_uuid: string;
}

export declare type FieldErrors = {
    key: string;
    errors: string[];
};

export class ServerError {
    status: number;
    ok: number;
    message: string;
    errors: FieldErrors[];

    constructor(serverError: any) {
        if (serverError['status']) {
            this.status = serverError['status'];
        }
        if (serverError['ok']) {
            this.ok = serverError['ok'];
        }
        if (serverError['message']) {
            this.message = serverError['message'];
        }
        if (serverError['error']) {
            this.errors = [];
            for (let key of Object.keys(serverError['error'])) {
                let value: string[] = serverError['error'][key];
                this.errors.push({key: key, errors: value})
            }
        }
    }

    get allErrors(): string {
        let all = "";
        for (let err of this.errors) {
            if (all.length > 0) {
                all += ", ";
            }
            all += err.errors.join(", ");
        }
        return all;
    }
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

