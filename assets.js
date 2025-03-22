"use strict";

const fetch = require("node-fetch");
const jsdom = require("jsdom");
const config = require("./config");
const { JSDOM } = jsdom;


function debugLog(...args){
    if(!config.debug.sendDebugLogs) return;
    console.log("[DEBUG]",...args);
}

/**
 * Extract form data from a Google Form HTML page.
 * @param {string} formUrl - The URL of the Google Form.
 * @returns {Promise<{fbzx: string, fbPublicLoadData: object}>} - JSON containing fbzx and fbPublicLoadData.
 */
async function extractFormData(formUrl) {
    try {
        const response = await fetch(formUrl);
        const html = await response.text();

        const dom = new JSDOM(html);
        const document = dom.window.document;

        const scripts = Array.from(document.querySelectorAll("script"));
        let fbPublicLoadData = null;
        let fbzx = null;

        for (let script of scripts) {
            if (script.textContent.includes("FB_PUBLIC_LOAD_DATA_")) {
                fbPublicLoadData = JSON.parse(
                    script.textContent.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);/)[1]
                );
                break;
            }
        }

        const formElement = document.querySelector("form[data-shuffle-seed]");
        fbzx = formElement ? formElement.getAttribute("data-shuffle-seed") : null;

        if (!fbPublicLoadData) {
            throw new Error("Failed to extract FB_PUBLIC_LOAD_DATA");
        }
        if (!fbzx) {
            throw new Error("Failed to extract fbzx (data-shuffle-seed)");
        }

        return { fbzx, fbPublicLoadData };
    } catch (error) {
        console.error("Error extracting form data:", error);
        throw error;
    }
}

/**
 * Generate a request body for the form submission.
 * @param {object} fbPublicLoadData - The extracted form data.
 * @returns {string} - The formatted request body.
 */
