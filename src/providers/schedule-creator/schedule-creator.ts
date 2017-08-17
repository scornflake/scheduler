import {Injectable} from '@angular/core';
import {NgRedux} from "@angular-redux/store";
import {IAppState} from "../../state/app";


@Injectable()
export class ScheduleCreatorProvider {
    constructor(ngRedux:NgRedux<IAppState>) {
    }

}
