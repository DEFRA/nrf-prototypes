/**
 * Logger utility for Planning Data Analyzer
 */

class Logger {
    static log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }

    static error(message, error = null) {
        this.log(message, 'ERROR');
        if (error) {
            console.error(error);
        }
    }

    static info(message) {
        this.log(message, 'INFO');
    }

    static success(message) {
        this.log(message, 'SUCCESS');
    }

    static warn(message) {
        this.log(message, 'WARN');
    }

    static debug(message) {
        if (process.env.DEBUG) {
            this.log(message, 'DEBUG');
        }
    }
}

module.exports = Logger; 