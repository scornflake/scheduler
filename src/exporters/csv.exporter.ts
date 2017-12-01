import json2csv from "json2csv";
import fileSaver from "file-saver";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import * as _ from 'lodash';

class CSVExporter {
    private schedule: ScheduleWithRules;

    constructor(schedule: ScheduleWithRules) {
        this.schedule = schedule;
    }

    write_to_file(filename: string) {
        let fields = this.schedule.jsonFields();
        let result = json2csv({
            data: this.schedule.jsonResult().map(row => {
                // Want to remap this structure
                let new_row = {
                    date: row.date.toDateString()
                };
                for (let field of fields) {
                    if(field == 'date') continue;
                    let all_names = _.map(row[field], p => p.name);
                    new_row[field] = _.join(all_names, ", ");
                }
                return new_row;
            }),
            fields: fields
        });

        let data = new Blob([result], {type: 'text/csv'});
        fileSaver.saveAs(data, filename);

        console.log(result);
    }
}

export {
    CSVExporter
}
