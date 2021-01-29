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

async function getStatsFromDom(dom, teamName) {
    let teamFirst = false;
    let headerText = dom.window.document.querySelector('div h2').textContent
    let reg = /\(([^)]*)\)/, match;
    const teamShorts = []
    while(match = reg.exec(headerText)) {
        teamShorts.push(match)
        headerText = headerText.replace(match[0], " ")
    }
    const beginnerStatRows = dom.window.document.querySelector('.heittorivi_aloittava');
    if(beginnerStatRows.textContent && beginnerStatRows.textContent.search(teamShorts[0][1]) !== -1) {
        teamFirst = true;
    }
    const teamStatRows = teamFirst ? 
    [...dom.window.document.querySelectorAll('.heittorivi_aloittava')].filter(x => x.textContent ? true : false) :
    [...dom.window.document.querySelectorAll('.heittorivi_ei_aloittava')].filter(x => x.textContent ? true : false)
    
    const rowStats = []
    teamStatRows.forEach(x => {
        rowStats.push(getPlayerStatsFromRow(x));
    })
    
}

async function getPlayerStatsFromRow(row) {

}
const teamName = "hommattiinatsku"
//const matchLinks = getTeamMatchLinks(teamName);
//handleMatchLinks(matchLinks);
const mockData = JSDOM.fromFile('./mock_data.html').then(x => {
    getStatsFromDom(x, teamName);
});
//getStatsFromDom(mockData);