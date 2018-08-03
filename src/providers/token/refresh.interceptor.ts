import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Injectable} from '@angular/core';
// import { Observable, throwError } from 'rxjs';
import {Observable} from 'rxjs';
import {catchError, mergeMap} from 'rxjs/operators';
import {AuthorizationService} from './authorization.service';
import {JwtInterceptor} from '@auth0/angular-jwt';
import {Logger, LoggingService} from "ionic-logging-service";
import {SWBSafeJSON} from "../../common/json/safe-stringify";


@Injectable()
export class RefreshTokenInterceptor implements HttpInterceptor {
    private logger: Logger;

    constructor(private authorizationService: AuthorizationService,
                private logService: LoggingService,
                private jwtInterceptor: JwtInterceptor) {
        this.logger = this.logService.getLogger('service.refresh');
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (this.jwtInterceptor.isWhitelistedDomain(req) && !this.jwtInterceptor.isBlacklistedRoute(req)) {
            return next.handle(req).pipe(
                catchError((err) => {
                    const errorResponse = err as HttpErrorResponse;
                    this.logger.debug("intercept", `is ${req} whitelisted? ${this.jwtInterceptor.isWhitelistedDomain(req)}, blacklisted?: ${this.jwtInterceptor.isBlacklistedRoute(req)}`);
                    // TODO: Are we SURE this is an HttpErrorMessage???
                    if (errorResponse.status === 401) {
                        let message = errorResponse.error.message || JSON.stringify(errorResponse.error);
                        this.logger.debug("intercept", `Received 401 response: ${err}. 'message' = ${message}`);
                        if (message.indexOf('expired') != -1) {
                            this.logger.info("intercept", `Token is invalid, refreshing...`);
                            return this.authorizationService.refresh()
                                .pipe(
                                    mergeMap(() => {
                                            return this.jwtInterceptor.intercept(req, next);
                                        }
                                    )
                                );
                        }
                    } else {
                        this.logger.debug("intercept", `Refresh received other error response: ${SWBSafeJSON.stringify(err)}`);
                    }
                    return Observable.throw(err);
                    // return throwError(err);
                }));
        } else {
            return next.handle(req);
        }
    }
}