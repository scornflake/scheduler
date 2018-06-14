import {Role} from "../scheduling/role";

let speakerPriority = 12;
let leaderPriority = 11;
let soundPriority = 10;
let instrumentPriority = 10;

let defaultSpeakerRole: Role = null;
let defaultThemeRole: Role = null;
let defaultLeaderRole: Role = null;
let defaultSoundRole: Role = null;
let defaultComputerRole: Role = null;
let defaultBass: Role = null;
let defaultDrumsRole: Role = null;
let defaultKeysRole: Role = null;
let defaultAcousticGuitar: Role = null;
let defaultElectricGuitar: Role = null;
let defaultVocalsRole: Role = null;
let defaultSaxRole: Role = null;


function SetupDefaultRoles() {
    if (defaultSoundRole == null) {
        defaultSpeakerRole = new Role("Speaker", 1, 1, speakerPriority);
        defaultThemeRole = new Role("Theme", 1, 1, speakerPriority);
        defaultLeaderRole = new Role("Worship Leader", 1, 1, leaderPriority);
        defaultSoundRole = new Role("Sound", 1, 1, soundPriority);
        defaultComputerRole = new Role("Computer", 1, 1, soundPriority);
        defaultBass = new Role("Bass", 1, 1, instrumentPriority);
        defaultDrumsRole = new Role("Drums", 1, 1, instrumentPriority);
        defaultKeysRole = new Role("Keys", 1, 1, instrumentPriority);
        defaultAcousticGuitar = new Role("Guitar (Acoustic)", 0, 2, instrumentPriority);
        defaultElectricGuitar = new Role("Guitar (Electric)", 0, 1, instrumentPriority);
        defaultVocalsRole = new Role("Vocals", 1, 3, instrumentPriority);
        defaultSaxRole = new Role("Sax", 0, 2, instrumentPriority);
    }
}


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

    SetupDefaultRoles
};

