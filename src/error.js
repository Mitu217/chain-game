
export const ERROR_CODE = {
    // recognition
    FAILED_RECOGNITION: 100,
    // application
    NOT_CHAIN: 200,
    ALREADY_EXISTS: 210,
    END_GAME: 220,
}

export default class AppError {

    constructor(code) {
        this.code = code;
    }

}