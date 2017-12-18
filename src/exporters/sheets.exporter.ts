import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {RootStore} from "../state/root";
import {GAPIS} from "../common/gapis-auth";

class GoogleSheetExporter {
    constructor(private schedule: ScheduleWithRules, private api: GAPIS) {
    }

    write_to_sheet() {
        // let discovered = google.discovery.v1.discovery();
        // console.log("Discovered: " + discovered);
    }

}

export {
    GoogleSheetExporter
};