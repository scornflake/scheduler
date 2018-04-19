export interface ValidationResponse {
    user?: string,
    ok: boolean,
    reason: string
}

export class LoginResponse implements ValidationResponse {
    user?: string;
    ok: boolean;
    reason: string;
}

