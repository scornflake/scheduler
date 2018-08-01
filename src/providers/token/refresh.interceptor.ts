import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
// import { Observable, throwError } from 'rxjs';
import {Observable} from 'rxjs';
import {catchError, mergeMap} from 'rxjs/operators';
import {AuthorizationService} from './authorization.service';
import {JwtInterceptor} from '@auth0/angular-jwt';
import {LoggingWrapper} from "../../common/logging-wrapper";
import {Logger} from "ionic-logging-service";
import {SchedulerServer} from "../server/scheduler-server.service";


@Injectable()
export class RefreshTokenInterceptor implements HttpInterceptor {
    private logger: Logger;

    constructor(private authorizationService: AuthorizationService,
                private schedulerServer: SchedulerServer,
                private jwtInterceptor: JwtInterceptor) {
        this.logger = LoggingWrapper.getLogger('service.refresh');
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // console.log(`REFRESH CALLED`);
        if (this.jwtInterceptor.isWhitelistedDomain(req) && !this.jwtInterceptor.isBlacklistedRoute(req)) {
            // console.log(`REFRESH CALLED 2`);
            return next.handle(req).pipe(
                catchError((err) => {
                    const errorResponse = err as HttpErrorResponse;
                    // TODO: Are we SURE this is an HttpErrorMessage???
                    let message = errorResponse.error.message || JSON.stringify(errorResponse.error);
                    // console.log(`REFRESH CALLED 3, msg: ${message}, err: ${JSON.stringify(err)}`);
                    if (errorResponse.status === 401 && message.indexOf('expired') != -1) {
                        this.logger.info(`Token invalid... refreshing...`);
                        return this.authorizationService.refresh()
                            .pipe(
                                mergeMap(() => {
                                        return this.jwtInterceptor.intercept(req, next);
                                    }
                                )
                            );
                    }
                    Observable.throw(err);
                    // return throwError(err);
                }));
        } else {
            return next.handle(req);
        }
    }
}