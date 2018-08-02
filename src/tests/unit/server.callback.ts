import {ILifecycleCallback} from "../../providers/server/interfaces";
import {ServerError} from "../../common/interfaces";

export class TestILifecycleCallback implements ILifecycleCallback {
    showedLoginPage: boolean;
    lastShownError: string | ServerError;
    lastLoginReason: string;

    showLoginPage(reason: string) {
        console.info(`TEST(showLoginPage), reason: ${reason}`);
        this.showedLoginPage = true;
        this.lastLoginReason = reason;
    }

    applicationIsStarting() {

    }

    applicationHasStarted(ok: boolean) {

    }

    showCreateOrInvitePage(reason: string) {

    }

    showError(message: string | ServerError) {
        this.lastShownError = message;
    }
}


