# BitburnerBotnet
An all in one botnet for the game Bitburner that grows on its own and efficiently hacks all targets within a set criteria. All the while every server is talking to your home computer, giving you up-to-date information as to what is going on at any given moment. As a bonus, there are also scripts that automatically handle your Hacknet, private servers, and stock markets!

![Nearing The Red Pill on first BitNode](/ss/Screenshot1.jpg)

# How to Use - Quick and Dirty
A TL;DR  for those who don't want the full details.

**Requirements**
- A home computer (in game) with at least 32GB of RAM (64GB for all scripts). 
- Increase Netscript Port size from 50 to 100 in settings.
- You DO NOT need Formulas.exe~!

**Basic steps**
1. Import each file in this repo into Bitburner.
2. Open up coordinator.js and modify the options at the top to your preferences (mainly money threshold)
3. Run restart-scripts.js
4. To get a readout of the botnet go to Active Scripts > Home > check-status.js > LOG
5. PROFIT

## Getting Started - Starting from nothing
Lets assume you are starting fresh (either in a brand new game or a new BitNode) and have 32GB of RAM. Just follow these steps and after a few hours (if at hack level 1) you should be making a few billion quiet easily.

1. Open coordinator.js and perform the following changes
	- `minServerGrowth = 1`
	- `minServerMoney = 1`
2. Open buy-server.js and perform the following changes
	- `spendPercentage = 0.2`
3. (Optional) If you do not have access to the stock market or you do not have 64GB of RAM on your home machine
	- Open restart-scripts.js and perform the following changes
		- `skipStockBot = true` (requires a $6b buy in)
		- `skipBuyServer = true` (requires you have 64GB of RAM to run concurrently)
4. In terminal run restart-scripts.js
	- It should now start auto-spreader-v2, coordinator, hack-daemon, check-status, and hacknet-mgr scripts
	- Your first few remote bots will start working on the servers that fit the criteria set in coordinator.js
5. Go to Active Scripts > home > check-status and open up the LOG.
	- Keep this open! It will give you real-time information on your botnet and the servers you are targeting
6. Let everything run for a while. Eventually you'll reach enough hack skill to make your first few programs.
	- Once you have BruteSSH.exe, auto-spreader will automatically root servers that require 1 port and add them to your botnet.
	- I suggest getting a job to earn some extra dough. The first hour can be very slow.
7. Once you have enough hack skill, you will start to see targets in your check-status window that are more profitable.
	- In coordinator.js : `minServerGrowth = 20` (or 30)
	- In coordinator.js : `minServerMoney = 1e7` (or 1e6) (1e7 is a shorthand way of expressing 10^7 = 10 million)
	- Either kill all scripts or run sendKill.js and wait for the current threads to finish
	- Run restart-scripts.js
8. Wait! We need $200k for a TOR access (bought at computer store in city) then an additional $1m (?)
	- Keep doing work at jobs as you increase in hack skill! Every bit helps.
9. Connect to the darkweb and buy what you can (FTPCrack.exe and relaySMTP.exe)
	- Doing so will add way more to the botnet!
10. Upgrade your home computer's RAM to 64GB and set `skipBuyServer = false` in restart-scripts.js and rerun it.
	- Alternatively, just run buy-server.js in your terminal
11. Buy the rest of the port programs from the darkweb (HTTPWorm.exe = $30m and SQLInjec.exe = $250m)
12. You are practically done. The game is now your plaything.

These are the exact steps I took starting BitNode1.2. 9 hours later and the image below is where I am sitting at with my Hack skill at 416 while making $1.38m/sec (and growing)!

![9 hours into BitNode1.2](/ss/Screenshot4.jpg)

### Long Term Notes
Eventually you'll notice reduction of threads on your targets. This is 100% normal. Notice the security levels and money. Once you have enough RAM, your botnet can easily maintain a balance where everything is within a sweet spot, constantly generating money for you. There is nothing more for you to do except narrow down your targets by increasing minServerMoney and minServerGrowth.

# Preface
Like everyone I started small with the tutorial scripts. I wanted everything to be dynamic, with no hard coded server names as I feel that'd defeat the purpose of this whole game ("lol not cheating in a game promoting hacking and embezzlement"). Once I got something working, I kept asking myself: "Is this efficient enough?"

By trade I am a Software Engineer, I majored in Computer Science, and have been programming for nearly 20 years. It's a habit of mine to look at a problem as ask that question repeatedly. So when I finally came round to playing this game, I thought I'd only do it for a few days and move on. I was mistaken.

