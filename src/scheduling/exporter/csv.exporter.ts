import json2csv from "json2csv";
import fileSaver from "file-saver";
import {ScheduleWithRules} from "../rule_based/scheduler";
import * as _ from 'lodash';

class CSVExporter {
    private schedule: ScheduleWithRules;

    constructor(schedule: ScheduleWithRules) {
        this.schedule = schedule;
    }

    valueOf() {
        let {fields, rows} = this.generate_rows();
        return json2csv({
            data: rows,
            fields: fields
        });
    }

    generate_rows() {
        let fields = this.schedule.jsonFields();
        let rows = this.schedule.jsonResult().map(row => {
            // Want to remap this structure
            let new_row = {
                Date: row.date.toDateString()
            };
            for (let field of fields) {
                if (field == 'Date') continue;
                let all_names = _.map(row[field], p => p.name);
                new_row[field] = _.join(all_names, ", ");
            }
            return new_row;
        });
        return {
            fields: fields,
            rows: rows
        }
    }

    write_to_file(filename: string) {
        let {fields, rows} = this.generate_rows();
        let result = json2csv({
            data: rows,
            fields: fields
        });

        let data = new Blob([result], {type: 'text/csv'});
        fileSaver.saveAs(data, filename);
    }
}

export {
    CSVExporter
}
