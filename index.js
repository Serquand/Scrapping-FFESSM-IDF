import puppeteer from "puppeteer";

const headless = process.env.HEAD == "none";

const sleep = (delay) => {
    return new Promise(
         resolve => setTimeout(resolve, delay)
    );
} 

const setup = async () => {
    const browser = await puppeteer.launch({ headless });
    const page = await browser.newPage();

    await page.goto("https://www.ffessmcif.fr/les-clubs/", {
        waitUntil: "networkidle2"
    });

    return page;
}

const openAllInfo = async (page) => {
    const clubChoice = await page.waitForSelector("#empTable tbody");
    const toggable = await clubChoice.$$("td:first-child");


    for(let i = 0; i < toggable.length; i++) {
        await toggable[i].click();
    }
}

const scrapAllInfo = async (page) => {
    await page.waitForSelector("td > table");
    const allInfoContainer = await page.$$("td > table");

    const allInterestingInformations = new Array();

    for(let i = 0; i < allInfoContainer.length; i++) {
        const info = await allInfoContainer[i].evaluate((domElement) => {
            const infoUtile = {
                name: 1, 
                adress: 3, 
                zipCode: 4, 
                website: 6, 
                phone: 7, 
                email: 8, 
                activity: 18
            }
            const informations = domElement.querySelectorAll("tr");
            const info = {}

            for (const infoElement in infoUtile) {
                const element = infoUtile[infoElement];
                const information = informations[element].querySelector("td:last-child").textContent
                info[infoElement] = information
            }

            return info;
        }, allInfoContainer[i]);
        allInterestingInformations.push(info)
    }

    return allInterestingInformations;
}

const getMaxPage = async page => {
    const maxPageElement = await page.$("#empTable_paginate span a:last-child");
    const maxPage = await maxPageElement.evaluate(element => {
        return element.textContent
    }, maxPageElement)

    return maxPage;
}

const navigateNextPage = async (page) => {
    const element = await page.$("#empTable_paginate > :last-child");
    element.click();

    await page.waitForSelector(".odd:not(.shown)");
}

const checkTypeForAClub = club => {
    const interestingActivities = [
        "PLONGÉE ENFANT", 
        "PLONGÉE SPORTIVE EN PISCINE", 
        "TECHNIQUE", 
        "PLONGÉE SOUTERRAINE",
        "PLONGÉE HANDISUB",
    ];

    const clubActivities = club.activity.split(",");

    for(let i = 0; i < clubActivities.length; i++) {
        if(interestingActivities.includes(clubActivities[i].trim())) return true;
    }

    return false;
}

const checkTypeForAll = informations => {
    let newInfo = new Array();

    for (let i = 0; i < informations.length; i++) { 
        const club = informations[i]       
        console.log(club);
        if(!checkTypeForAClub(club)) continue;
        newInfo.push(club);
    }

    return newInfo;
}

const main = async () => {
    let informations = new Array();

    const page = await setup();
    const maxPage = await getMaxPage(page);

    for(let i = 0; i < maxPage; i++) {
        await openAllInfo(page);
        informations.push(await scrapAllInfo(page));
        if(i != maxPage - 1) navigateNextPage(page);
        console.log(i);
        await sleep(2000);
    }

    informations = checkTypeForAll(informations.flat());

    console.log(informations);
}

main();