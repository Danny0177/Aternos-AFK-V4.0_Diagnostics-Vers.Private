// ==================================================
// diagnostics.js — Correct CONFIGURATION timing (Option B)
// ==================================================

module.exports = {
    log(msg) {
        console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
    },

    section(title) {
        console.log("==================================================");
        this.log(title);
        console.log("==================================================");
    },

    banner(title) {
        console.log("==================================================");
        this.log(title);
        console.log("==================================================");
    },

    attachBot(bot) {
        bot.on("connect", () => this.log("[Stage] TCP connected"));
        bot.on("inject_allowed", () => this.log("[Stage] Protocol injected"));
        bot.on("login", () => this.log("[Stage] Login packet received"));
        bot.on("game", () => this.log("[Stage] Game state received"));
        bot.on("respawn", () => this.log("[Stage] Respawn event fired"));

        bot.on("resourcePack", (url, hash) => {
            this.section("Resource Pack");
            this.log("Request received");
            this.log("URL: " + url);
            this.log("Hash: " + hash);
            this.log("NOTE: No accept/reject sent (safe mode for 1.20+)");
        });

        const client = bot._client;
        if (!client) return;

        let gotRegistry = false;
        let gotFeatureFlags = false;
        let gotDataPacks = false;
        let configFinished = false;

        client.on("packet", (data, meta) => {
            const important = [
                "login",
                "success",
                "join_game",
                "respawn",
                "disconnect",
                "resource_pack_send",
                "resource_pack",
                "custom_payload",
                "plugin_message",
                "registry_data",
                "feature_flags",
                "data_packs",
                "finish_configuration"
            ];

            if (important.includes(meta.name)) {
                this.log(`[Packet] ${meta.name}`);
            }

            if (meta.name === "registry_data") {
                gotRegistry = true;
                this.log("[Config] registry_data received");
            }

            if (meta.name === "feature_flags") {
                gotFeatureFlags = true;
                this.log("[Config] feature_flags received");
            }

            if (meta.name === "data_packs") {
                gotDataPacks = true;
                this.log("[Config] data_packs received");
            }

            // Only send finish_configuration when ALL config packets are done
            if (!configFinished && gotRegistry && gotFeatureFlags && gotDataPacks) {
                this.section("Configuration Complete");
                this.log("All configuration packets received");
                this.log("Sending finish_configuration (correct timing)");

                try {
                    client.write("finish_configuration", {});
                    configFinished = true;
                    this.log("[Config] finish_configuration sent");
                } catch (e) {
                    this.log("[Config] Failed to send finish_configuration: " + e.message);
                }
            }
        });

        client.on("success", () => {
            this.log("[Protocol] Login success packet received");
        });

        client.on("disconnect", packet => {
            this.section("Disconnect Packet");
            console.log(packet);
        });

        if (client.socket) {
            client.socket.on("timeout", () => this.log("[Socket] Timeout"));
            client.socket.on("close", hadError => this.log(`[Socket] Closed (hadError=${hadError})`));
            client.socket.on("error", err => this.log("[Socket] Error: " + err.message));
        }
    }
};
