/**A hacker gang manager!
 * Unlike every "guide" or script out there, here is a gang script specifically
 * for hacking gangs! The setup is simpler, the micromanagement is lower, but the 
 * money gain is slower in terms of ramp up.
 * 
 * Hacker Gangs:
 *  - They do not need to worry about territory or their wars (although it can help)
 *  - They only care about hacking and charisma (so cars and such do matter)
 *  - Have a really low ramp up and require training, rootkits, and augments.
 *  - Best when you have other means of income (corporation, stocks, botnet, hacknet)
 * 
 * Requirements:
 *  - Access to Gangs (BN-2)
 *  - Formulas API (For now?)
 *  - [Recommended] Other means of money as this can and will be slow
 * 
 * 	Written By: Zharay
 *  URL: https://github.com/Zharay/BitburnerBotnet
**/

const useFormulas = true;           // Will use functions that require Formulas API [Currently REQUIRED] 
const spendAmount = 0.2;            // Multiplier of player's money to spend
const maxWantedGain = 0;            // Maximum wanted level gained per tick
const initialHackLevel = 120;       // New recruits will train to this amount of hacking
const ascensionMultiThresh = 1.5;   // The hacking multiplier threshold we wait for before ascending grunts
const trainToMod = 0.5;             // After ascension, train to previous hack level * modifier

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    
    // First check if we are in a gang. If not, keep trying to create one.
    while(!ns.gang.inGang()) {
        for (let gangName of hackerGangs) {
            if (ns.gang.createGang(gangName)) break;
        }
        await ns.sleep(2000);
    }
    
    var grunts = [...ns.gang.getMemberNames().map(_name => {return {name: _name}})];

    if (!ns.gang.getGangInformation().isHacking) {
        ns.alert("Your gang are not hackers! I'm sorry but gang-nullsec is not the script for you!");
        return;
    }

    // Main Loop
    while(true) {
        // Recruit
        while (ns.gang.canRecruitMember()) {
            let newName = generateName(ns);
            if (ns.gang.recruitMember(newName)) {
                ns.print(`Recruited ${newName}!`);
                grunts.push({name: newName});
            }
        }

        // Ascend
        updateGrunts(ns, grunts);
        handleAscension(ns, grunts);

        // Equip
        updateGrunts(ns, grunts);
        handleEquips(ns, grunts);

        // Task
        updateGrunts(ns, grunts);
        handleTasks(ns, grunts);

        await ns.sleep(1000);
    }
}

/**
 * Handles each grunt's task. We train them if they need training. The rest is done via wanted gain budget.
 * @param {NS} ns 
 * @param {Object[]} grunts 
 */
