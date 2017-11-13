import PouchDB from 'pouchdb';
import * as Relational from 'relational-pouch';

describe('persistence', () => {
    let db;

    beforeAll((done) => {
        db = new PouchDB('test');
        db.destroy().then(done);
    });

    beforeEach(() => {
        PouchDB.plugin(Relational);
        // PouchDB.debug.enable('*');

        db = new PouchDB('test');
        db.setSchema([
            {
                singular: 'person',
                plural: 'people',
                relations: {
                    // 'roles': {hasMany: {type: 'role', options: {queryInverse: 'role'}}}
                    'roles': {hasMany: 'role'}
                }
            },
            {
                singular: 'role',
                plural: 'roles',
                relations: {
                    'people': {hasMany: 'person'}
                }
            }
        ]);

        // db.remove();
    });

    it('can store something', (done) => {
        let leader_role = {'name': 'Leader'};
        let musician_role = {'name': 'Musician'};

        // I was wondering how I really do relations in PDB.
        // It looks like I have to specify the IDs?  That SUUUUUUUCKS.
        // It seems really, really immature and crap. Not very ORM.
        //
        // And it's nested hell if you want to check things non-async

        db.rel.save('role', leader_role)
            .then(v => {
                db.rel.save('role', musician_role)
            })
            .then(v => {
                db.rel.find('role').then(res => {
                    let ids = res["roles"].map(r => {
                        return r.id;
                    });
                    console.log("Save person with roles: " + JSON.stringify(ids));
                    db.rel.save('person', {name: "Neil", roles: ids})
                        .then(v => {
                            console.log("Saved the person");
                            return db.rel.find("person")
                        })
                        .then(v => {
                            console.log("All persons: " + JSON.stringify(v));
                            return db.rel.find('role');
                        })
                        .then(v => {
                            console.log("All roles: " + JSON.stringify(v));
                        })
                        .then(done)
                });
            })
            .catch(e => {
                expect(e).toBeUndefined();
            });
    });

});

