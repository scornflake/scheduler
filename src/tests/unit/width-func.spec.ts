import {WidthAwareValue} from "../../common/responsive";
import {PlatformMock} from "ionic-mocks";

describe('rendering based on width', () => {
    let platform;
    let wav;
    beforeEach(() => {
        platform = PlatformMock.instance();
        wav = new WidthAwareValue();
    });

    it('should return null if empty', function () {
        platform.width.and.returnValue(0);
        expect(wav.render(platform))
    });

    it('should return single value if thats all that it has', function () {
        wav = new WidthAwareValue(42);
        platform.width.and.returnValue(0);
        expect(wav.render(platform)).toEqual(42);
        platform.width.and.returnValue(1000);
        expect(wav.render(platform)).toEqual(42);
        platform.width.and.returnValue(2220);
        expect(wav.render(platform)).toEqual(42);
    });

    it('should provide different values', function () {
        wav = new WidthAwareValue();
        wav
            .add(100, () => 100)
            .add(200, () => 200);

        platform.width.and.returnValue(0);
        expect(wav.render(platform)).toEqual(100, "zero?!");

        platform.width.and.returnValue(100);
        expect(wav.render(platform)).toEqual(100, "dead on");

        platform.width.and.returnValue(101);
        expect(wav.render(platform)).toEqual(200, "just over");

        platform.width.and.returnValue(84388384);
        expect(wav.render(platform)).toEqual(200, "super large");
    });
});