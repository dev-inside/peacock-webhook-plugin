const { readFileSync, existsSync } = require("fs")  
const { join } = require("path")  
  
// Import Peacock version constant for plugins  
const { PEACOCKVERSTRING } = require("@peacockproject/core/utils")  
  
let config = null  
const locationCache = new Map()  
  
// Load plugin configuration from JSON file  
try {  
    const configPath = join(process.cwd(), "plugins", "pck-webhook-conf.json")  
    if (existsSync(configPath)) {  
        config = JSON.parse(readFileSync(configPath, "utf-8"))  
    }  
} catch (e) {  
    console.log("Config error:", e.message)  
}  
  
// Send webhook data to configured URL with error handling  
async function sendWebhook(url, data) {  
    if (!url) return  
    try {  
        await fetch(url, {  
            method: "POST",  
            headers: { "Content-Type": "application/json" },  
            body: JSON.stringify(data)  
        })  
    } catch (error) {  
        console.log("Webhook error:", error.message)  
    }  
}  
  
// Check if a specific live event type is enabled in configuration  
function isEventEnabled(eventType) {  
    if (!config || !config.liveEventConfig) {  
        return true  
    }  
    return config.liveEventConfig[eventType] !== false  
}  
  
// Map internal game mode types to readable English aliases  
function getGameModeAlias(type) {  
    const modeMap = {  
        "mission": "Mission",  
        "escalation": "Escalation",     
        "elusive": "Elusive Target",  
        "arcade": "Arcade",  
        "usercreated": "User Created",  
        "sniper": "Sniper Assassin",  
        "campaign": "Campaign",  
        "versus": "Versus",  
        "featured": "Featured",  
        "creation": "Creation",  
        "tutorial": "Tutorial",  
        "orbis": "Orbis",  
        "evergreen": "Freelancer",  
        "flashback": "Flashback",  
        "vsrace": "Versus Race"  
    }  
    return modeMap[type] || type || "Unknown"  
}  
  
// Location alias array - maps location IDs to human-readable names  
function getLocationAlias(locationId) {  
    const locationMap = {  
        "LOCATION_ICA_FACILITY_SHIP": "ICA Facility Ship",  
        "LOCATION_ICA_FACILITY_ARRIVAL": "ICA Facility Arrival",  
        "LOCATION_ICA_FACILITY": "ICA Facility",  
        "LOCATION_COASTALTOWN": "Sapienza",  
        "LOCATION_COASTALTOWN_EBOLA": "Sapienza",  
        "LOCATION_COASTALTOWN_MOVIESET": "Sapienza",  
        "LOCATION_COASTALTOWN_NIGHT": "Sapienza",  
        "LOCATION_MARRAKECH": "Marrakesh",  
        "LOCATION_MARRAKECH_NIGHT": "Marrakesh",  
        "LOCATION_BANGKOK": "Bangkok",  
        "LOCATION_BANGKOK_ZIKA": "Bangkok",  
        "LOCATION_COLORADO": "Colorado",  
        "LOCATION_COLORADO_RABIES": "Colorado",  
        "LOCATION_HOKKAIDO": "Hokkaido",  
        "LOCATION_HOKKAIDO_FLU": "Hokkaido",  
        "LOCATION_HAWKE": "Hawke's Bay",  
        "LOCATION_MIAMI": "Miami",  
        "LOCATION_SANTAFORTUNA": "Santa Fortuna",  
        "LOCATION_MUMBAI": "Mumbai",  
        "LOCATION_NORTHAMERICA": "Whittleton Creek",  
        "LOCATION_NORTHSEA": "Isle of Sgàil",  
        "LOCATION_GREEDY_RACCOON": "New York",  
        "LOCATION_OPULENT_STINGRAY": "Haven Island",  
        "LOCATION_COLOMBIA": "Santa Fortuna",  
        "LOCATION_GOLDEN_GECKO": "Dubai",  
        "LOCATION_ELEGANT_LLAMA": "Mendoza",  
        "LOCATION_ANCESTRAL_BULLDOG": "Dartmoor",  
        "LOCATION_EDGY_FOX": "Berlin",  
        "LOCATION_WET_RAT": "Chongqing",  
        "LOCATION_ANCESTRAL_SMOOTHSNAKE": "Mendoza",  
        "LOCATION_CARPATHIAN_MOUNTAINS": "Carpathian Mountains",  
        "LOCATION_AMBROSE_ISLAND": "Ambrose Island",  
        "LOCATION_NEWZEALAND": "Hawke's Bay",  
        "LOCATION_TRAPPED_WOLVERINE": "Carpathian Mountains",  
        "LOCATION_ROCKY_DUGONG": "Ambrose Island",  
        "LOCATION_AUSTRIA": "Himmelstein",  
        "LOCATION_SALTY_SEAGULL": "Hantu Port",  
        "LOCATION_CAGED_FALCON": "Siberia",
        "LOCATION_SNUG": "Safehouse"
    }  
      
    return locationMap[locationId] || locationId  
}  
  