function generateRequestBody(fbzx,fbPublicLoadData) {
    const pageHistory = [0];
    let sectionCounter = 0;
    const formBody = [];
    const questions = fbPublicLoadData[1][1];
    const fillOutWithEmail = fbPublicLoadData[1][10][6] === 3;


    for (let question of questions) {

        const questionType = question[3];
        if([6,11].includes(questionType)) {
            debugLog(`[Skipping Question] ID:`, question[0], questionType);
            continue;
        }
        const entryId = question[4]?.[0]?.[0];
        if(!entryId && questionType !== 8){
            console.error(`Entry ID missing! (Question Type=${questionType})`);
            console.error(`Error Filling Out Form: Most likely protected by Google account verification.`)
            process.exit();
        }
        const questionValidation = question[4]?.[0]?.[4]?.[0] ?? null;
        


        switch (questionType) {
            case 0: // Short answer
            case 1: // Long answer (paragraph)
                debugLog("Question Validation Info:", questionValidation);
                const stringAnswer = generateStringResponse(questionType);
                if(questionValidation){
                    const validationType = questionValidation[0];
                    /*
                    Validation Types
                    1 = Number
                    2 = Text
                    6 = Length
                    4 = Regular Expression (RegExp)
                    */
                    const validationSubType = questionValidation[1];
                    const validationQuery = questionValidation[2]?.[0] ?? null;

                    switch(validationType){
                        case 1: //Number
                            const numberValidationQuery = parseInt(validationQuery ?? 1);
                            switch(validationSubType){
                                case 1: //answer must be greater than query
                                case 2: //answer must be greater than or equal to query
                                    formBody.push(`entry.${entryId}=${encodeURIComponent((numberValidationQuery+1).toString())}`);
                                    debugLog(`Filled out string entry with a number (${numberValidationQuery+1})`);
                                    break;
                                case 3: //answer must be less than query
                                case 4: //answer must be less than or equal to query
                                case 8: //answer not between 2 queries (exclusive)
                                    formBody.push(`entry.${entryId}=${encodeURIComponent((numberValidationQuery - 1).toString())}`);
                                    debugLog(`Filled out string entry with a number (${numberValidationQuery - 1})`);
                                    break;
                                case 5: //answer must equal the query
                                case 7: //answer between 2 queries (inclusive)
                                    formBody.push(`entry.${entryId}=${encodeURIComponent((numberValidationQuery).toString())}`);
                                    debugLog(`Filled out string entry with a number (${numberValidationQuery})`);
                                    break;
                                case 6: //answer must not equal query
                                    const randomAnswer = numberValidationQuery + ~~(Math.random() * 50);
                                    formBody.push(`entry.${entryId}=${encodeURIComponent((randomAnswer).toString())}`);
                                    debugLog(`Filled out string entry with a number (${randomAnswer})`);
                                    break;
                                case 9: //answer must be a number
                                case 10: //answer must be a whole number
                                    formBody.push(`entry.${entryId}=${encodeURIComponent((~~(Math.random() * 50)).toString())}`);
                                    debugLog(`Filled out string entry with a random number`);
                                    break
                                default:
                                    console.error(`No handling for Number question validation! (validationType=${validationType})`);
                                    break;
                            }
                            break;
                        case 2: //Text
                            switch(validationSubType){
                                case 100: //answer must contain this
                                    formBody.push(`entry.${entryId}=${encodeURIComponent(`${validationQuery} || ${stringAnswer}`)}`);
                                    debugLog(`Filled out string entry with a modified string (id=${validationType}.${validationSubType})(type=${questionType})`);
                                    break;
                                case 101: //answer must not contain this
                                    formBody.push(`entry.${entryId}=${encodeURIComponent(stringAnswer.replaceAll(validationQuery,""))}`);
                                    debugLog(`Filled out string entry with a modified string (id=${validationType}.${validationSubType})(type=${questionType})`);
                                    break;
                                case 102: //answer must be an email
                                    formBody.push(`entry.${entryId}=${encodeURIComponent(config.answers.emailAnswer)}`);
                                    debugLog(`Filled out string entry with an email(type=${questionType})`);
                                    break;
                                case 103: //answer must be a URL
                                    formBody.push(`entry.${entryId}=${encodeURIComponent(config.answers.urlAnswer)}`);
                                    debugLog(`Filled out string entry with a URL(type=${questionType})`);
                                    break;
                            }
                            break;
                        case 6: //Length
                            const lengthValidationQuery = parseInt(validationQuery ?? 1);    
                            switch (validationSubType) {
                                case 202: //maximum of query characters allowed 
                                    formBody.push(`entry.${entryId}=${encodeURIComponent(stringAnswer.substring(0,lengthValidationQuery))}`);
                                    debugLog(`Filled out string entry with a shortened answer(type=${questionType})`);
                                    break;
                                case 203: //minmum of query characters allowed
                                    const lengthDiff = stringAnswer.length - lengthValidationQuery;
                                    const extraChars = (lengthDiff > 0) ? generateRandomString(lengthDiff) : "";
                                    formBody.push(`entry.${entryId}=${encodeURIComponent(`${stringAnswer} | ${extraChars}`)}`);
                                    debugLog(`Filled out string entry with a random string at the end to match length(type=${questionType})`);
                                    break;
                            }
                            break;
                        case 4: //RegExp
                            console.error(`No handling for RegExp question validation!`);
                            break;
                        default:
                            console.error(`Unknown validation type: ${validationType}`);
                            break;
                    }

                    break;
                    //console.error(`No handling for question validation. IDs: ${id1},${id2}`);
                }
                formBody.push(`entry.${entryId}=${encodeURIComponent(stringAnswer)}`);
                debugLog(`Filled out string entry (type=${questionType})`);
                break;
            case 18: //Star rating
            case 3: // Dropdown
            case 5: //Linear scale
            case 2: // Multiple choice (Single selection)
                const choiceOptions = question[4][0][1];
                const randomChoice = ~~(Math.random() * choiceOptions.length);
                const choice = choiceOptions[randomChoice][0];

                debugLog(`Selected random multiple choice answer[type=${questionType}]: ${choice}`);
                formBody.push(`entry.${entryId}=${encodeURIComponent(choice)}`);
                break;
            case 4: // Checkboxes (Multiple selection)
                const choices = question[4][0][1];
                let selectedChoiceAmt = 0;
                debugLog("Question Validation Info:", questionValidation);
                
                if (questionValidation) {
                    const validationSubType = questionValidation[1];
                    const validationQuery = questionValidation[2]?.[0] ?? null;
                    const numberValidationQuery = parseInt(validationQuery);

                    switch(validationSubType){
                        case 204: //Select exact amount of checkboxes
                        case 200: //Select at least query checkboxes
                            for (let i = 0; i < choices.length; i++) {
                                if (selectedChoiceAmt < numberValidationQuery) {
                                    selectedChoiceAmt++;
                                    debugLog(`Selected checkbox option (${i+1}/${choices.length})(t=${selectedChoiceAmt})`);
                                    selectCheckboxAnswer(formBody, entryId, question, i,choices);
                                }
                            }
                        break;
                        case 201: //Select at most query checkboxes
                            for (let i = 0; i < choices.length; i++) {
                                if ((Math.random() > 0.5) || ((selectedChoiceAmt < numberValidationQuery) && (i === choices.length - 1))) {
                                    selectedChoiceAmt++;
                                    debugLog(`Selected checkbox option (${i+1}/${choices.length})(t=${selectedChoiceAmt})`);
                                    selectCheckboxAnswer(formBody, entryId, question, i, choices);
                                }
                            }
                        break;
                    }
                    break;
                    //console.error(`No handling for question validation. IDs: ${id1},${id2}`);
                }

                for (let i = 0; i < choices.length; i++) {
                    if ((Math.random() > 0.5) || ((selectedChoiceAmt === 0) &&  (i === choices.length -1)) ) {
                        selectedChoiceAmt++;
                        debugLog(`Selected checkbox option (${i + 1}/${choices.length})(t=${selectedChoiceAmt})`);
                        selectCheckboxAnswer(formBody, entryId, question, i, choices);
                    }
                }
                break;
            case 8: //Section Divider
                pageHistory.push(++sectionCounter);
                break;
            case 9: // Date
                const needsTime = question[4][0][7][0] === 1;

                if (needsTime) {
                    const randomHour = ~~(Math.random() * 25);
                    const randomMinute = ~~(Math.random() * 60);

                    formBody.push(`entry.${entryId}_hour=${encodeURIComponent(randomHour)}`);
                    formBody.push(`entry.${entryId}_minute=${encodeURIComponent(randomMinute)}`);

                    debugLog(`Generated a random time: ${randomHour} hour(s), ${randomMinute} minute(s) (type=${questionType})`);
                }

                const randomYear = ~~(Math.random() * 10000);
                const randomMonth = ~~(Math.random() * 12) + 1;
                const randomDay = randomMonth === 2 ? ~~(Math.random() * 28) + 1  : ~~(Math.random() * 30) + 1;

                formBody.push(`entry.${entryId}_year=${encodeURIComponent(randomYear)}`);
                formBody.push(`entry.${entryId}_month=${encodeURIComponent(randomMonth)}`);
                formBody.push(`entry.${entryId}_day=${encodeURIComponent(randomDay)}`);

                debugLog(`Generated a random date: Year ${randomYear}, Month ${randomMonth}, Day ${randomDay}`);
                break;
            case 10: //Time
                const randomHour = ~~(Math.random() * 25);
                const randomMinute = ~~(Math.random() * 60);

                formBody.push(`entry.${entryId}_hour=${encodeURIComponent(randomHour)}`);
                formBody.push(`entry.${entryId}_minute=${encodeURIComponent(randomMinute)}`);

                debugLog(`Generated a random time: ${randomHour} hour(s), ${randomMinute} minute(s) (type=${questionType})`);
                break;
            default:
                console.warn(`Unsupported question type: ${questionType}`);
                process.exit();
        }
    }

    
    
    //this sees if the form is set to collect email addresses and adds the needed data
    if (fillOutWithEmail) formBody.push(`emailAddress=${encodeURIComponent(config.answers.emailAnswer)}`);
    
    formBody.push(`fvv=1`);
    formBody.push(`partialResponse=%5Bnull%2Cnull%2C%22${encodeURIComponent(fbzx)}%22%5D`);
    formBody.push(`pageHistory=${encodeURIComponent(pageHistory.join(","))}`);
    formBody.push(`fbzx=${encodeURIComponent(fbzx)}`);
    formBody.push(`submissionTimestamp=${Date.now()}`);
    

    return formBody.join("&");
}

