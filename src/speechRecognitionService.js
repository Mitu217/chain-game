export default class SpeechRecognitionService {

    constructor() {
        const SpeechRecognition =
            typeof window !== 'undefined' &&
            (window.SpeechRecognition ||
                window.webkitSpeechRecognition ||
                window.mozSpeechRecognition ||
                window.msSpeechRecognition ||
                window.oSpeechRecognition);

        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ja-JP';
        this.recognition.maxAlternatives = 1;
    }

    onResult = (callback) => {
        this.recognition.onresult = (event) => {
            if (!event.results) {
                return;
            }
            const result = event.results[event.results.length - 1];
            if (!result.isFinal) {
                callback('', false);
                return;
            }
            return callback(result[0].transcript, true);
        }
    };

    onEnd = (callback) => {
        this.recognition.onend = () => callback();
    }

    start = () => {
        if (this.recording) {
            return;
        }
        this.recording = true;
        this.recognition.start();
    }

    stop = () => {
        this.recording = false;
        this.recognition.stop();
    }

}
