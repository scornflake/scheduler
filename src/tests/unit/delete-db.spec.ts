import {MockConfigurationService} from "../../app/logging-configuration";
import {SchedulerDatabase} from "../../providers/server/db";
import {OrmMapper} from "../../providers/mapping/orm-mapper";

describe('delete the db!', () => {
    it('bye bye db', (done) => {
        let mapper = new OrmMapper();

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1500;
        let config = MockConfigurationService.ServiceForTests();
        SchedulerDatabase.ConstructAndWait(config, mapper).then(new_db => {
            new_db.destroyDatabase(false).then(() => {
                console.log(`starting destroy of db...`);
                done();
                console.log(`destroy of db complete`);
            });
        });
    });
});