import { Howl } from "howler";

const initializeSounds = (soundGroups) => {
    return soundGroups.map(group => ({
        ...group,
        sounds: group.sounds.map(sound => ({
            ...sound,
            howl: new Howl({
                src: [sound.url],
                volume: sound.volume,
            }),
        })),
    }));
};

export { initializeSounds }