function handleTasks(ns, grunts) {
    let tasks = [...ns.gang.getTaskNames().map(_name => {
        let stats = ns.gang.getTaskStats(_name);
        stats.name = _name;
        return stats;
    })];
    tasks = tasks.filter(function(t) {return t.isHacking && t.baseMoney > 0});

    // TODO: Manually figure out tasks
    if (!useFormulas) {
        handleTasksManually(ns, grunts, tasks);
        return;
    }
    
    let lowestWantedGain = 0;
    let curWantedGain = 0;
    let lowestWantedName = "";
    
    // Sort by wanted gain then calculate the minimum wanted gain we can currently get.
    tasks.sort((x, y) => x.baseWanted - y.baseWanted);
    grunts.forEach(g => {lowestWantedGain += g[tasks[0].name].wantedGain});
    lowestWantedName = tasks[0].name;

    // Then loop through our grunts (already sorted by hacker level by updateGrunts)
    for(var grunt of grunts) {
        if ((grunt.oldHack > grunt.hack || (grunt.oldHack == 0 && grunt.hack <= initialHackLevel)) && grunt.task != "Train Hacking") {
            // If you haven't trained enough (or at all), train!
            if (ns.gang.setMemberTask(grunt.name, "Train Hacking"))
                ns.print(`[${grunt.name}] assigned to Train Hacking!`);
            else 
                ns.print(`ERROR: Failed to assign [${grunt.name}] to Train Hacking...`);
        } else if (grunt.task == "Train Hacking" && (grunt.oldHack == 0 && grunt.hack > initialHackLevel)) {
            // If you are new and are training, stop when you reach your goal, set oldHack to your current hack for the next go `round
            grunt.oldHack = grunt.hack;
        } else {
            // Rest is normal task logic. Find what fits within our budget wanted level. We do not want go above a certain level of gain
            tasks.sort((x, y) => y.baseMoney - x.baseMoney);
            let foundTask = false;
            for(const task of tasks) {
                if (foundTask) continue;
                
                // We only accept this task if it is within our limits (we have enough negative wanted gain and we won't be going over our max wanted gain by choosing it)
                if (grunt[task.name].wantedGain + curWantedGain <= -lowestWantedGain && (lowestWantedGain - grunt[lowestWantedName].wantedGain) + grunt[task.name].wantedGain <= maxWantedGain) {
                    //ns.print(`[${grunt.name}] ${task.name}\t\t${ns.nFormat(grunt[task.name].wantedGain, "0.000")} + ${ns.nFormat(curWantedGain, "0.000")} (${ns.nFormat(grunt[task.name].wantedGain + curWantedGain, "0.000")}) <= ${ns.nFormat(lowestWantedGain, "0.000")} && ${ns.nFormat(lowestWantedGain, "0.000")} - ${ns.nFormat(grunt[lowestWantedName].wantedGain, "0.000")} + ${ns.nFormat(grunt[task.name].wantedGain, "0.000")} (${ns.nFormat(lowestWantedGain - grunt[lowestWantedName].wantedGain + grunt[task.name].wantedGain, "0.000")}) <= ${maxWantedGain}`);
                    if (grunt.task != task.name && ns.gang.setMemberTask(grunt.name, task.name)) {
                        ns.print(`[${grunt.name}] assigned to ${task.name}!`);
                        curWantedGain += grunt[task.name].wantedGain;
                        lowestWantedGain += -grunt[lowestWantedName].wantedGain;
                        foundTask = true;
                        break;
                    } else if (grunt.task == task.name) {
                        foundTask = true;
                        curWantedGain += grunt[task.name].wantedGain;
                        lowestWantedGain += -grunt[lowestWantedName].wantedGain;
                        break;
                    } else {
                        ns.print(`ERROR: Failed to assign [${grunt.name}] to ${task.name}...`);
                    }
                } 
            }
        }
    }
}

/**
 * TODO: A manual method of the above. It'd have to do so without relying on formulas... which I do NOT wanna do lol.
 * @param {NS} ns 
 * @param {Object[]} grunts 
 * @param {Object[]} tasks 
 */
function handleTasksManually(ns, grunts, tasks) {
    for (const task of tasks) {
        ns.print(`[${task.name}] hackWeight:${task.hackWeight} chaWeight:${task.chaWeight} baseMoney:${task.baseMoney} baseRespect:${task.baseRespect} baseWanted:${task.baseWanted}`)
    }
}

/**
 * Handles the ascension of grunts. Will only do so if the multiplier is high enough and if we have enough respect.
 * @param {NS} ns 
 * @param {Object[]} grunts 
 */
function handleAscension(ns, grunts) {
    for (var grunt of grunts) {
        let ascensionResult = ns.gang.getAscensionResult(grunt.name);
        //ns.print(`[${grunt.name}] ${ascensionResult.hack}`);
        if (ascensionResult && ascensionResult.hack >= ascensionMultiThresh && ascensionResult.respect <= ns.gang.getGangInformation().respect) {
            let result = ns.gang.ascendMember(grunt.name);
            if (result) {
                ns.print(`[${grunt.name}] has been ascended! (hack: ${ns.nFormat(grunt.hack_asc_mult, "0.000a")} -> ${ns.nFormat(result.hack * grunt.hack_asc_mult, "0.000a")})`);
                grunt.oldHack = grunt.hack * trainToMod;
            }
        }
    }
}

/**
 * Handles the purchasing of equipment by buying whatever is cheapest first.
 * @param {NS} ns 
 * @param {Object[]} grunts 
 */
function handleEquips(ns, grunts) {
    // Fills with all the info we need. Then filter and sort it.
    let equipsInfo = [...ns.gang.getEquipmentNames().map(_name => {
        let info = ns.gang.getEquipmentStats(_name);
        info.cost = ns.gang.getEquipmentCost(_name);
        info.name = _name
        return info;
    })];
    equipsInfo = equipsInfo.filter(function(e) {return e.hack || e.cha;});
    equipsInfo.sort((e, f) => e.cost - f.cost);

    for(const grunt of grunts) {
        for (const equip of equipsInfo) {
            let allowance = ns.getServerMoneyAvailable("home") * spendAmount;
            if (allowance >= equip.cost && !grunt.upgrades.includes(equip.name) && !grunt.augmentations.includes(equip.name)) {
                ns.gang.purchaseEquipment(grunt.name, equip.name);
                ns.print(`[${grunt.name}] Purchased ${equip.name} for ${ns.nFormat(equip.cost, "$0.000a")}`);
            }
        }
    }
}

