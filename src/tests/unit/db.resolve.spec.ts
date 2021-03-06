import {SchedulerDatabase} from "../../providers/server/db";
import {Person} from "../../scheduling/people";
import {scheduler_db_map} from "../../assets/db.mapping";
import {OrmMapper} from "../../providers/mapping/orm-mapper";
import {IObjectCache, SimpleCache} from "../../providers/mapping/cache";
import {newLoggingServiceAfterReset} from "./test-helpers";

describe('db lookups', () => {
    let db: SchedulerDatabase;
    let mapper: OrmMapper;
    let cache: IObjectCache;

    beforeEach((done) => {
        let logService = newLoggingServiceAfterReset();
        cache = new SimpleCache();
        mapper = new OrmMapper(logService);

        //Add in mappings that we need, since we reference other models in this test
        mapper.addConfiguration(scheduler_db_map);

        let randomDBName = `tests-${Math.random().toString(36).substring(7)}-db`;
        SchedulerDatabase.ConstructAndWait(randomDBName, null, mapper, logService).then(new_db => {
            db = new_db;
            db.setCache(cache);
            done();
        });
    });

    afterEach((done) => {
        db.destroyDatabase().then(() => {
            done();
        });
    });

    it('can wait for a forward reference to exist', function (done) {
        // Populate the DB with some data, but missing a key piece!
        let person = new Person('neil');

        let docs = [
            {
                "_id": person.uuid,
                "type": "Person",
                "name": "Neilos",
                "phone": null,
                "email": "neil@there.com",
                "availability": "rrr:Availability:47b4deee-bcda-b352-3c60-656f6fd08379",
                "unavailable": [],
                "organization": null,
                "invites": [],
                "preferences": "rrr:Preferences:764a6bf2-59c9-7751-048b-9d48ec474697"
            },
            {
                "_id": "47b4deee-bcda-b352-3c60-656f6fd08379",
                "type": "Availability",
                "period": 3,
                "unit": "every_weeks"
            }
        ];

        let prefsDocs = [
            {
                "_id": "764a6bf2-59c9-7751-048b-9d48ec474697",
                "type": "Preferences",
                "id": null,
                "rev": null,
                "is_new": true,
                "previous_sheet_id": null,
                "previous_sheet_tab_id": null,
                "google_sheet_id": null,
                "google_sheet_tab_id": null,
                "google_sheet_id_retrieved": null,
                "selected_plan_uuid": null,
                "last_selected_date": null
            }
        ];

        // We intentionally do NOT store the preferences.
        // Want to see what we can perform a load, injecting preferences slightly later, and the resolve doesn't fail
        // This simulates data coming late over couch/pouch replication
        db.storeRawDocs(docs).then(arrayOfR => {
            // expect all results to be OK
            // console.log(`Got R: ${SWBSafeJSON.stringify(arrayOfR)}`);
            expect(Array.isArray(arrayOfR)).toBeTruthy();
            for (let r of arrayOfR) {
                expect(r['ok']).toBeTruthy();
            }

            // Now, try to lookup the person.
            db.async_LoadObjectWithUUID(person.uuid).then(() => {
                done();
            });

            // Delay a little bit, and now save the Preferences object.
            setTimeout(() => {
                console.log(`Saving prefs (late)...`);
                db.storeRawDocs(prefsDocs).then((arrayOfR) => {
                    expect(Array.isArray(arrayOfR)).toBeTruthy();
                    for (let r of arrayOfR) {
                        expect(r['ok']).toBeTruthy();
                    }
                })
            }, 500);
        })
    }, 5000);
});
