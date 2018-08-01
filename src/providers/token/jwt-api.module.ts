import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {JWT_OPTIONS, JwtInterceptor, JwtModule} from '@auth0/angular-jwt';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {AuthorizationService} from "./authorization.service";
import {RefreshTokenInterceptor} from "./refresh.interceptor";
import {StateProvider} from "../state/state";

export function jwtOptionsFactory(state: StateProvider) {
    return {
        tokenGetter: () => {
            return state.loginToken;
        },
        blacklistedRoutes: []
    };
}

@NgModule({
    imports: [
        CommonModule,
        HttpClientModule,
        JwtModule.forRoot({
            config: {
                whitelistedDomains: [
                    'schedulerdb.shinywhitebox.com',
                    'scheduler.shinywhitebox.com',
                    'localhost:8000'
                ]
            },
            jwtOptionsProvider: {
                provide: JWT_OPTIONS,
                useFactory: jwtOptionsFactory,
                deps: [StateProvider]
            }
        })
    ],
    providers: [
        AuthorizationService,
        JwtInterceptor, // Providing JwtInterceptor allow to inject JwtInterceptor manually into RefreshTokenInterceptor
        {
            provide: HTTP_INTERCEPTORS,
            useExisting: JwtInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: RefreshTokenInterceptor,
            multi: true
        }
    ],
    declarations: []
})
export class JWTAPIModule {
}