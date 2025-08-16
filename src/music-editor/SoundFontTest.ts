import { SoundFont2, Preset, Instrument, Sample } from 'soundfont2';

// Set up the Web Audio API
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

/**
 * Parses an SF2 file and plays a note manually using the correct API.
 * @param sf2Url The URL of the .sf2 file to load.
 * @param presetIndex The index of the preset (instrument) to play.
 * @param noteNumber The MIDI note number to play (e.g., 60 for Middle C).
 */
async function playSoundfontNote(sf2Url: string, presetIndex: number, noteNumber: number) {
    try {
        console.log(`Loading soundfont from ${sf2Url}...`);
        
        const response = await fetch(sf2Url);
        if (!response.ok) {
            throw new Error(`Failed to fetch SF2 file: ${response.statusText}`);
        }
        const sf2ArrayBuffer = await response.arrayBuffer();
        const sf2Uint8Array = new Uint8Array(sf2ArrayBuffer);

        // Parse the ArrayBuffer using the static from() method.
        const soundfont: SoundFont2 = SoundFont2.from(sf2Uint8Array);
        
        console.log(`Soundfont loaded successfully. Available presets: ${soundfont.presets.length}`);

        // 1. Find the correct preset by its index.
        const preset: Preset = soundfont.presets[presetIndex];
        if (!preset) {
            throw new Error(`Preset at index ${presetIndex} not found.`);
        }
        
        // 2. Find the instrument that corresponds to the preset.
        // The API provides `preset.instrumentIndex` to do this.
        const instrument: Instrument = soundfont.instruments[preset.header.bagIndex];
        if (!instrument) {
            throw new Error(`No instrument found for preset at index ${presetIndex}`);
        }
        
        // 3. Find the correct sample for the given note.
        // You must iterate through the instrument's zones.
        const findSampleForNote = (instr: Instrument, note: number): Sample | null => {
            for (const zone of instr.zones) {
              if (zone.keyRange == undefined) {
                continue;
              }
                // Check if the note is within the zone's key range.
                if (note >= zone.keyRange.lo && note <= zone.keyRange.hi) {
                    return zone.sample;
                }
            }
            return null;
        };
        
        const sample: Sample | null = findSampleForNote(instrument, noteNumber);
        if (!sample) {
            throw new Error(`No sample found for note ${noteNumber} in preset ${presetIndex}.`);
        }
        
        // 4. Decode the raw audio data into an AudioBuffer.
        //const audioBuffer: AudioBuffer = await audioContext.decodeAudioData(sample.data.slice(0).buffer);

        // 4. Create an AudioBuffer from the raw sample data.
        // This is the corrected approach, replacing decodeAudioData.

        // a. Get the required parameters from the sample header.
        const sampleRate: number = sample.header.sampleRate;
        const totalSamples: number = sample.data.length;

        // b. Create an empty AudioBuffer. We'll assume mono (1 channel) for simplicity,
        // as is common for many SoundFont samples.
        const audioBuffer: AudioBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);

        // c. Get a reference to the buffer's channel data.
        const channelData: Float32Array = audioBuffer.getChannelData(0);

        // d. Copy and normalize the 16-bit integer sample data into the
        // 32-bit float channel data, scaling it to the [-1.0, 1.0] range.
        for (let i = 0; i < totalSamples; i++) {
            channelData[i] = sample.data[i] / 32768.0;
        }


        // 5. Create an AudioBufferSourceNode and set its properties.
        const sourceNode: AudioBufferSourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        
        // Use the sample's pitch information to set the playback rate.
        const samplePitch: number = sample.header.originalPitch;
        sourceNode.playbackRate.value = Math.pow(2, (noteNumber - samplePitch) / 12);
        
        // 6. Connect the source node to the destination.
        sourceNode.connect(audioContext.destination);

        // 7. Play the note!
        sourceNode.start(0);

        console.log(`Playing note ${noteNumber} from preset ${presetIndex}.`);

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

// Example usage:
const sf2FileUrl = './Thurston Waffles.sf2';
const pianoPresetIndex = 0; 
const middleC = 60;

// To start the audio context on a user gesture as required by most browsers
document.body.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    playSoundfontNote(sf2FileUrl, pianoPresetIndex, middleC);
}, { once: true });

console.log('Click anywhere on the page to load the soundfont and play the note.');
