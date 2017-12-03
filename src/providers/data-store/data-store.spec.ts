import {DataStoreProvider} from "./data-store";
import {Apollo, ApolloModule} from "apollo-angular";
import {HttpLink, HttpLinkModule} from "apollo-angular-link-http";
import {HttpClientModule} from "@angular/common/http";
import {getTestBed, TestBed} from "@angular/core/testing";
import {IConfiguration} from "../../config/configuration";
import {Role} from "../../state/roles";
import {Organization, OrganizationStore} from "../../state/organization";
import {MobxAngularModule} from "mobx-angular";
import {RootStore} from "../../state/root";

describe('datastore', () => {
    let injector: TestBed;
    let data_store: DataStoreProvider;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                MobxAngularModule,
                HttpClientModule,
                ApolloModule,
                MobxAngularModule,
                HttpLinkModule
            ],
            providers: [
                RootStore,
            ]
        });

        injector = getTestBed();
        let apollo = injector.get(Apollo);
        let link = injector.get(HttpLink);
        let store = injector.get(RootStore);
        let config: IConfiguration = {
            graphcool_uri: "http://localhost:60000/simple/v1/cjappeb6800060106se2hh01u",
            graphcool_connectToDevTools: true
        };

        data_store = new DataStoreProvider(apollo, link, store, config);
        expect(data_store).not.toBeNull();
    });

    it('should detect additions to org store', function () {
        let org_store = new OrganizationStore();

        org_store.addOrganizaton(new Organization("North Porirua Baptist Church"));

    });

    it('construct organization with roles', function (done) {
        let organization = new Organization("North Porirua Baptist Church");
        let previous_uuid = organization.uuid;
        data_store.createOrganization(organization).subscribe(o => {
            console.log("Received : " + JSON.stringify(o));
            expect(previous_uuid).not.toEqual(o.uuid);
            expect(o.is_new).toBeFalse();
            done();
        });
    });

    it('should be able to construct roles', function (done) {
        // TODO: First, delete all existing roles
        data_store.createRole(new Role("Test-Role")).subscribe(r => {
            console.log("Got: " + JSON.stringify(r));
            done();
        });

    });

});