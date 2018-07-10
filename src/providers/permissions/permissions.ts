import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';

@Injectable()
export class PermissionsProvider {

    constructor(public http: HttpClient) {
    }

}
