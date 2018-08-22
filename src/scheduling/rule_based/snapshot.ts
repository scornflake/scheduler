import {NamedObject} from "../base-types";
import {GAPIS} from "../../common/gapis-auth";
import {SpreadsheetReader} from "../../common/spreadsheet_reader";
import {toJS} from "mobx";
import {SWBSafeJSON} from "../../common/json/safe-stringify";
import {LoggingService} from "ionic-logging-service";
import {PersonManager} from "../common/scheduler-store";
import {LoggingWrapper} from "../../common/logging-wrapper";
import {ScheduleWithRules} from "./scheduler";

class Snapshot extends NamedObject {
    static async asyncReadPreviousSheetAsSchedule(sheetAPI: GAPIS, personManager: PersonManager, loggingService: LoggingService, previousSheetID: string, previousTabID: number): Promise<ScheduleWithRules> {
        if (previousSheetID === undefined) {
            throw new Error('Must supply a sheet ID');
        }

        let spreadsheet = await sheetAPI.load_sheet_with_id(previousSheetID).toPromise();
        let sheet = spreadsheet.sheets.find(s => s.properties.sheetId == previousTabID);
        if (sheet === undefined) {
            throw new Error(`Cannot find the tab within the sheet, with ID ${previousTabID}`);
        }

        let rows = await GAPIS.read_spreadsheet_data(spreadsheet, sheet).toPromise();
        let reader = new SpreadsheetReader(personManager, loggingService);
        reader.parse_schedule_from_spreadsheet(rows);

        if (reader.has_problems) {
            let dump_map = {};
            for (let key of Array.from(reader.problems.keys())) {
                dump_map[key] = Array.from(reader.problems.get(key));
            }
            let problems = toJS(dump_map);
            let s = SWBSafeJSON.stringify(problems);
            LoggingWrapper.getLogger('sheet.reader').error(`Had problems: ${s}`);
        }
        return reader.schedule;
    }
}

export {
    Snapshot
}