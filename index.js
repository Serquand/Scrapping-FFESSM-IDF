import puppeteer from "puppeteer";

const sleep = async () => {
    return new Promise (
        resolve => setTimeout(resolve, delay)
    );
}

const main = async () => {
    const browser = await puppeteer.launch({ 
        headless: false 
    });
    const page = await browser.newPage();

    await page.goto("https://www.ffessmcif.fr/les-clubs/");

    const categoryChoice = await page.waitForSelector("#searchByCat");
    categoryChoice.click();


    // End of the program
    await sleep(5000);
    page.close();
    browser.close();
}

main();