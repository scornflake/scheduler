import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import {GAPIS} from "../common/gapis-auth";
import Spreadsheet = gapi.client.sheets.Spreadsheet;
import Sheet = gapi.client.sheets.Sheet;

class GoogleSheetExporter {
    constructor(private schedule: ScheduleWithRules, private api: GAPIS) {
    }

    write_to_sheet(spreadsheet: Spreadsheet, sheet: Sheet) {
        this.api.clear_and_write_schedule(spreadsheet, sheet, this.schedule);
    }
}

export {
    GoogleSheetExporter
};