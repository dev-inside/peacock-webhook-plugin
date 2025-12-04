const { readFileSync, existsSync } = require("fs")  
const { join } = require("path")  
  
let config = null  
  
try {  
    const configPath = join(process.cwd(), "plugins", "pck-webhook-conf.json")  
    if (existsSync(configPath)) {  
        config = JSON.parse(readFileSync(configPath, "utf-8"))  
    }  
} catch (e) {  
    console.log("Config error:", e.message)  
}  
  
async function sendWebhook(url, data) {  
    if (!url) return  
    try {  
        await fetch(url, {  
            method: "POST",  
            headers: {  
                "Content-Type": "application/json",  
            },  
            body: JSON.stringify(data)  
        })  
    } catch (error) {  
        console.log("Webhook error:", error.message)  
    }  
}  
  
module.exports = (controller) => {  
    if (!config || !config.webhooks) {  
        console.log("No webhooks configured")  
        return  
    }  
  
    // Login hook  
    controller.hooks.onUserLogin.tap("WebhookNotifier", (gameVersion, userId) => {  
        console.log("LOGIN EVENT:", userId)  
        const loginData = {  
            event: "login",  
            userId: userId,  
            gameVersion: gameVersion,  
            timestamp: new Date().toISOString()  
        }  
        sendWebhook(config.webhooks.login, loginData)  
    })  
  
    // Game events hook  
    controller.hooks.newEvent.tap("WebhookNotifier", (event, details, session) => {  
        console.log("EVENT:", event.Name)  
          
        // Contract start - store location  
        if (event.Name === "ContractStart") {  
            const contract = controller.resolveContract(session.contractId, details.gameVersion)  
            if (contract) {  
                // Map location ID to readable name  
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
                    "LOCATION_NEWZEALAND": "New Zealand",  
                    "LOCATION_TRAPPED_WOLVERINE": "Carpathian Mountains",  
                    "LOCATION_ROCKY_DUGONG": "Ambrose Island"  
                }  
                  
                const locationName = locationMap[contract?.Metadata?.Location] || contract?.Metadata?.Location || "unknown"  
                  
                session.location = locationName  
                session.locationId = contract?.Metadata?.Location || "unknown"  
                  
                const sessionData = {  
                    event: "currentSession",  
                    gamemode: contract?.Metadata?.Type || "unknown",  
                    location: session.location,  
                    locationId: session.locationId,  
                    contractId: session.contractId,  
                    userId: session.userId,  
                    timestamp: new Date().toISOString()  
                }  
                  
                sendWebhook(config.webhooks.currentSession, sessionData)  
            }  
        }  
          
        // Live events - only if session exists  
        if (!session) return  
          
        let eventType = null  
        let liveEventData = {  
            event: "liveEvent",  
            userId: session.userId,  
            contractId: session.contractId,  
            location: session.location || "unknown",  
            locationId: session.locationId || "unknown",  
            timestamp: new Date().toISOString()  
        }  
          
        // Target eliminated  
        if (event.Name === "Kill" && event.Value?.IsTarget) {  
            eventType = "Target eliminated"  
            liveEventData.target = event.Value.RepositoryId  
        }  
          
        // Mission failed  
        if (event.Name === "ContractFailed") {  
            eventType = "Mission failed"  
        }  
          
        // Mission completed
        if (event.Name === "ContractEnd" && !event.Value?.missionFailed) {  
            eventType = "Mission completed"  
        }  
          
        // Disguise changed  
        if (event.Name === "Disguise") {  
            eventType = "Disguise changed"  
            liveEventData.disguise = event.Value  
        }  
          
        // Spotted  
        if (event.Name === "Spotted") {  
            eventType = "Spotted"  
            liveEventData.spottedBy = event.Value  
        }  
          
        // Body hidden  
        if (event.Name === "BodyHidden") {  
            eventType = "Body hidden"  
            liveEventData.bodyId = event.Value.RepositoryId  
        }  
          
        if (eventType) {  
            liveEventData.type = eventType  
            sendWebhook(config.webhooks.liveEvent, liveEventData)  
        }  
    })  
}