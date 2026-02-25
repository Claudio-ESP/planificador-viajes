# Travel Planner Frontend

## Overview
The Travel Planner is a minimalist web application designed to help users plan their trips by providing a simple interface to input travel details and receive personalized travel recommendations. The application allows users to specify their origin, destination, travel dates, budget, style preferences, and interests.

## Project Structure
```
travel-planner-frontend
├── index.html       # The main HTML file containing the structure of the web page
├── styles.css       # The CSS file for styling the web page
├── app.js           # The JavaScript file for handling logic and API requests
└── README.md        # This documentation file
```

## Features
- User-friendly form for inputting travel details
- Validation for required fields
- Loading and error messages during data submission
- Display of travel recommendations in visually appealing cards
- Clickable links for flights, hotels, and itinerary details

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, etc.)
- Internet connection for API requests

### Installation
1. Clone the repository or download the project files.
2. Open the `index.html` file in your web browser.

### Usage
1. Fill out the form with the required travel information:
   - Origin
   - Destination
   - Departure Date
   - Return Date (optional)
   - Maximum Budget
   - Style (select from cheap, balanced, comfortable)
   - Preferences (select any combination of nature, food, museums, party)
   - Center km (select from 1, 2, 5)
2. Click the submit button to send your travel details.
3. Wait for the loading message to disappear, and view the results displayed in cards.

### API
The application sends a POST request to the following URL:
```
https://divisual-project-n8n.gsgdq4.easypanel.host/webhook-test/planificador-viajes
```
The request payload is formatted as follows:
```json
{
  "origin": "string",
  "destination": "string",
  "departureDate": "string",
  "returnDate": "string",
  "maximumBudget": "number",
  "style": "string",
  "preferences": ["string"],
  "centerKm": "number"
}
```

### Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

### License
This project is open-source and available under the MIT License.