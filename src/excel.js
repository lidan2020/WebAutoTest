const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

function columnLetterToIndex(columnLetter) {
    const normalized = String(columnLetter || 'B').trim().toUpperCase();
    if (!/^[A-Z]+$/.test(normalized)) {
        throw new Error(`Invalid Excel column: ${columnLetter}`);
    }

    let index = 0;
    for (const character of normalized) {
        index = index * 26 + character.charCodeAt(0) - 64;
    }
    return index - 1;
}

async function writeResults({ excelPath, sheetName, screenshots, result }) {
    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(excelPath)) await workbook.xlsx.readFile(excelPath);

    const sheet = workbook.getWorksheet(sheetName) || workbook.addWorksheet(sheetName);
    // ExcelJS 4.x exposes images for reading but has no removeImage API.
    sheet._media = [];
    sheet._rows = [];
    sheet.columns = [
        { header: 'Step', key: 'step', width: 28 },
        { header: 'Result', key: 'result', width: 18 },
        { header: 'URL', key: 'url', width: 55 }
    ];
    sheet.addRow({ step: result.step, result: result.status, url: result.url });
    if (!workbook.views) workbook.views = [];
    if (workbook.views.length === 0) workbook.views.push({ activeTab: 0 });
    workbook.views[0].activeTab = workbook.worksheets.indexOf(sheet);

    const imageColumn = columnLetterToIndex(result.imageStartColumn);
    const firstImageRow = Math.max(sheet.rowCount + 1, 2);
    const rowHeight = result.rowHeight || 18;
    const gapRows = result.gapRows ?? 2;
    const imageSafetyRows = result.imageSafetyRows ?? 8;
    let nextRow = firstImageRow;

    for (const screenshot of screenshots) {
        const originalWidth = screenshot.width;
        const originalHeight = screenshot.height;
        if (!originalWidth || !originalHeight) {
            throw new Error(`Missing screenshot dimensions: ${screenshot.path}`);
        }
        const maxImageWidth = Number(result.maxImageWidth);
        const scale = Number.isFinite(maxImageWidth) && maxImageWidth > 0
            ? Math.min(1, maxImageWidth / originalWidth)
            : 1;
        const imageWidth = Math.round(originalWidth * scale);
        const imageHeight = Math.round(originalHeight * scale);
        const imageId = workbook.addImage({
            filename: screenshot.path,
            extension: path.extname(screenshot.path).slice(1) || 'png'
        });
        sheet.addImage(imageId, {
            tl: { col: imageColumn, row: nextRow - 1 },
            ext: { width: imageWidth, height: imageHeight }
        });
        // Keep extra rows because Excel row units and image pixels are not identical.
        const occupiedRows = Math.ceil(imageHeight / rowHeight) + imageSafetyRows;
        for (let rowNumber = nextRow; rowNumber < nextRow + occupiedRows; rowNumber += 1) {
            sheet.getRow(rowNumber).height = rowHeight;
        }
        nextRow += occupiedRows + gapRows;
    }

    fs.mkdirSync(path.dirname(excelPath), { recursive: true });
    await workbook.xlsx.writeFile(excelPath);
}

module.exports = { writeResults };