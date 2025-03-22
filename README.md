# Google Form AutoFiller

Google Form AutoFiller is a Node.js tool that automates the process of filling and submitting Google Forms. It extracts form metadata, generates predefined responses, and submits them.

## Features
- Extract form data (question structure) from Google Forms using their URL.
- Automatically fill form fields with pre-defined answers from a config file.
- Automatically parses `forms.gle` short links.
- Supports multiple question types:
  - Short answers
  - Long answers
  - Multiple-choice
  - Star Rating
  - Checkboxes
  - Dropdowns
  - Date
  - Time  
  *(Note: Other question types or answer validations may cause the form to fail.)*

## Installation

```bash
git clone https://github.com/BlaizerBrumo/Google-Form-AutoFiller.git
cd Google-Form-AutoFiller
npm i
```

Requires Node.js v18 or higher.

## How It Works

The bot automates the process of filling and submitting Google Forms using a combination of data extraction, request body generation, and HTTP requests. Here's a step-by-step explanation:

### 1. Extract Form Data
When you provide a Google Form URL, the bot:
- Fetches the HTML content using the `node-fetch`.
- Parses the form's structure with `jsdom` to extract:
  - **`FB_PUBLIC_LOAD_DATA`**:
    - A JavaScript object embedded in the HTML that contains metadata such as:
      - Question IDs and types (e.g., short answer, multiple-choice).
      - Options for predefined answers (e.g., multiple-choice, dropdowns).
  - **`fbzx` (Shuffle Seed)**:
    - A unique session identifier required for form submission.

### 2. Generate Request Body
Using the extracted metadata, the bot:
- Identifies each question's type and fills in appropriate responses from the configuration.
- Adds form-specific metadata such as `fbzx`, `fvv`, and `partialResponse`.

### 3. Submit Form
The bot sends the generated request body to the Google Form's submission endpoint (`/formResponse`) using an HTTP POST request.

---

## Configuration

The script's behavior can be customized through the `config.js` file:

### Debugging Mode
```js
"debug": {
    "sendDebugLogs": true, // Enable or disable debug logs
}
```

### Answer Configuration
Customize responses for each question type:
```js
"answers": {
    "sendSameRequestBody": false, // Reuse the same generated request body for each submission
    "emailAnswer": "form@example.com", // Answer for email question
    "urlAnswer": "https://example.com", // Answer for URL question
    0: "Example short answer", // Answer for question at index 0
    1: "Example long answer"   // Answer for question at index 1
}
```

---

Absolutely — here’s a clean template for documenting key variables used in the Google Form submission process, written in the same style as your `README`. You can fill in more details later if needed.

---


## Variable Documentation

### Question Type IDs

| ID  | Type                          | Description                                                  |
|-----|-------------------------------|--------------------------------------------------------------|
| `0` | Short Answer                  | Single-line text input.                                      |
| `1` | Long Answer (Paragraph)       | Multi-line text input.                                       |
| `2` | Multiple Choice               | Select one option from a list of choices.                    |
| `3` | Dropdown                      | Select one option from a dropdown menu.                      |
| `4` | Checkboxes                    | Select one or more options from a list.                      |
| `5` | Linear Scale                  | Select a value from a numerical scale (e.g., 1 to 5).        |
| `8` | Section Divider               | Non-input section break; typically used for multi-page forms.|
| `9` | Date                          | Date picker input. May include time if enabled.              |
| `10`| Time                          | Time picker input.                                           |
| `18`| Star Rating                   | Select a number of stars as a rating (e.g., 1 to 5 stars).   |


### Submission Metadata

| Variable        | Description                                                                 |
|----------------|-----------------------------------------------------------------------------|
| `fbzx`         | A unique identifier (shuffle seed) required for submitting the form. Extracted from the form’s HTML. |
| `fvv`          | Form version value. Usually set to `1`. Used internally by Google Forms to track form state/version. |
| `pageHistory`  | Tracks the navigation flow between form sections. Usually an array like `[0]`. |
| `entry.<id>`   | Key used in the request body to send an answer for a specific question. `<id>` corresponds to the internal question ID. |

_These values are used when building a valid request body for submitting to `/formResponse`._


## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license.

You may:
- Use, modify, and share this project for non-commercial purposes
- Fork and adapt it, as long as proper credit is given

You may not:
- Use this project or any part of it for commercial purposes without permission

For full terms, see: https://creativecommons.org/licenses/by-nc/4.0/

---

## Author

Developed by Blazer
GitHub: https://github.com/BlaizerBrumo
