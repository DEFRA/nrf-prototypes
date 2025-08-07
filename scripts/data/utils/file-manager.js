/**
 * File Manager utility for Planning Data Analyzer
 */

const fs = require('fs').promises;
const Logger = require('./logger');

class FileManager {
    static async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
            Logger.info(`Created directory: ${dirPath}`);
        }
    }

    static async fileExists(dirPath) {
        try {
            await fs.access(dirPath);
            return true;
        } catch {
            return false;
        }
    }

    static async saveJson(data, filePath) {
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            Logger.success(`Saved JSON file: ${filePath}`);
            return true;
        } catch (error) {
            Logger.error(`Failed to save JSON file: ${filePath}`, error);
            return false;
        }
    }

    static async loadJson(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            Logger.error(`Failed to load JSON file: ${filePath}`, error);
            return null;
        }
    }

    static async saveCsv(data, filePath, headers) {
        try {
            const csvContent = this.convertToCsv(data, headers);
            await fs.writeFile(filePath, csvContent);
            Logger.success(`Saved CSV file: ${filePath}`);
            return true;
        } catch (error) {
            Logger.error(`Failed to save CSV file: ${filePath}`, error);
            return false;
        }
    }

    static convertToCsv(data, headers) {
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row =>
            headers.map(header => {
                const value = row[header] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
        );
        return [csvHeaders, ...csvRows].join('\n');
    }
}

module.exports = FileManager; 