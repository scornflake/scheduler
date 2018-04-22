export interface ValidationResponse {
    user?: string,
    ok: boolean,
    reason: string
}

export class LoginResponse implements ValidationResponse {
    user?: string;
    ok: boolean;
    reason: string;

    constructor(ok: boolean = true, reason: string = "", user: string = null) {
        this.ok = ok;
        this.reason = reason;
        this.user = user;
    }
}

