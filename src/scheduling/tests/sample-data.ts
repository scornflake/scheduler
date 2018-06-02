import {ServiceRole} from "../service";

let speakerPriority = 12;
let leaderPriority = 11;
let soundPriority = 10;
let instrumentPriority = 10;

let defaultSpeakerRole: ServiceRole = null;
let defaultThemeRole: ServiceRole = null;
let defaultLeaderRole: ServiceRole = null;
let defaultSoundRole: ServiceRole = null;
let defaultComputerRole: ServiceRole = null;
let defaultBass: ServiceRole = null;
let defaultDrumsRole: ServiceRole = null;
let defaultKeysRole: ServiceRole = null;
let defaultAcousticGuitar: ServiceRole = null;
let defaultElectricGuitar: ServiceRole = null;
let defaultVocalsRole: ServiceRole = null;
let defaultSaxRole: ServiceRole = null;


function SetupDefaultRoles() {
    if (defaultSoundRole == null) {
        defaultSpeakerRole = new ServiceRole("Speaker", 1, 1, speakerPriority);
        defaultThemeRole = new ServiceRole("Theme", 1, 1, speakerPriority);
        defaultLeaderRole = new ServiceRole("Worship Leader", 1, 1, leaderPriority);
        defaultSoundRole = new ServiceRole("Sound", 1, 1, soundPriority);
        defaultComputerRole = new ServiceRole("Computer", 1, 1, soundPriority);
        defaultBass = new ServiceRole("Bass", 1, 1, instrumentPriority);
        defaultDrumsRole = new ServiceRole("Drums", 1, 1, instrumentPriority);
        defaultKeysRole = new ServiceRole("Keys", 1, 1, instrumentPriority);
        defaultAcousticGuitar = new ServiceRole("Guitar (Acoustic)", 0, 2, instrumentPriority);
        defaultElectricGuitar = new ServiceRole("Guitar (Electric)", 0, 1, instrumentPriority);
        defaultVocalsRole = new ServiceRole("Vocals", 1, 3, instrumentPriority);
        defaultSaxRole = new ServiceRole("Sax", 0, 2, instrumentPriority);
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

