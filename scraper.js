/**
 * Scraper for getting player data from kyykkaliiga.fi
 * Knowingly tried to write messier code to do something fast.
 * Rather that focus on mainteinability.
 */

const FileSystem = require("fs");
const jsdom = require("jsdom");
const got = require("got");
const { JSDOM } = jsdom;


async function getTeamMatchLinks(teamName) {
    return got(`https://kyykkaliiga.fi/joukkueet/${teamName}`).then(response => {
        const dom = new JSDOM(response.body);
        const linkList = [...dom.window.document.querySelectorAll('a')];

        return linkList
            .filter(x => {
                if (x.href && x.text == "Tilasto") {
                    return true;
                }
                else false;
            })
            .map(x => x.href);
    });
}

async function handleMatchLinks(matchLinks, teamName) {
    const maps = [];
    for (link of matchLinks) {
        await got(link.toString()).then((response, index) => {
            const dom = new JSDOM(response.body);
            const matchPlayerData = getStatsFromDom(dom, teamName);
            maps.push(matchPlayerData);
        })
    }

    writeDataToFile(maps, teamName);
}

// This is stupid and bad and idiotic
function identifyTeamShort(header, teamName, teamShorts) {
    const indexWithTeamName = header[0].toLowerCase().search(teamName) !== -1 ? 0 : 1

    const correctShort = header[indexWithTeamName].includes(teamShorts[0][0]) ? 0 : 1;
    return teamShorts[correctShort][1]
}

function getStatsFromDom(dom, teamName) {
    let headerText = dom.window.document.querySelector('div h2').textContent;
    // Risky split :sweaty_smile:
    const splitHeader = headerText.split("\n\t–");
    const date = headerText.split(",")[1].trim();
    let reg = /\(([^)]*)\)/, match;
    const teamShorts = [];

    while (match = reg.exec(headerText)) {
        teamShorts.push(match);
        headerText = headerText.replace(match[0], " ");
    }
    teamShort = identifyTeamShort(splitHeader, teamName.toLowerCase(), teamShorts)

    const teamStatRows = [...dom.window.document.querySelectorAll('.heittorivi_aloittava'),
    ...dom.window.document.querySelectorAll('.heittorivi_ei_aloittava')].filter(x => x.textContent ? true : false);

    
    const rowStats = teamStatRows.map((x, index) => {
        return getPlayerStatsFromRow(x.textContent, (index % 4) + 1);
    })

    const players = []
    rowStats.forEach(player => {
        if (player.teamShort === teamShort) {
            players.push(player);
        }
    });

    const matchData = getMatchTeamDataFromDom(dom)
    let teamMatch = {};
    matchData.teamStart.name === teamShort ? 
        teamMatch = matchData.teamStart :
        teamMatch = matchData.teamNonStart
    
    
    const result = { date, teamMatch, players }
    return result;
}

function getMatchTeamDataFromDom(dom) {
    const document = dom.window.document;
    const teamStart = {
        name: document.querySelector(".lopputulos .aloittava_nimi").textContent.replace(":", "").trim(),
        roundScores: [...document.querySelectorAll(".eratulos .aloittava_pisteet")].map(x => x.textContent.trim()),
        endScore: document.querySelector(".lopputulos .aloittava_pisteet").textContent.trim(),
    }
    const teamNonStart =  {
        name: document.querySelector(".lopputulos .ei_aloittava_nimi").textContent.replace(":", "").trim(),
        roundScores: [...document.querySelectorAll(".eratulos .ei_aloittava_pisteet")].map(x => x.textContent.trim()),
        endScore: document.querySelector(".lopputulos .ei_aloittava_pisteet").textContent.trim(),
    }
    const result = {teamStart, teamNonStart}
    return result
}

function getPlayerStatsFromRow(statRow, position) {
    // Sorry :D
    const parsedRow = statRow
        .replace(/(\t)/gm, "")       // remove \t
        .split("\n")                // split for each line
        .filter(x => {
            return /\S/.test(x);
        })                          // filter away empy array values

        .map(x => x.trim());        // remove useless whitespaces from values

    return createStats(parsedRow, position)
}

function createStats(row, position) {
    const stats = row.slice(1);
    const throws = row.slice(1, 5);
    return {
        name: row[0].split(',').map(x => x.trim())[0], // redundant but let it be
        hka: row[6],
        hauki: stats.filter(x => x.toUpperCase() === 'H').length,
        amount: throws.filter(x => x.toUpperCase('E')).length,
        position: position,
        teamShort: row[0].split(',').map(x => x.trim())[1],
        throws
    };
}
function writeDataToFile(results, teamName) {
    const fileName = `${teamName}.json`;

    FileSystem.closeSync(FileSystem.openSync(fileName, 'w'))

    FileSystem.appendFile(fileName, JSON.stringify(results), (error) => {
        if (error) throw error;
    });
}

const teamName = "hommattiinatsku"
getTeamMatchLinks(teamName).then(x => {
    handleMatchLinks(x, teamName);
});
/*
const mockData = JSDOM.fromFile('./mock_data.html').then(x => {
    getStatsFromDom(x, teamName);
});*/
//getStatsFromDom(mockData);