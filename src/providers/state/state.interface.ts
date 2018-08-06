export interface IState {
    loginToken: string;
    decodedToken?: any;
    lastPersonUUID: string;
    lastOrganizationUUID: string;
    isForcedOffline: boolean;
}
