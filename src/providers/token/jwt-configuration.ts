import {LoggingWrapper} from "../../common/logging-wrapper";

let possibleWebHosts = [
    'scheduler.shinywhitebox.com',
    'localhost:8000',
    '192.168.1.168:8000',
];

let unauthenticatedRoutes = [
    '/api/validate_login',
];

function routeForPossibleHosts(url) {
    let list = [];
    for (let domain of possibleWebHosts) {
        let pattern = `${domain}${url}.*`;
        LoggingWrapper.debug('blacklisting', `new blacklist pattern: ${pattern}`);
        list.push(new RegExp(pattern))
    }
    return list;
}

function generateBlacklistedRoutes(): string[] {
    let list = [];
    for (let item of unauthenticatedRoutes) {
        list = list.concat(routeForPossibleHosts(item));
    }
    return list;
}

export {
    generateBlacklistedRoutes,
    routeForPossibleHosts,
    possibleWebHosts,
    unauthenticatedRoutes
}