# How it Works
Ports, a robust coordinator, and the bots that do the leg work. Basically a [Master-Server Load Balance network](https://en.wikipedia.org/wiki/Load_balancing_(computing))!

The setup on paper is simple. We have a central coordinator that handles information coming in and out. This central hub is where all servers in the botnet get information on which targets to go for, how many threads are actively being worked on, and so much more. Each server runs their own hack-daemon that handles the actual task of figuring out which target to work on and how many threads would be needed to achieve a specific goal. The bottom line is that everything must use as little resources as necessary to maximize results. This is not a simple HWGW with timers and so on. A single server can and will have multiple tasks running at any given moment; growing, weakening, and hacking different servers all at the same times. Meanwhile, those tasks are themselves talking to the coordinator, reporting on their work and any risk they might incur to security.

To do all the above, we do need a few other helper scripts which will be further detailed below. The real star of the show would be the ports. Out of the 20 available I'm using 17 of them, most of which are JSON object arrays that every part of the botnet has access to. Without this, nothing would work efficiently at all.

In practice this is a lot more complicated than it seems. I spent days getting things right and I learned a ton along the way. This is seriously the most efficient way to (not) play Bitburner.

# The Core Scripts
Each script serves a specific purpose, the core of which are essential for everything to work.

## coordinator.js (4.95 GB)
The heart of the botnet and the handler of nearly all the ports used. Uses heavy use of JSON objects to keep a log of everything going on. This can be ran solo without restart-scripts but you must pass it a list of all servers deliminated by a comma [,] or semicolon [;]. Due to how much information this script must handle, time is always an issue. In fact, it can be considered the a bottleneck. By default it is set to a very generous 1000ms, but it can run smoothly even at 500ms. Keep your (real) processor's capabilities into account when lowering this option!

For information on all the ports, visit the [wiki](https://github.com/Zharay/BitburnerBotnet/wiki)!

### Options
```
const debug 		= false;	// Enables multiple log messages. Leave this alone unless you want lag.
const threshModifier 	= 0.75;		// Money threshold that we hack towards (we always grow to 100%)
const minHackChance 	= 0;	 	// Min hack chance to target
const minServerGrowth	= 30;		// Min server growth to target
const minServerMoney 	= 1 * 1e9;	// Min money the server has at its maximum to target (10^9 = $1.0b)
const loopInterval 	= 1000;		// Amount of time the coordinator waits per loop. Can be CPU intensive
```

## hack-daemon.js (9.35 GB)
The bot itself. This script is ran on all remote machines and works with the information produced by the coordinator to figure out who to target, how many threads are needed, and whether they have permission to run a task. Unlike basic hack scripts, this will always try to do something thanks to the information available at all times. 

All three actions (hack, grow, weaken) are done via their own script, but these scripts only do two things: their given task to the target server and reporting the start and finish of said task to the coordinator. Both grow and hack can and will generate an increase in security and we use that information to run preemptive weaken threads. 

Note: This script cannot run standalone! It will wait for the coordinator to populate the data it needs within the ports.

**General Task Loop** 

The hack-daemon will loop through all targets obtained from the coordinator and perform the following for each task:
1. See if the target falls within the criteria to work our task on.
	- If it is, ask coordinator for lock
		- If we get lock, move forward
		- If we do not get lock after requesting for it, sleep for 1 second and skip this task
		- If the lock was already assigned, just move on to the next task
2. If we get lock, figure out how many threads are needed to reach our goal
	- Only use as much as the server's RAM can support
3. Check the coordinator's current thread count on the task
	- If not enough threads are on the task to reach the goal, run as many threads as needed (or can)
	- If enough threads are being used, give up
4. Release lock and wait 1 second.
5. After two runs through the entire target list and if we have enough RAM available, dedicate the rest to EXP farming.

**Options**
```
const debug = false;	//  Enables debug logs. 
const homeCPU = 1;	// The number of CPUs on your home server. Better to just set it here than waste RAM
const expRuns = 2;	// The number of cycles to complete before using your remaining RAM on EXP farms
```

### weaken.js (1.75 GB)
Fun fact: weaken lowers a server's security by 0.05 per thread, regardless of the time it takes to run. We use this to our advantage!

**We only weaken...**
- If we are close to the minimum threshold (minimum security level + 5)
- Or if there is a reported security risk (security risk > 5)
- If we even have enough RAM to run the script
- If there is no lock set

**How many threads to use**

A security breach (securityBreach) is a 2x multiplier that only occurs when there is more security + security risk that is 2x the security threshold. We do this due to lucky hack scripts winning more than they should.

`RequiredThreads = (((SecurityLevel + SecurityThreat - SecurityThreshold) / 0.05) * SecurityBreach) - NumThreadsWeakening`

### grow.js (1.75 GB)
Growth is always a 1 CPU task unless its on the home server. Overall, we always grow to 98% due to how hacking works.

**We only grow...**
- If the money available is less than 98% of the maximum
- If, in addition to the above, the number of hack threads will bring the money below that 98% threshold
- If we have enough RAM to even run the script
- If there is no lock set

**How much to grow**

We must generate a multiplier that, when applied to the current amount of money on the target, would get us to the maximum amount of money the server can hold. So this is more of a question of much we must multiply rather than how many threads needed (which we get with _ns.growthAnalyze_). 

```
MoneyMultiplier = MaxMoney / (MoneyAvailable - HackAmount)
HackAmount = [%AmountTaken] * MoneyAvailable * NumHackThreads * ChanceToHack
Above ignored if MoneyAvailable == 0 or AmountGrow <= 0 (if so, MoneyMultiplier = 1)
```

### hack.js (1.70 GB)
Hacking is fast and dumb, so we must be extra careful we do not overdo it. But because hacking has a chance to fail, we must compensate by adding it into the equation. This will effectively multiply the number of threads by the inverse of the chance. At the same time, we could outright fail every hack if our hack level is too low or the server's security too high, so we must avoid that situation from the beginning.

**We only hack...**
- If the money available is greater than the threshold (a % of its maximum set by the coordinator)
- If the chance to hack the target is over 10%
- If you have the RAM needed to run the script
- If there is no lock

**How many threads to use (when using _ns.hackAnalyze_)**

`RequiredThreads = ((MoneyAvailable - MoneyThreshold) / HackChance) - NumThreadsHacking`

## auto-spread-v2.js (4.95 GB)
Will seek out, root, copy files to, and begin scripts for all servers in the network. It will keep searching for new servers until you have all programs to do so. This is where the coordinator starts, getting a full list of all servers in the BitNode. This script also doubles as a means to refresh all files across the network. That way, any changes made on the home server will be reflected by the rest when this is done.

The script's core functionality (finding and rooting all servers) was created by [KrunoSaho](https://gist.github.com/KrunoSaho/f0aa418e16e828b0ebc0585d1ebcf6b5). There is still commented code that can backdoor every server if you want, but honestly its better to just do so manually (plus it is VERY slow depending on your skill level).

## buy-server.js (11.50 GB)
This script handles the expensive task of buying and maintaining purchased private servers. It will figure out on its own how much RAM the lowest server has and will attempt to upgrade when necessary. This script is very expensive to run and most of the blame goes to the purchase server commands. Those with only 32GB RAM will likely need to wait until you have 64GB or more to use this.

By default, private servers are only upgraded when their RAM utilization goes beyond a threshold percentage (80%). 

A note on tasks already running on servers that are deleted. Before finishing the job of deleting the server, the buy-server script will emulate hack, grow, and weaken scripts by reporting to the coordinator that their task is done. It grabs the information it needs from the arguments passed to each script, even removing the security risk that would've been applied. Downside, if you are rapidly upgrading servers, some long tasks will never get to finish (which can be a problem when they can take up to an hour to complete).

**Options**
```
var memLevel = 4;		// 4 = 16GB (Recommended minimum to run hack-daemon)
const maxLevel = 20; 		// True maximum is 20 (1048576GB = 1 Petrabyte) 
const spendPercentage = 0.02; 	// Percentage of maximum money to spend on server upgrades.
const ramUsageThreshold = 0.8;	// Percentage of global ram used in hacks. If it goes beyond this, upgrade for more capacity.
const waitInterval = 1000*60*5; // Time to wait between cycles (in ms)
```

## easy-hack.js (2.4 GB)
This is literally just baby's first hacking script, the very same one found in the tutorial. However, it's been modified to make use of the coordinator's target list to... do whatever it wants, really. This is a dumb script that does not report to the coordinator what it is doing as it is only for servers that have 8GB of RAM or less (lookin' at you n00dles!). As such, this is only just to make use of every bit of capacity we can when in the early stage of a BitNode run. It may be dumb but it honestly gets the job done!

## check-status.js (3.0 GB)
This is a purely optional script that gives a log readout of the data being sent by the coordinator. It gives you hard numbers as to who your targets are, hacker level requirements, security levels (current / threshold [risk]), Money situation (current / max [threshold]), growth, hack chance, and an exact number of threads (and RAM) being used to hack, grow, and weaken them. It is your go to place to stare at when you want to know exactly what is going on at any given moment. In real time you will see the botnet change from growing to weaken to eventually hacking when the conditions are right.

![Example of a single target server on the botnet](/ss/Screenshot3.jpg)

When I got this running and the botnet fully functioning, you cannot imagine my fist pumps. Its like being in college all over again lol.

The memory footprint is small and can technically be brought down to 1.6GB, but that would only spread the burden to the already big coordinator.

## The Ports
_To find more information on the ports used in this botnet, please refer to the [wiki](https://github.com/Zharay/BitburnerBotnet/wiki)!_

# Other Scripts
The rest of the scripts in this repo do not have a direct effect on the botnet and are only just extra avenues of obtaining money. Some have been curated from other programmers found on Reddit and Github and tailored to fit my needs. Credit goes to those people with enough drive to provide at least a starting answer to some of the more difficult BitNodes in the game!

## restart-scripts.js (3.8 GB)
This is a script that will simply kill all scripts on the home machine (except for the stock-bot) and go about doing the same for all servers there after. It will then clear the ports before restarting auto-spread-v2, hacknet-mgr, and buy-server scripts (also stock-bot is it is not running). This is you're quick and easy way to get everything started!

## hacknet-mgr.js (9.7 GB)
Who did this script? I don't know! **If someone can find out who, please let me know because this is seriously efficient.** The best Hacknet script out there. It will always upgrade by the most efficient and cost effective method first, leaving the most expensive upgrades for absolutely last. That means it will often buy more servers before looking at the other upgrades on each machine.

If you are just starting out or on a new BitNode run, keep this script running! It will easily outpace a beginner botnet until you have the skill, programs, and augments needed to make it shine!

## stock-bot.js (19.7 GB)
This script was originally written by [u/havoc_mayhem](https://www.reddit.com/user/havoc_mayhem/) and can be found [here](https://www.reddit.com/r/Bitburner/comments/9o1xle/stock_market_script/). It's been 4 years since and people are still fixing and updating the script. I've since added my own fixes to this script as well, going as far as to add my own stock ticker because I didn't want to bother clicking to the tabs needed to get to the in game one. As a bonus, it will report your earnings in numbers that actually matter....

But this script has problems. First it requires $31b in funds to get up and running. Second, its value as a money maker is completely up to chance. Think of it more of a very long term hedge fund. In early game (meaning 0-10 augments), it will indeed outperform any hacking you do, but once your botnet is in full swing with a decent setup of augments, the stock trends to flatten due to your botnet's influence.

**Requirements:**
- Access to the TX API ($1b)
- Access to the 4S Market Data API ($5b)
- Access to Market Data TIX API ($25b)

## stock-bot-v2.js (23.7 GB)
This script was written by [u/peter_lang](https://www.reddit.com/user/peter_lang/) and his script can be found [here](https://www.reddit.com/r/Bitburner/comments/rsqffz/bitnode_8_stockmarket_algo_trader_script_without/). This script makes full use of shorts and longs found in BitNode 8 and by my eyes looks to be one of the best at fully using actual math to do the job of what a 4S Market Data API would do. I'll admit, I haven't used this script yet as I am on another BitNode, but until then this gets to sit here until I do use it (and modify it to my own needs).

**Requirements:**
- Be on or have finished BitNode 8
- Access to the TX API
- Optional: Access to the 4S market Data API

## getServerStatus.js (2.2 GB)
A terminal only script that you can use to get all the information you'll need a one or more servers. I find this to be more informative than any built in exe you can create and it can give you information that'd be useful for your botnet. Just run the command below in the terminal along with the money threshold (0.75) and the host names separated by spaces between each.

`run getServerStatus.js [moneyThreshold:Number] [Hostname] ... [Hostname]`

## liquidate.js (1.6GB) and sendKill.js (1.6GB)
These two scripts have one function each. liquidate.js will send the flag to Port 19 telling your stock-bot to sell all stocks and shutdown. sendKill.js will send a flag to Port 20 telling all running scripts that listen for it to shutdown gracefully (leaving any lingering tasks to complete naturally). It's a good way to shut things down when you are finishing up a run or when you want to close things before making script edits.