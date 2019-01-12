import React, { Component } from 'react';
import kuromoji from "kuromoji";
import SpeechRecognitionService from '../speechRecognitionService';
import AppError, { ERROR_CODE } from '../error';
import '../styles/Game.css';

const PHASE = {
    RESET:  1,
    WAIT:   2,
    RECORD: 3,
    CHECK:  4,
    RESULT: 5,
    NEXT:   6,
};

const initialState = {
    currentPhase: PHASE.RESET,
    nextWord: '',
    previousWords: ['しりとり'],
    error: '',
};

class Game extends Component {

    constructor(props) {
        super(props);
        this.state = initialState;
    }

    componentDidMount() {
        this.recognition = new SpeechRecognitionService();
        this.movePhase(PHASE.RESET);
    }

    componentWillUnmount() {
        this.stopRecord();
        this.recognition = null;
    }

    backTitle = () => {
        this.props.moveTitle();
    }

    movePhase = (next) => {
        this.setState({
            ...this.state,
            currentPhase: next,
        });

        switch (next) {
            case PHASE.RESET:
                this.setState(initialState);
                this.movePhase(PHASE.WAIT);
                break;
            case PHASE.WAIT:
                this.startRecord();
                break;
            case PHASE.CHECK:
                this.stopRecord();
                break;
            case PHASE.NEXT:
                const {previousWords, nextWord} = this.state;
                let nextPreviousWords = previousWords.slice();
                nextPreviousWords.push(nextWord);
                this.setState({
                    ...this.state,
                    nextWord: '',
                    previousWords: nextPreviousWords,
                });
                this.movePhase(PHASE.WAIT);
                break;
            case PHASE.RESULT:
                if (this.state.error === '') {
                    setTimeout(() => {
                        this.movePhase(PHASE.NEXT);
                    }, 1500);
                } else {
                    setTimeout(() => {
                        this.backTitle();
                    }, 3000);
                }
                break;
            case PHASE.RECORD:
                break;
            default:
                console.warn('undefined phase action');
        }
    }

    textToHiragana = (text) => {
        return new Promise((resolve, reject) => {
            kuromoji.builder({ dicPath: "/dict" }).build((err, tokenizer) => {
                if(err){
                    reject(err);
                    return;
                } else {
                    const tokens = tokenizer.tokenize(text);
                    if (tokens.length === 0 || tokens[0]['word_type'] === 'UNKNOWN') {
                        reject(new AppError(ERROR_CODE.FAILED_RECOGNITION));
                        return;
                    }
                    if (!tokens[0]['reading']) {
                        reject(new AppError(ERROR_CODE.FAILED_RECOGNITION));
                        return;
                    }
                    let reading = tokens[0]['reading'];
                    // 読み仮名はカタカナで帰ってくるのでひらがなに変換
                    const hiragana = reading.replace(/[\u30a1-\u30f6]/g, function(match) {
                        const chr = match.charCodeAt(0) - 0x60;
                        return String.fromCharCode(chr);
                    });
                    resolve(hiragana);
                }
            });
        });
    }

    checkContinue = () => {
        return new Promise((resolve, reject) => {
            const { previousWords, nextWord } = this.state;
            if (nextWord === undefined || nextWord === '') {
                reject(new AppError(ERROR_CODE.FAILED_RECOGNITION));
                return;
            }

            const previousWord = previousWords[previousWords.length - 1];
            let lastWord = previousWord.slice(-1);
            if (lastWord === 'ー') {
                lastWord = previousWord.slice(0, -1).slice(-1);
            }
            // FIXME UpperCase for Japanese
            switch(lastWord) {
                case 'ぁ':
                    lastWord = 'あ';
                    break;
                case 'ぃ':
                    lastWord = 'い';
                    break;
                case 'ぅ':
                    lastWord = 'う';
                    break;
                case 'ぇ':
                    lastWord = 'え';
                    break;
                case 'ぉ':
                    lastWord = 'お';
                    break;
                case 'っ':
                    lastWord = 'つ';
                    break;
                case 'ゃ':
                    lastWord = 'や';
                    break;
                case 'ゅ':
                    lastWord = 'ゆ';
                    break;
                case 'ょ':
                    lastWord = 'よ';
                    break;
                case 'ゎ':
                    lastWord = 'わ';
                    break;
                default:
            }

            if (nextWord.slice(-1) === "ん") {
                reject(new AppError(ERROR_CODE.END_GAME));
                return;
            }
            if (lastWord !== nextWord.slice(0, 1)) {
                reject(new AppError(ERROR_CODE.NOT_CHAIN));
                return;
            }
            if (previousWords.indexOf(nextWord) >= 0) {
                reject(new AppError(ERROR_CODE.ALREADY_EXISTS));
                return;
            }

            resolve(true);
        });
    }

