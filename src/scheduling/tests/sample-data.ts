import {Role} from "../role";

let speakerPriority = 12;
let leaderPriority = 11;
let soundPriority = 10;
let instrumentPriority = 10;

let defaultSpeakerRole = new Role("Speaker", speakerPriority);
let defaultThemeRole = new Role("Theme", speakerPriority);
let defaultLeaderRole = new Role("Worship Leader", leaderPriority);
let defaultSoundRole = new Role("Sound", soundPriority);
let defaultComputerRole = new Role("Computer", soundPriority);
let defaultBass = new Role("Bass", instrumentPriority);
let defaultDrumsRole = new Role("Drums", instrumentPriority);
let defaultKeysRole = new Role("Keys", instrumentPriority);
let defaultAcousticGuitar = new Role("Guitar (Acoustic)", instrumentPriority);
let defaultElectricGuitar = new Role("Guitar (Electric)", instrumentPriority);
let defaultVocalsRole = new Role("Vocals", instrumentPriority);
let defaultSaxRole = new Role("Sax", instrumentPriority);

defaultAcousticGuitar.maximum_count = 2;
defaultVocalsRole.maximum_count = 3;

export {
    defaultSpeakerRole,
    defaultThemeRole,
    defaultLeaderRole,
    defaultSoundRole,
    defaultComputerRole,
    defaultBass,
    defaultDrumsRole,
    defaultKeysRole,
    defaultAcousticGuitar,
    defaultElectricGuitar,
    defaultVocalsRole,
    defaultSaxRole,
};

