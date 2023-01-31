import puppeteer from "puppeteer";
import excel from "exceljs";

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
        if(!checkTypeForAClub(club)) continue;
        newInfo.push(club);
    }

    return newInfo;
}

const generateExcel = informations => {
    const wb = new excel.Workbook();

    const allActivity = wb.addWorksheet("Liste des clubs de plongée");
    allActivity.columns = [
        { header: 'Nom du club', key: 'name', width: 40 },
        { header: 'Adresse du club', key: 'adress', width: 40 },
        { header: 'Code postale', key: 'zipCode', width: 40 },
        { header: 'Site Web', key: 'website', width: 40 },
        { header: 'Numéro de téléphone', key: 'phone', width: 40 },
        { header: 'Adresse email', key: 'email', width: 40 },
        { header: 'Activités', key: 'activity', width: 40 },
    ];
    allActivity.addRows(informations.allActivity);

    const keys = Object.keys(informations);

    for(let i = 0; i < keys.length; i++) {
        if(keys[i] == "allActivity") continue;
        
        const worksheet = wb.addWorksheet(keys[i]);
        worksheet.columns = [
            { header: 'Nom du club', key: 'name', width: 40 },
            { header: 'Adresse du club', key: 'adress', width: 40 },
            { header: 'Code postale', key: 'zipCode', width: 40 },
            { header: 'Site Web', key: 'website', width: 40 },
            { header: 'Numéro de téléphone', key: 'phone', width: 40 },
            { header: 'Adresse email', key: 'email', width: 40 },
            { header: 'Activités', key: 'activity', width: 40 },
        ];
        worksheet.addRows(informations[keys[i]]);
    }

    wb.xlsx.writeFile("Liste des clubs.xlsx")
}

const checkContact = clubs => {
    return clubs.filter(club => {
        return club.email !== "" && club.phone !== ""
    })
}

const groupByActivities = clubs => {
    const activities = { allActivity: clubs };
    const interestingActivities = [
        "PLONGÉE SPORTIVE EN PISCINE", 
        "TECHNIQUE", 
        "PLONGÉE SOUTERRAINE",
        "PLONGÉE HANDISUB",
    ];

    for(let i = 0; i < clubs.length; i++) {
        const thisActivities = clubs[i].activity.split(", ");

        for(let j = 0; j < thisActivities.length; j++) {
            console.log(thisActivities[j]);
            if(interestingActivities.includes(thisActivities[j])) {
                if(activities[thisActivities[j]]) {
                    activities[thisActivities[j]].push(clubs[i]);
                } else {
                    activities[thisActivities[j]] = [clubs[i]];
                }
            }
        }
    }

    return activities;
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
        await sleep(1000);
    }

    informations = checkTypeForAll(informations.flat());
    informations = checkContact(informations);
    informations = groupByActivities(informations);
    console.log(informations.allActivity.length, Object.keys(informations));

    generateExcel(informations);
}

main();