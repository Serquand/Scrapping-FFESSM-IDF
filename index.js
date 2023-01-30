import puppeteer from "puppeteer";

const main = async () => {
    const browser = await puppeteer.launch({ 
        headless: false 
    });
    const page = await browser.newPage();

    await page.goto("https://www.ffessmcif.fr/les-clubs/");

    const categoryChoice = await page.waitForSelector("#searchByCat");
    categoryChoice.click();
}

main();