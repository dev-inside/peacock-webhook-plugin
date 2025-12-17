# PWP - Peacock Webhook Plugin

The **Peacock Webhook Plugin (PWP)** sends data from the Peacock server to one of three predefined webhooks. This data can be used for various purposes such as notifications, monitoring, or automation. 

I originally developed the plugin to play around with **Home Assistant**. Who wouldn't want to adjust their room lighting to the warm tones of _Sapienza_ or the _neon colors_ of _Chonqing_ while playing the level? Or when a mission fails, to bathe the room in a crimson red? Yes, I know, hardly anyone will actually need this plugin, but if you tap into its potential, you can have a lot of fun with it! 🎮✨

---

## How does it work?

In the `pck-webhook-conf.json`, you can register three webhooks for three types of events. Once Peacock registers any of the following events, the event is sent to the corresponding webhook. The reason for using three webhooks is the persistence of the data. The first (login) is triggered only at game startup, the second (currentSession) at the start of a contract/mission, and the third (liveEvent) during events as you play Hitman.

### 01. login-event

As the name suggests, the login webhook is triggered only during login, typically just once when starting **Hitman**, sending the following payload as a JSON body:

```json
{  
    "event": "login",  
    "userId": "1273f7aa-e53b-4446-b940-0c32430dec0c",  
    "gameVersion": "h3",
    "peacockVersion": "8.6.0",
    "timestamp": "2025-12-04T10:30:00.000Z"  
}
```

### Relevant Data:
- **event**: Event name
- **gameVersion**: The game version, e.g., H3 for Hitman 3/WOA
- **peacockVersion**: currently installed Peacock version

### 02. currentSession-event

This event is triggered when starting a contract. It contains data about the game mode or the map currently being played.

```json
{  
    "event": "currentSession",  
    "gamemode": "Mission",
    "gamemodeRaw": "mission",
    "location": "Sapienza",  
    "locationId": "LOCATION_COASTALTOWN",  
    "contractId": "c4142c69-4e34-4b68-8ea2-65c29e4a7d8a",  
    "userId": "1273f7aa-e53b-4446-b940-0c32430dec0c",  
    "timestamp": "2025-12-04T10:31:15.000Z"  
}
```

### Relevant Data:
- **event**: Event name
- **gamemode**: Indicates the type, such as "Mission" or "Freelancer", etc.
- **location**: Displays the name of the map location as a readable string like _Sapienza_
- **locationId**: The internal names in Peacock (and presumably in the game itself), e.g., `LOCATION_COASTALTOWN` for _Sapienza_

### 03. liveEvent

The live event is triggered on the following occurrences:
- Target eliminated
- Mission completed
- Mission failed
- Disguise Changed
- Spotted
- Body hidden

The payload looks like this:

```json
{  
    "event": "liveEvent",  
    "userId": "1273f7aa-e53b-4446-b940-0c32430dec0c",  
    "contractId": "c4142c69-4e34-4b68-8ea2-65c29e4a7d8a",  
    "location": "Sapienza",  
    "locationId": "LOCATION_COASTALTOWN",  
    "timestamp": "2025-12-04T10:40:45.000Z",  
    "type": "Disguise blown",
    "disguise": "a790b779-c710-49f8-b1dc-c57afef0d189"
}
```

### Relevant Data:
- **event**: Event name
- **location**: Taken from the `currentSession`
- **type**: The triggered event

---

## Configuration

Open the `pck-webhook-conf.json` and add your three different webhooks. Webhooks generally do not require an access token, but ensure that the webhook can handle POST requests.

`liveEventConfig` allows you to enable/disable in-game-events such as `Target eliminated` or `Tresspassing`. 

```json
{  
    "webhooks": {  
        "login": "https://your-webhook-url/login",  
        "currentSession": "https://your-webhook-url/session",  
        "liveEvent": "https://your-webhook-url/live"  
    },
    "liveEventConfig": {
        "Target eliminated": true,
        "Non-target eliminated": true,
        "NPC pacified": false,
        "Mission failed": true,
        "Mission completed": true,
        "Disguise changed": false,
        "Disguise blown": true,
        "Spotted": false,
        "Witnesses": false,
        "Body hidden": false,
        "Body found": false,
        "Item picked up": false,
        "Item dropped": false,
        "Objective completed": true,
        "Security system event": false,
        "Area discovered": false,
        "Trespassing": false,
        "Opportunity event": false,
        "Unnoticed kill": true
    }
}
```

---

## Installation

The plugin consists of two files in the `/peacock-plugin`-directory:
- **pck-webhook.plugin.js** - The plugin file
- **pck-webhook-conf.json** - The configuration file where you can define the webhooks

Installation is as simple as always with Peacock: just copy both files (without the folder!) directly into the `/plugin-directory` and remember to adjust the webhooks beforehand. Upon restarting the **Peacock server**, the plugin should be detected and ready for use.

---

## And now what?

The world is your oyster! You can use it for tracking events in a more readable way than the Peacock log provides or for automations in _n8n_, _Home Assistant_, or anything else. Have fun with it! 🎉