import {ServerError} from "../../common/interfaces";

interface ILifecycleCallback {
    showLoginPage(reason: string);

    applicationIsStarting();

    applicationHasStarted(ok: boolean);

    showCreateOrInvitePage(reason: string);

    showError(message: string | ServerError);
}

interface ILifecycle {
    asyncRunStartupLifecycle(callback: ILifecycleCallback): Promise<boolean>;
}

export {
    ILifecycleCallback,
    ILifecycle,
}