/**
 * Obtains the latest grunt info and sorts the list by hack level.
 * This does it via Object.keys() as we are adding/modifying each entry as needed elsewhere.
 * If you have the Formulas API you also get the faster task info.
 * @param {NS} ns 
 * @param {Object[]} grunts Updated via pass-by-reference
 */
function updateGrunts(ns, grunts) {
    for (let i = 0; i < grunts.length; i++) {
        // Obtain general information and pass each key + value to our grunt
        let info = ns.gang.getMemberInformation(grunts[i].name);
        Object.keys(info).forEach(key => grunts[i][key] = info[key]);

        // Initialize oldHack once
        grunts[i].oldHack ||= 0;

        // Obtain formulas only data for each available task
        if (useFormulas) {
            
            ns.gang.getTaskNames().forEach(taskName => {
                if (ns.gang.getTaskStats(taskName).isHacking) {
                    grunts[i][taskName] = {};
                    grunts[i][taskName]["moneyGain"] = ns.formulas.gang.moneyGain(ns.gang.getGangInformation(), ns.gang.getMemberInformation(grunts[i].name), ns.gang.getTaskStats(taskName)) * 5;
                    grunts[i][taskName]["respectGain"] = ns.formulas.gang.respectGain(ns.gang.getGangInformation(), ns.gang.getMemberInformation(grunts[i].name), ns.gang.getTaskStats(taskName)) * 5;
                    grunts[i][taskName]["wantedGain"] = ns.formulas.gang.wantedLevelGain(ns.gang.getGangInformation(), ns.gang.getMemberInformation(grunts[i].name), ns.gang.getTaskStats(taskName)) * 5;
                }
            });
        }
    }

    // Sort them by their hacker level.
    grunts.sort((x, y) => y.hack - x.hack);
}

/**
 * Will attempt to generate a random grunt name from a pre-made list.
 * If it cannot find a unique name, it will randomize the case of each letter.
 * @param {NS} ns 
 * @returns {String}
 */
function generateName(ns) {
    const members = ns.gang.getMemberNames();
    var name = "";
	var isUnique = false;
    var numTries = 0;
    while (!isUnique || numTries > 10) {
        name += gruntNames[Math.floor(Math.random() * gruntNames.length)];
        if (numTries > 3) {
            name.toLowerCase().split('').map(function(c){
                return Math.random() < .5? c : c.toUpperCase();
            }).join('');
        }
        isUnique = !members.includes(name);
        numTries++
    }

    return name;
}

// List of hacker gangs. Cannot be dynamically obtained :(
const hackerGangs = ["The Black Hand", "NiteSec"];

// List of grunt names to use. Mostly gods and actual hackers/hacker groups lol
const gruntNames = ["4chan", "8chan", "Anon", "Anonymous", "Mano", "Crazy", "Hax0r", "Rez", "Kou", "Zeus", "Poseidon", "Chronos", "Eros", "Achlys", "Aether", "Aion", "Ananke", "Chaos", "Erebus", "Hemera", "Hypnos", "Nemesis",
                    "Nesoi", "Nyx", "Ourea", "Pontus", "Tartarus", "Thalassa", "Thanatos", "Ura", "Cronus", "Demeter", "Hades", "Hera", "Apollo", "Art3mis", "Parzival", "Aphrodite", "Ares", "Hephaestus", "Hermes", "Athena", 
                    "Dionysus", "Hestia", "Hecate", "Aeolus", "PedoBear", "FeelsBadMan.jpg", "AreYaWinningSon?", "Ero", "xXxXxXx", "Lain", ".hack", "Shadow", "Empress", "3DM", "CLASS", "CODEX", "DEViANCE", "Echelon", "EVO", 
                    "FAiRLiGHT", "HATRED", "PARADOX", "Phrozen", "PROPHET", "Razor1911", "RELOADED", "REVOLT", "SKIDROW", "STEAMPUNKS", "ViTALiTY", "NEO", "NULL", "CYPRUS"]