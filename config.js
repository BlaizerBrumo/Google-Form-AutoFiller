module.exports = {
    /*
    Question Types:
    0 = Short Answer
    1 = Long Answer (paragraph)
    2 = Multiple Choice (Single selection)
    3 = Dropdown
    4 = Checkboxes (Multiple selection)
    5 = Linear Scale
    8 = Section Divider
    9 = Date (sometimes includes time)
    10 = Time
    18 = Star Rating
    */
    "debug": {
        "sendDebugLogs": true
    },
    "answers": {
        "sendSameRequestBody": false, // If true, reuses the same request body
        "emailAnswer": "form@example.com",
        "urlAnswer": "https://example.com",
        0: "Sample short answer",
        1: "This is a sample long answer."
    }
}
