import json2csv from "json2csv";
import fileSaver from "file-saver";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";

class CSVExporter {
    private schedule: ScheduleWithRules;

    constructor(schedule: ScheduleWithRules) {
        this.schedule = schedule;
    }

    write_to_file(filename: string) {
        let result = json2csv({
            data: this.schedule.jsonResult(),
            fields: this.schedule.jsonFields()
        });

        let data = new Blob([result], {type: 'text/csv'});
        fileSaver.saveAs(data, "schedule.csv");

        console.log(result);
    }
}

export {
    CSVExporter
}
