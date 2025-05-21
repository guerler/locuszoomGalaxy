import { createApp, h } from "vue";
import { GalaxyApi } from "galaxy-charts";
import App from "./App.vue";
import "./style.css";

async function main() {
    /**
     * Identify the target container
     */
    const scriptUrl = new URL(import.meta.url);
    const container = scriptUrl.searchParams.get("container") || "app";

    /**
     * Development Environment Setup
     *
     * This section is specifically for configuring the application
     * during development. You can modify the settings below to
     * tailor your development environment, such as simulating data
     * or working with mock services.
     */
    if (import.meta.env.DEV) {
        // Dynamically import the XML parser utility, used for parsing visualization configurations
        const { parseXML } = await import("galaxy-charts-xml-parser");

        // Construct the incoming data object with mock configuration and data
        const dataIncoming = {
            visualization_config: {
                // Placeholder for dataset ID
                dataset_id: "b620c45fba703209", // id of primary_dataset.bgzip
                // Placeholder for additional visualization settings
                settings: {
                    tabix: { id: "abd164196b68b912" }, // id of secondary_dataset.tbi
                    chromosome: 1,
                    start: 1000,
                    end: 1000000,
                },
            },
            // Parse and load the visualization XML configuration
            visualization_plugin: await parseXML("locuszoom.xml"),
        };

        // Find the root app element and attach the mock data as a JSON string to its data-incoming attribute
        const appElement = document.getElementById(container);
        appElement.dataset.incoming = JSON.stringify(dataIncoming);
    }

    /**
     * Mount the Vue Application
     *
     * This initializes the Vue app, rendering the root component
     * and passing in any necessary props such as credentials.
     */
    createApp({
        render: () => h(App, { container: container, credentials: process.env.credentials }),
    }).mount(`#${container}`);
}

// Start the application
main();
