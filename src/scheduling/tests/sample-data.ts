import {Role} from "../role";

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
        defaultSpeakerRole = new Role("Speaker", speakerPriority);
        defaultThemeRole = new Role("Theme", speakerPriority);
        defaultLeaderRole = new Role("Worship Leader", leaderPriority);
        defaultSoundRole = new Role("Sound", soundPriority);
        defaultComputerRole = new Role("Computer", soundPriority);
        defaultBass = new Role("Bass", instrumentPriority);
        defaultDrumsRole = new Role("Drums", instrumentPriority);
        defaultKeysRole = new Role("Keys", instrumentPriority);
        defaultAcousticGuitar = new Role("Guitar (Acoustic)", instrumentPriority);
        defaultElectricGuitar = new Role("Guitar (Electric)", instrumentPriority);
        defaultVocalsRole = new Role("Vocals", instrumentPriority);
        defaultSaxRole = new Role("Sax", instrumentPriority);

        defaultAcousticGuitar.maximum_wanted = 2;
        defaultVocalsRole.maximum_wanted = 3;
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

