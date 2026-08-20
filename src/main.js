const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { writeResults } = require('./excel');

const projectRoot = path.resolve(__dirname, '..');
const configPath = process.argv[2] || path.join(projectRoot, 'config', 'test.config.json');

function resolvePath(filePath) {
    return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

function readPngDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer.toString('ascii', 1, 4) !== 'PNG') {
        throw new Error(`Screenshot is not a PNG file: ${filePath}`);
    }
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

async function addUrlBanner(page) {
    await page.evaluate(() => {
        const oldBanner = document.getElementById('__web_auto_test_url');
        if (oldBanner) oldBanner.remove();
        const banner = document.createElement('div');
        banner.id = '__web_auto_test_url';
        banner.textContent = `URL: ${window.location.href}`;
        Object.assign(banner.style, {
            display: 'block', width: '100%', height: '34px', boxSizing: 'border-box',
            padding: '8px 14px', background: '#202124', color: '#fff',
            font: '14px Arial, sans-serif', lineHeight: '18px',
            whiteSpace: 'nowrap', overflow: 'hidden'
        });
        document.body.insertBefore(banner, document.body.firstChild);
    });
}

async function captureScreenshot(page, name, config, sequence, options = {}) {
    const screenshotPath = resolvePath(path.join(
        config.screenshotsDir || 'screenshots',
        `${String(sequence).padStart(2, '0')}-${name}.png`
    ));
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    if (options.includeUrl !== false) await addUrlBanner(page);
    await page.screenshot({ path: screenshotPath, fullPage: options.fullPage !== false });
    const dimensions = readPngDimensions(screenshotPath);
    return { name, path: screenshotPath, url: page.url(), ...dimensions };
}

async function executeStep(page, step, index, config) {
    const stepNumber = index + 1;
    console.log(`[Step ${stepNumber}] ${step.action}${step.name ? `: ${step.name}` : ''}`);
    switch (step.action) {
        case 'goto':
            await page.goto(step.url, { waitUntil: step.waitUntil || 'domcontentloaded' });
            return captureScreenshot(page, step.screenshotName || `page-${index + 1}`, config, index + 1);
        case 'fill':
            {
                const field = page.locator(step.selector);
                await field.fill(String(step.value ?? ''));
                const actualValue = await field.inputValue();
                if (actualValue !== String(step.value ?? '')) {
                    throw new Error(`Step ${stepNumber} fill verification failed: ${step.selector}`);
                }
                console.log(`[Step ${stepNumber}] filled: ${step.selector}`);
            }
            break;
        case 'click':
            if (step.role && step.name) {
                await page.getByRole(step.role, { name: step.name, exact: step.exact ?? true }).click();
            } else {
                await page.locator(step.selector).click();
            }
            break;
        case 'waitForTimeout':
            await page.waitForTimeout(step.ms || 1000);
            break;
        case 'screenshot': {
            return captureScreenshot(page, step.name || 'screenshot', config, index + 1, {
                fullPage: step.fullPage,
                includeUrl: step.includeUrl
            });
        }
        default:
            throw new Error(`Unsupported action at step ${index + 1}: ${step.action}`);
    }
    return null;
}

async function main() {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const { viewport, ...launchOptions } = config.browser || {};
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const screenshots = [];
    try {
        for (let index = 0; index < config.steps.length; index += 1) {
            const screenshot = await executeStep(page, config.steps[index], index, config);
            if (screenshot) screenshots.push(screenshot);
        }
        await writeResults({
            excelPath: resolvePath(config.excel.path),
            sheetName: config.excel.sheetName || 'Result',
            screenshots,
            result: {
                step: config.name || path.basename(configPath),
                status: 'PASS',
                url: page.url(),
                imageStartColumn: config.excel.imageStartColumn,
                maxImageWidth: config.excel.maxImageWidth,
                rowHeight: config.excel.rowHeight,
                gapRows: config.excel.gapRows,
                imageSafetyRows: config.excel.imageSafetyRows
            }
        });
        console.log(`PASS: ${screenshots.length} screenshot(s), Excel: ${resolvePath(config.excel.path)}`);
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
});