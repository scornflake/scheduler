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
    organization_token: string;
}

export class RoleResponse {
    name: string;
    minimum_needed: number;
    maximum_needed: number;
    layout_priority: number;
    display_order: number;
}

export class RoleSetResponse {
    name: string;
    roles: RoleResponse[];
}

export class InviteResponse {
    id: number;
    to_email: string;
    created: string;
    modified: string;
    expires: string;
}

export declare type FieldErrors = {
    key: string;
    errors: string[];
};

export class ServerError {
    errors: FieldErrors[] = [];
    originalError: any;

    constructor(serverError: any) {
        this.originalError = serverError;
        let errorElement = serverError['error'];
        if (errorElement) {
            this.errors = [];
            for (let key of Object.keys(errorElement)) {
                let value: string[] = errorElement[key];
                this.errors.push({key: key, errors: value})
            }
        }
    }

    returnNamedField(fieldName: string, defaultValue: any = null) {
        let names: string[] = Object.getOwnPropertyNames(this.originalError);
        if (names.find(v => v == fieldName)) {
            return this.originalError[fieldName];
        }
        // console.log(`No field named ${fieldName} in [${names}], returning default value: ${defaultValue}`);
        return defaultValue;
    }

    get name(): string {
        return this.returnNamedField('name')
    }

    get status(): number {
        return this.returnNamedField('status')
    }

    get ok(): boolean {
        return this.returnNamedField('ok')
    }

    get message(): string {
        if(this.isHTTPServerNotThere) {
            return "Cannot talk to server. Oh no!"
        }
        return this.returnNamedField('message')
    }

    get isHTTPServerNotThere(): boolean {
        return !this.ok && this.status === 0;
    }

    get humanReadable(): string {
        let parts = [];
        if (this.message) {
            parts.push(this.message)
        } else {
            if (this.name) {
                parts.push(this.name);
            }
        }
        if (this.status) {
            parts.push(`(status ${this.status})`)
        }
        return parts.join(", ")
    }

    get allErrors(): string {
        let all = "";
        for (let err of this.errors) {
            if (all.length > 0) {
                all += ", ";
            }
            if (Array.isArray(err.errors)) {
                all += err.errors.join(", ");
            }
        }
        return all;
    }

    valueOf() {
        return this.humanReadable;
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

