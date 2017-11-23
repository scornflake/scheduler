import {ScheduleCreatorProvider} from "./schedule-creator";
import {async, ComponentFixture, TestBed} from "@angular/core/testing";
import {MyApp} from "../../app/app.component";
import {IonicModule, Platform} from "ionic-angular";
import {StatusBar} from "@ionic-native/status-bar";
import {PlatformMock, SplashScreenMock, StatusBarMock} from "../../../test-config/mocks-ionic";
import {SplashScreen} from "@ionic-native/splash-screen";

describe('scheduler', () => {
    // let comp: ScheduleCreatorProvider;
    // let fixture: ComponentFixture<ScheduleCreatorProvider>;
    //
    // let people = [
    //     {name: 'neil'},
    //     {name: 'daniel'}
    // ];
    //
    // beforeEach(async(() => {
    //     TestBed.configureTestingModule({
    //         declarations: [MyApp],
    //         imports: [
    //             IonicModule.forRoot(MyApp)
    //         ],
    //         providers: [
    //             ScheduleCreatorProvider,
    //             {provide: StatusBar, useClass: StatusBarMock},
    //             {provide: SplashScreen, useClass: SplashScreenMock},
    //             {provide: Platform, useClass: PlatformMock}
    //         ]
    //     })
    // }));
    //
    // beforeEach(() => {
    //     fixture = TestBed.createComponent(ScheduleCreatorProvider);
    //     comp = fixture.componentInstance;
    // });
    //
    // it('can dates for a date', () => {
    //     expect(comp instanceof ScheduleCreatorProvider).toBe(true);
    // })
});
