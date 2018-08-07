import {AccessControl} from "accesscontrol";
import {AccessControlProvider, noOne, ResourceType} from "../../providers/access-control/access-control";
import {instance, mock, when} from "ts-mockito";
import {MockLoggingService} from "../mock-logging-configuration";
import {StateProvider} from "../../providers/state/state";

let manager_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0MCwidXNlcm5hbWUiOiJuZWlsQGNsb3VkbmluZS5uZXQubnoiLCJleHAiOjE1MzM1NDk3NDQsImVtYWlsIjoibmVpbEBjbG91ZG5pbmUubmV0Lm56Iiwib3JpZ19pYXQiOjE1MzM1NDg4NDQsInVpZCI6ImI1OTU0N2VlNDVlZTVjYjk4ODVmYzk4N2Q0MjY5MDhjNWE4OGEwYjRkYTBlMWYzMjNjMDAwOWRiYzA1NDgzZDkiLCJyb2xlcyI6WyJtYW5hZ2VyXzliYWM1MTJiLTQ4M2MtNGFjNy1hZjAxLTYwMDFlN2IzYWFlYyIsIm1lbWJlcl85YmFjNTEyYi00ODNjLTRhYzctYWYwMS02MDAxZTdiM2FhZWMiXX0.5AXQzZ__piO0oLR4XSkAiJ3wg8V7YpmIzadxY0RiBBs";

describe('access control', () => {
    let acProvider: AccessControlProvider;
    let accessControl: AccessControl;

    beforeEach(() => {
        let mockProvider = mock(StateProvider);
        let providerInstance = instance(mockProvider);

        when(mockProvider.loginToken).thenReturn(manager_token);
        when(mockProvider.state).thenReturn({
            loginToken: manager_token,
            decodedToken: StateProvider.decodeJWTToken(manager_token),
            lastPersonUUID: "1234",
            lastOrganizationUUID: "9bac512b-483c-4ac7-af01-6001e7b3aaec",
            isForcedOffline: false
        });

        console.log(`Testing with decoded JWT: ${JSON.stringify(StateProvider.decodeJWTToken(manager_token))}`);

        acProvider = new AccessControlProvider(providerInstance, new MockLoggingService());
        accessControl = acProvider.accessControl;
    });

    it('enums work as I think they should', () => {
        expect(ResourceType.Role).toEqual('role');
    });

    it('using a manager token should yield a manager role', function () {
        expect(acProvider.role).toEqual('manager');
    });

    it('manager can do things', function () {
        expect(acProvider.canUpdateAny(ResourceType.Profile)).toBeTruthy();
        expect(acProvider.canUpdateAny(ResourceType.Role)).toBeTruthy();
        expect(acProvider.canUpdateAny(ResourceType.Team)).toBeTruthy();
        expect(acProvider.canUpdateAny(ResourceType.Plan)).toBeTruthy();
        expect(acProvider.canUpdateAny(ResourceType.People)).toBeTruthy();
        expect(acProvider.canUpdateAny(ResourceType.Db)).toBeFalsy();
    });

    it('user access to their own profile', () => {
        expect(accessControl.can('user').readOwn(ResourceType.Profile).granted).toBeTruthy("cant read own");
        expect(accessControl.can('user').readAny(ResourceType.Profile).granted).toBeFalsy("can read any");

        expect(accessControl.can('user').createOwn(ResourceType.Profile).granted).toBeTruthy("cant create own");
        expect(accessControl.can('user').updateOwn(ResourceType.Profile).granted).toBeTruthy("cant update own");
        expect(accessControl.can('user').updateAny(ResourceType.Profile).granted).toBeFalsy("can update any");

        expect(accessControl.can('user').updateOwn(ResourceType.People).granted).toBeTruthy("cant update own person");
        expect(accessControl.can('user').updateAny(ResourceType.People).granted).toBeFalsy("can update any person");

        expect(accessControl.can('user').deleteOwn(ResourceType.Profile).granted).toBeTruthy("cant delete own");
        expect(accessControl.can('user').deleteAny(ResourceType.Profile).granted).toBeFalsy("can delete any");
    });

    it('if unknown role cant do anything', () => {
        expect(accessControl.can(noOne).readOwn(ResourceType.Profile).granted).toBeFalsy("shouldnt read");
        expect(accessControl.can(noOne).createOwn(ResourceType.Profile).granted).toBeFalsy("shouldnt create");
        expect(accessControl.can(noOne).updateOwn(ResourceType.Profile).granted).toBeFalsy("shouldnt update");
        expect(accessControl.can(noOne).deleteOwn(ResourceType.Profile).granted).toBeFalsy("shouldnt delete");

        expect(accessControl.can(noOne).readAny(ResourceType.Profile).granted).toBeFalsy("shouldnt read2");
        expect(accessControl.can(noOne).createAny(ResourceType.Profile).granted).toBeFalsy("shouldnt create2");
        expect(accessControl.can(noOne).updateAny(ResourceType.Profile).granted).toBeFalsy("shouldnt update2");
        expect(accessControl.can(noOne).deleteAny(ResourceType.Profile).granted).toBeFalsy("shouldnt delete2");
    });

});