import {parseDateFromSpreadsheetDate, parseMomentDateFromSpreadsheetDate} from "../scheduling/common/date-utils";
import {isDefined, isUndefined} from "ionic-angular/util/util";
import {ScheduleWithRules} from "../scheduling/rule_based/scheduler";
import * as moment from "moment";
import {Moment} from "moment";
import {Logger} from "ionic-logging-service";
import {OrganizationStore} from "../scheduling/organization";
import {LoggingWrapper} from "./logging-wrapper";
import {SafeJSON} from "./json/safe-stringify";
import {Service} from "../scheduling/service";
import {Team} from "../scheduling/teams";

export class SpreadsheetReader {
    problems: Map<string, Set<string>>;
    schedule: ScheduleWithRules;
    private logger: Logger;
    private organization_store: OrganizationStore;

    constructor(org_store: OrganizationStore) {
        this.problems = new Map<string, Set<string>>();
        this.logger = LoggingWrapper.getLogger("spreadsheet.reader");
        this.organization_store = org_store;
    }

    parse_schedule_from_spreadsheet(rowData: Array<any>) {
        // OK, we will preload a schedule using a previous schedule
        // To do this we need to derive the start and end date (so it's duration is valid)
        let team = new Team("Snapshot Team");
        let service = new Service(`A Snapshot`, team);

        // NPBCStoreConstruction.SetupStore(service.people, new OrganizationStore());

        this.logger.info("Parsing schedule...");
        // First, we validate we have the expected column names
        let column_names = rowData[0];
        if ("Date" in column_names) {
            throw new Error("No date!");
        }

        let dataRows = rowData.slice(1);
        let allDates = dataRows
            .map<Moment>(v => parseMomentDateFromSpreadsheetDate(v[0]))
            .filter(v => moment(v).isValid());

        // let min_date = allDates.reduce((prev, currentValue) => prev && prev.isBefore(currentValue) ? prev : currentValue);
        // let max_date = allDates.reduce((prev, currentValue) => prev && prev.isAfter(currentValue) ? prev : currentValue);
        let min_date: Moment = allDates[0];
        let max_date: Moment = allDates[allDates.length - 1];

        service.start_date = min_date.toDate();
        service.end_date = max_date.toDate();
        // this.logger.info(`Starting ${service.start_date} and ending ${service.end_date}`);

        this.schedule = new ScheduleWithRules(service);

        // Now we read each row and add people into various roles/positions
        let roles_store = this.organization_store.roles_store;
        let people_store = this.organization_store.people_store;

        for (let row of dataRows) {
            // Iterate all the roles that we know of
            let current_date = null;
            let facts = this.schedule.facts;
            let for_this_date = facts.get_schedule_for_date(current_date);

            row.forEach((col, index) => {
                if (index == 0) {
                    if (isDefined(col) && col.toString().length > 0) {
                        current_date = parseDateFromSpreadsheetDate(col);
                    } else {
                        current_date = null;
                    }
                    return;
                }

                // Check we have a valid date for this row
                if (!current_date) {
                    return;
                }

                // Dump out logging only if we're going to process this row
                if (index == 0) {
                    this.logger.info("Process: " + col);
                }

                // Lookup the role!
                let role_name = column_names[index];
                if (role_name) {
                    let global_role = roles_store.find_role(role_name);
                    if (global_role) {
                        this.logger.info(` - Role: ${global_role}`);

                        let peoples_names = col.split(",").map(v => v.trim());
                        this.logger.info(`   - people: ${SafeJSON.stringify(peoples_names)}`);

                        if (for_this_date) {
                            // Go through people and add them to this role
                            for (let persons_name of peoples_names) {
                                if (isUndefined(persons_name)) {
                                    continue;
                                }
                                if (persons_name.length == 0) {
                                    continue;
                                }

                                let person = people_store.find_person_with_name(persons_name, true);
                                if (person == null) {
                                    this.add_problem("person", `cannot find ${persons_name}`);
                                } else {
                                    // Make sure they are part of the team
                                    team.get_or_add_person(person);

                                    let assignment = service.assignment_for(person).add_role(global_role);
                                    this.schedule.facts.place_person_in_role(assignment, global_role, current_date, true, false);
                                    // this.schedule.facts.place_person_in_role(person, global_role, current_date, true, false);
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    get has_problems(): boolean {
        return this.problems.size > 0;
    }

    private add_problem(key: string, problem_description: string) {
        let array_of_things = this.problems.get(key);
        if (!array_of_things) {
            // noinspection JSPrimitiveTypeWrapperUsage
            array_of_things = new Set<string>();
            this.problems.set(key, array_of_things);
        }
        array_of_things.add(problem_description);
    }
}