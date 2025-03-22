const { submitForm, extractFormData, generateRequestBody, debugLog } = require("./assets");
const config = require("./config");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    // Ask the user to input a Google Form URL
    readline.question("Enter Google Form URL: ", async (formUrl) => {
        readline.close();

        // If no URL is entered, use the default (if enabled in config)
        if (!formUrl) {
            if (config.debug.useDefaultURL) {
                formUrl = config.debug.defaultFormUrl;
                debugLog("No form URL entered, using default.");
            } else {
                console.log("No form URL provided. Exiting.");
                process.exit();
            }
        }

        try {
            // Extract form data (metadata like question types, IDs, etc.)
            const formData = await extractFormData(formUrl);

            // Generate a valid request body using the form structure and config answers
            const requestBody = generateRequestBody(formData.fbzx, formData.fbPublicLoadData);

            // Submit the form using a POST request
            const response = await submitForm(formUrl, formData.fbzx, requestBody);

            // Check if submission was successful
            if (!response || response.status !== 200) {
                console.error("Error submitting form:", response?.statusText || "Unknown error");
                return;
            }

            // Success message
            console.log("Form submitted successfully.");
            console.log("Response:", response.status, response.statusText);
        } catch (err) {
            // Catch and log any errors during the process
            console.error("An error occurred:", err.message);
        }
    });
}

// Start the script
main();
