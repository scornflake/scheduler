import {Apollo, ApolloModule} from "apollo-angular";
import {HttpLink, HttpLinkModule} from "apollo-angular-link-http";
import {DataStoreProvider} from "./data-store";
import {HttpClientModule} from "@angular/common/http";
import {IConfiguration} from "../../config/configuration";
import {Role} from "../../state/roles";
import {Organization, OrganizationStore} from "../../state/organization";
import {RootStore} from "../../state/root";
import {IonicStorageModule} from "@ionic/storage";
import {getTestBed, TestBed} from "@angular/core/testing";
import {ConfigurationService} from "ionic-configuration-service";
import {LoggingService} from "ionic-logging-service";
import {MockConfigurationService} from "../../app/logging-configuration";

describe('datastore', () => {
    let injector: TestBed;
    let data_store: DataStoreProvider;

    beforeEach((done) => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                IonicStorageModule.forRoot(),
                ApolloModule,
                HttpLinkModule
            ],
            providers: [
                RootStore,
                [{provide:ConfigurationService, useClass: MockConfigurationService}],
                LoggingService,
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

        done();

        data_store = new DataStoreProvider(apollo, link, config);
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
            expect(o.is_new).toBeFalsy();
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