// Cached location resolution to avoid repeated lookups  
function getLocationNameCached(locationId, gameVersion) {  
    const cacheKey = `${locationId}-${gameVersion}`  
      
    if (locationCache.has(cacheKey)) {  
        return locationCache.get(cacheKey)  
    }  
      
    const resolvedName = getLocationAlias(locationId)  
    locationCache.set(cacheKey, resolvedName)  
    return resolvedName  
}  
  
// Event handler mapping for efficient lookup instead of if/else chains  
const eventHandlers = {  
    "Kill": (event, liveEventData) => {  
        liveEventData.type = event.Value?.IsTarget ? "Target eliminated" : "Non-target eliminated"  
        liveEventData.target = event.Value.RepositoryId  
    },  
    "Pacify": (event, liveEventData) => {  
        liveEventData.type = "NPC pacified"  
        liveEventData.target = event.Value.RepositoryId  
    },  
    "ContractFailed": (event, liveEventData) => {  
        liveEventData.type = "Mission failed"  
    },  
    "ContractEnd": (event, liveEventData) => {  
        if (!event.Value?.missionFailed) {  
            liveEventData.type = "Mission completed"  
        }  
    },  
    "Disguise": (event, liveEventData) => {  
        liveEventData.type = "Disguise changed"  
        liveEventData.disguise = event.Value  
    },  
    "DisguiseBlown": (event, liveEventData) => {  
        liveEventData.type = "Disguise blown"  
        liveEventData.disguise = event.Value  
    },  
    "Spotted": (event, liveEventData) => {  
        liveEventData.type = "Spotted"  
        liveEventData.spottedBy = event.Value  
    },  
    "Witnesses": (event, liveEventData) => {  
        liveEventData.type = "Witnesses"  
        liveEventData.witnesses = event.Value  
    },  
    "BodyHidden": (event, liveEventData) => {  
        liveEventData.type = "Body hidden"  
        liveEventData.bodyId = event.Value.RepositoryId  
    },  
    "BodyFound": (event, liveEventData) => {  
        liveEventData.type = "Body found"  
        liveEventData.bodyId = event.Value.RepositoryId  
    },  
    "ItemPickedUp": (event, liveEventData) => {  
        liveEventData.type = "Item picked up"  
        liveEventData.item = event.Value.RepositoryId  
        liveEventData.itemName = event.Value.ItemName  
    },  
    "ItemDropped": (event, liveEventData) => {  
        liveEventData.type = "Item dropped"  
        liveEventData.item = event.Value.RepositoryId  
        liveEventData.itemName = event.Value.ItemName  
    },  
    "ObjectiveCompleted": (event, liveEventData) => {  
        liveEventData.type = "Objective completed"  
        liveEventData.objectiveId = event.Value.Id  
        liveEventData.objectiveType = event.Value.Type  
    },  
    "SecuritySystemRecorder": (event, liveEventData) => {  
        liveEventData.type = "Security system event"  
        liveEventData.cameraEvent = event.Value.event  
    },  
    "AreaDiscovered": (event, liveEventData) => {  
        liveEventData.type = "Area discovered"  
        liveEventData.area = event.Value.RepositoryId  
    },  
    "Trespassing": (event, liveEventData) => {  
        liveEventData.type = "Trespassing"  
        liveEventData.isTrespassing = event.Value.IsTrespassing  
        liveEventData.roomId = event.Value.RoomId  
    },  
    "OpportunityEvents": (event, liveEventData) => {  
        liveEventData.type = "Opportunity event"  
        liveEventData.opportunity = event.Value.RepositoryId  
    },  
    "Unnoticed_Kill": (event, liveEventData) => {  
        liveEventData.type = "Unnoticed kill"  
        liveEventData.target = event.Value.RepositoryId  
        liveEventData.isTarget = event.Value.IsTarget  
    }  
}  
  