    onRecognitionResult = async (text, isFinal) => {
        if (!isFinal) {
            this.movePhase(PHASE.RECORD);
            return;
        }

        this.movePhase(PHASE.CHECK);

        const hiragana = await this.textToHiragana(text).catch((err) => {
            switch(err.code) {
                case ERROR_CODE.FAILED_RECOGNITION:
                    this.movePhase(PHASE.WAIT);
                    break;
                default:
                    this.backTitle();
                    return;
            }
        });

        this.setState({
            nextWord: hiragana,
        });

        const success = await this.checkContinue(hiragana).catch((err) => {
            switch(err.code) {
                case ERROR_CODE.FAILED_RECOGNITION:
                    this.movePhase(PHASE.WAIT);
                    break;
                case ERROR_CODE.END_GAME:
                    this.setState({
                        error: '「ん」で終わったので負けです',
                    });
                    this.movePhase(PHASE.RESULT);
                    break;
                case ERROR_CODE.NOT_CHAIN:
                    this.setState({
                        error: 'しりとりに失敗しています',
                    });
                    this.movePhase(PHASE.RESULT);
                    break;
                case ERROR_CODE.ALREADY_EXISTS:
                    this.setState({
                        error: '既に使った単語です',
                    });
                    this.movePhase(PHASE.RESULT);
                    break;
                default:
                    console.error(err);
                    this.backTitle();
                    return;
            }
        });

        if (success) {
            this.movePhase(PHASE.RESULT);
        }
    }

    onRecognitionEnd = () => {
        this.stopRecord();
        if (this.state.currentPhase === PHASE.WAIT) {
            this.startRecord();
            return;
        }
        console.log('end');
    }

    startRecord = () => {
        if (this.recognition == null) {
            return;
        }
        this.recognition.onResult(this.onRecognitionResult);
        this.recognition.onEnd(this.onRecognitionEnd);
        this.recognition.start();
    }

    stopRecord = () => {
        this.recognition.stop();
    }

    render() {
        const { currentPhase, previousWords, nextWord, error } = this.state;
        const previousWord = previousWords[previousWords.length - 1];

        let content = '';
        switch (currentPhase) {
            case PHASE.RECORD:
                content = (
                    <div>
                        <p className="Previous-Word">{previousWord}</p>
                        <p className="Down-Arrow">↓</p>
                        <p className="Description">認識中...</p>
                    </div>
                );
                break;
            case PHASE.CHECK:
                content = (
                    <div>
                        <p className="Previous-Word">{previousWord}</p>
                        <p className="Down-Arrow">↓</p>
                        <p className="Description">判定中...</p>
                    </div>
                );
                break;
            case PHASE.RESULT:
                content = (
                    <div>
                        <p className="Previous-Word">{previousWord}</p>
                        <p className="Down-Arrow">↓</p>
                        <p className={error === '' ? 'Next-Word Success' : 'Next-Word Fail'}>{nextWord}</p>
                    </div>
                );
                break;
            default:
                content = (
                    <div>
                        <p className="Previous-Word">{previousWord}</p>
                        <p className="Down-Arrow">↓</p>
                        <p className="Description">?</p>
                    </div>
                );
        }

        let resultAnimation = '';
        if (currentPhase === PHASE.RESULT) {
            if (error === '') {
                resultAnimation = (
                    <div className="Animation Success">
                        <span>○</span>
                    </div>
                );
            } else {
                resultAnimation = (
                    <div className="Animation Fail">
                        <span>✕</span>
                        <p className="Description">{error}</p>
                    </div>
                );
            }
        }

        return (
            <div className="Game">
                {content}
                {resultAnimation}
            </div>
        );
    }

}

export default Game;