/**
 * Selects a checkbox answer and adds it to the form body.
 * @param {Array} formBody - The form body array.
 * @param {number} entryId - The entry ID of the question.
 * @param {Array} question - The question array.
 * @param {number} iteration - The current iteration index.
 * @param {Array} choices - The choices array for the checkbox question.
 * @returns {void}
 */
function selectCheckboxAnswer(formBody, entryId, question, iteration, choices){
    const isOtherOption = question[4][0][1][iteration][4] === 1;
    if(isOtherOption){
        const stringAnswer = generateStringResponse(0);
        formBody.push(`entry.${entryId}.other_option_response=${encodeURIComponent(stringAnswer)}`);
        formBody.push(`entry.${entryId}=${encodeURIComponent("__other_option__")}`);
        debugLog(`Selected checkbox OTHER option (${iteration + 1}/${choices.length})`);
    }
    else formBody.push(`entry.${entryId}=${encodeURIComponent(choices[iteration][0])}`);
}

/**
 * Returns a predefined response for a given question type.
 * 
 * @param {number} questionType - The question type, typically 0 (short answer) or 1 (long answer)
 * @returns {string} - The predefined response from config
 */
function generateStringResponse(questionType) {
    if (![0, 1].includes(questionType)) questionType = 0;
    return config.answers[questionType] || "";
}


/**
 * Submit the form using the provided data.
 * @param {string} formUrl - The URL of the Google Form. Should point to the /viewform endpoint.
 * @param {string} fbzx - The session-specific fbzx value extracted from the form.
 * @param {string} requestBody - The formatted request body containing form entries and metadata.
 * @returns {Promise<Response>} - The fetch response.
 */
async function submitForm(formUrl, fbzx, requestBody) {
    try {
        const submitResponse = await fetch(formUrl.replace("/viewform", "/formResponse"), {
            credentials: "include",
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
                "Content-Type": "application/x-www-form-urlencoded",
                "Sec-GPC": "1",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-User": "?1",
                "Priority": "u=0, i"
            },
            referrer: `${formUrl}?fbzx=${fbzx}`,
            method: "POST",
            mode: "cors",
            body: requestBody
        });

        return submitResponse;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    extractFormData,
    generateRequestBody,
    submitForm,
    generateBogusSentence,
    debugLog
};