// Main plugin entry point - registers hooks with Peacock controller  
module.exports = (controller) => {  
    if (!config || !config.webhooks) {  
        console.log("No webhooks configured")  
        return  
    }  
  
    // Register login event hook - sends user login notification  
    controller.hooks.onUserLogin.tap("WebhookNotifier", (gameVersion, userId) => {  
        console.log("LOGIN EVENT:", userId)  
        const loginData = {  
            event: "login",  
            userId: userId,  
            gameVersion: gameVersion,  
            peacockVersion: PEACOCKVERSTRING,  
            timestamp: new Date().toISOString()  
        }  
        sendWebhook(config.webhooks.login, loginData)  
    })  
  
    // Register game events hook - processes all in-game events  
    controller.hooks.newEvent.tap("WebhookNotifier", (event, details, session) => {  
        console.log("EVENT:", event.Name)  
          
        // Handle contract start - initialize session data  
        if (event.Name === "ContractStart") {  
            const contract = controller.resolveContract(session.contractId, details.gameVersion)  
            if (contract) {  
                // Resolve location name using cached lookup  
                const locationName = getLocationNameCached(contract?.Metadata?.Location, details.gameVersion) || "unknown"  
                  
                session.location = locationName  
                session.locationId = contract?.Metadata?.Location || "unknown"  
                  
                // Send current session webhook with mission details  
                const sessionData = {  
                    event: "currentSession",  
                    gamemode: getGameModeAlias(contract?.Metadata?.Type),  
                    gamemodeRaw: contract?.Metadata?.Type || "unknown",  
                    location: session.location,  
                    locationId: session.locationId,  
                    contractId: session.contractId,  
                    userId: session.userId,  
                    timestamp: new Date().toISOString()  
                }  
                  
                sendWebhook(config.webhooks.currentSession, sessionData)  
            }  
        }  
          
        // Process live events only if session exists  
        if (!session) return  
          
        // Ensure location is resolved and cached for live events  
        if (!session.location || session.location === session.locationId) {  
            const contract = controller.resolveContract(session.contractId, details.gameVersion)  
            if (contract) {  
                session.location = getLocationNameCached(contract?.Metadata?.Location, details.gameVersion) || "unknown"  
            }  
        }  
          
        // Fast event handler lookup using Map for O(1) performance  
        const handler = eventHandlers[event.Name]  
        if (handler) {  
            const liveEventData = {  
                event: "liveEvent",  
                userId: session.userId,  
                contractId: session.contractId,  
                location: session.location || "unknown",  
                locationId: session.locationId || "unknown",  
                timestamp: new Date().toISOString()  
            }  
              
            // Process event with efficient handler  
            handler(event, liveEventData)  
              
            // Send webhook if event type is identified and enabled in config  
            if (liveEventData.type && isEventEnabled(liveEventData.type)) {  
                sendWebhook(config.webhooks.liveEvent, liveEventData)  
            }  
        }  
    })  
}
