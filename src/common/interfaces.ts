export interface ValidationResponse {
    user?: string,
    ok: boolean,
    detail: string
}

export class LoginResponse implements ValidationResponse {
    user?: string;
    ok: boolean;
    detail: string;

    constructor(ok: boolean = true, reason: string = "", user: string = null) {
        this.ok = ok;
        this.detail = reason;
        this.user = user;
    }
}

