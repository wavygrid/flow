# AI Workflow Generator - Project Guide

<!-- This file serves as a guide for the Cursor AI assistant. @file PROJECT_GUIDE.md -->

## 1. Project Overview

This project is an interactive web application that acts as a "lead magnet" for an AI automation agency. A user describes their business workflow via a chat interface. A backend serverless function uses the Google AI (Gemini) model to analyze the text and generates a visual workflow diagram in real-time. This demonstrates the feasibility of AI integration for the potential client.

## 2. Core Technologies

- **Framework:** Next.js
- **Diagramming:** React Flow
- **Backend:** Netlify Serverless Functions
- **AI Model:** Google AI (Gemini)

## 3. File Structure
├── components/
│ ├── ChatInterface.js
│ └── WorkflowDiagram.js
├── netlify/
│ └── functions/
│ └── generate-workflow.js
├── pages/
│ └── index.js
├── public/
├── styles/
│ └── globals.css
├── netlify.toml
└── PROJECT_GUIDE.md

## 4. Component & Function Breakdown

### `pages/index.js` (Main App Logic)

- **Role:** Main container and state management.
- **State:**
  - `nodes`: Array for React Flow nodes.
  - `edges`: Array for React Flow edges.
  - `conversation`: Array of `{ sender: 'user' | 'ai', text: '...' }` objects.
  - `isLoading`: Boolean for API call status.
- **Functions:**
  - `handleSendMessage(message)`: Triggers the API call to the backend.

### `components/WorkflowDiagram.js`

- **Role:** Renders the visual workflow.
- **Props:**
  - `nodes`: The nodes to render.
  - `edges`: The edges connecting the nodes.

### `components/ChatInterface.js`

- **Role:** Handles user interaction.
- **Props:**
  - `conversation`: The chat history to display.
  - `onSendMessage`: Callback function to be executed when the user submits a message.
  - `isLoading`: To disable the input/button while the AI is thinking.

### `netlify/functions/generate-workflow.js` (The AI Brain)

- **Trigger:** POST request to `/.netlify/functions/generate-workflow`.
- **Input:** JSON body with `{ userPrompt: "..." }`.
- **Processing:**
  1.  Retrieves the `userPrompt`.
  2.  Constructs a master prompt for the Google AI model.
  3.  **The AI is instructed to return a JSON string with keys: `nodes`, `edges`, `followUpQuestion`.**
      - `nodes` and `edges` must be in valid React Flow format.
      - `followUpQuestion` is a string for the AI to continue the conversation.
  4.  Calls the Google AI API using the key from `process.env.GOOGLE_AI_API_KEY`.
  5.  Parses the AI's response.
- **Output:** A JSON object ` { nodes, edges, followUpQuestion }` sent back to the frontend.

## 5. Data Flow

1.  **User:** Enters business process description into `ChatInterface`.
2.  **Frontend (`index.js`):** Calls `handleSendMessage`.
3.  **API Call:** `axios.post('/.netlify/functions/generate-workflow', { userPrompt })`.
4.  **Backend (`generate-workflow.js`):** Receives prompt, calls Google AI.
5.  **Google AI:** Processes the master prompt and returns structured JSON text.
6.  **Backend:** Parses the JSON and returns it in the response body.
7.  **Frontend:** Receives the data, updates `nodes`, `edges`, and `conversation` state.
8.  **UI Update:** `WorkflowDiagram` and `ChatInterface` re-render with the new data.

## 6. Deployment

- The site will be hosted on Netlify.
- The `GOOGLE_AI_API_KEY` must be set as an environment variable in the Netlify site settings.