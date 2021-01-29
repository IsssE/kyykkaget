const jsdom = require("jsdom");
const fetch = require("node-fetch");
const got = require("got");
const scraper = require("table-scraper");
const { JSDOM } = jsdom;


async function getTeamMatchLinks(teamName) {
    got(`https://kyykkaliiga.fi/joukkueet/${teamName}`).then(response => {
    
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

async function handleMatchLinks(matchLinks) {
    for(link in matchLinks) {
        got(link).then(response => {
            const dom = new JSDOM(response.body);
            getStatsfromdom(dom);
        })
    }
}

// This is stupid and bad and idiotic
function identifyTeamShort(header, teamName, teamShorts) {
    console.debug("header[0]", header[0])
    console.debug("teamname", teamName)
    const indexWithTeamName = header[0].toLowerCase().search(teamName) !== -1 ? 0 : 1
    
    const correctShort = header[indexWithTeamName].includes(teamShorts[0][0]) ? 0 : 1;
    return teamShorts[correctShort][1]
}

async function getStatsFromDom(dom, teamName) {
    let headerText = dom.window.document.querySelector('div h2').textContent;
    const splitHeader = headerText.split("—");
    let reg = /\(([^)]*)\)/, match;
    const teamShorts = [];
    
    while(match = reg.exec(headerText)) {
        teamShorts.push(match);
        headerText = headerText.replace(match[0], " ");
    }
    teamShort = identifyTeamShort(splitHeader, teamName.toLowerCase(), teamShorts)

    const teamStatRows = [...dom.window.document.querySelectorAll('.heittorivi_aloittava'),
    ...dom.window.document.querySelectorAll('.heittorivi_ei_aloittava')].filter(x => x.textContent ? true : false);
    
    
    const rowStats = teamStatRows.map((x, index) => {
        return getPlayerStatsFromRow(x.textContent, (index % 4) + 1);
    })

    const players = new Map();
    rowStats.forEach(player => {
        console.log("player.teamShort: ", player.teamShort )
        console.log("teamShort", teamShort)
        if(player.teamShort === teamShort) {

            if(!players.has(player.name)){
                players.set(player.name, []);
            }
            
            players.get(player.name).push(player);
        }
    });
    console.debug(players)
}

function getPlayerStatsFromRow(statRow, position) {
    // Sorry :D
    const parsedRow = statRow 
    .replace(/(\t)/gm,"")       // remove \t
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
        name: row[0],
        hka: row[6],
        hauki: stats.filter(x => x.toUpperCase() === 'H').length,
        amount: throws.filter(x => x.toUpperCase('E')).length,
        position: position,
        teamShort: row[0].split(',').map(x => x.trim())[1],
        throws
    };
}

const teamName = "kuha ei oo hauki"
//const matchLinks = getTeamMatchLinks(teamName);
//handleMatchLinks(matchLinks);
const mockData = JSDOM.fromFile('./mock_data.html').then(x => {
    getStatsFromDom(x, teamName);
});
//getStatsFromDom(mockData);