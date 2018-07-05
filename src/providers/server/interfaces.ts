import {ServerError} from "../../common/interfaces";

interface ILifecycleCallback {
    showLoginPage(reason: string);

    applicationIsStarting();

    applicationHasStarted(ok: boolean);

    showCreateOrInvitePage(reason: string);

    showError(message: string | ServerError);
}

enum LifecycleCallbacks {
    showLoginPage,
    applicationIsStarting,
    applicationHasStarted,
    showCreateOrInvitePage,
    showError
}

interface ILifecycle {
    asyncRunStartupLifecycle(callback: ILifecycleCallback): Promise<boolean>;
}

export {
    LifecycleCallbacks,
    ILifecycleCallback,
    ILifecycle,
}