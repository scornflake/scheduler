import {Injectable} from '@angular/core';
import {Apollo} from "apollo-angular";
import {HttpLink} from "apollo-angular-link-http";
import {InMemoryCache} from "apollo-cache-inmemory";
import {defaultConfiguration} from "../../config/configuration";
import {Role} from "../../state/roles";
import gql from "graphql-tag";
import {Observable} from "rxjs/Observable";
import {Organization} from "../../state/organization";
import "rxjs/add/operator/map";


const __createRole = gql`
mutation createRole($name:String!) {
    createRole(name: $name) {
        name,
        id
    }
}
`;

const __createOrganization = gql`
mutation createOrganization($name:String!) {
    createOrganization(name:$name) {
        name,
        id,
    }
}
`;

@Injectable()
export class DataStoreProvider {

    constructor(private apollo: Apollo,
                private httpLink: HttpLink,
                configuration = defaultConfiguration) {

        let link = this.httpLink.create({uri: configuration.graphcool_uri});

        let cache = new InMemoryCache();
        apollo.create({
            link: link,
            cache: cache,
            connectToDevTools: configuration.graphcool_connectToDevTools
        })

    }

    createRole(role: Role): any {
        return this.apollo.mutate({
            mutation: __createRole,
            variables: {
                name: role.name
            }
        });
    }

    createOrganization(org: Organization): Observable<Organization> {
        return this.apollo.mutate({
            mutation: __createOrganization,
            variables: {
                name: org.name
            }
        }).map(r => {
            console.log(`Received: ${JSON.stringify(r)} when creating an organization`);
            let org = new Organization("TEST, has r.name");
            org.update_from_server(r);
            return org
        })
    }
}


