import {ObjectWithUUID} from "../../scheduling/base-types";

interface ILifecycleCallback {
    showLoginPage(reason: string);

    showCreateOrInvitePage(reason: string);

    showError(message: string);
}

interface ILifecycle {
    asyncRunStartupLifecycle(callback: ILifecycleCallback): Promise<boolean>;
}

export {
    ILifecycleCallback,
    ILifecycle,
}