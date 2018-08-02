import {MockConfigurationService} from "../mock-logging-configuration";
import {SchedulerDatabase} from "../../providers/server/db";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {LoggingService} from "ionic-logging-service";
import {newLoggingServiceAfterReset} from "./test-helpers";

describe('delete the db!', () => {
    it('bye bye db', (done) => {
        let logService = newLoggingServiceAfterReset();
        let mapper = new OrmMapper(logService);

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1500;
        SchedulerDatabase.ConstructAndWait(MockConfigurationService.dbName, null, mapper, logService).then(new_db => {
            new_db.destroyDatabase().then(() => {
                console.log(`starting destroy of db...`);
                done();
                console.log(`destroy of db complete`);
            });
        });
    });
});