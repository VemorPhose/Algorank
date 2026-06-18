[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
![Project Status](https://img.shields.io/badge/status-in%20progress-yellow)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

# Algorank
A platform for hosting competitive coding contests. Built to provide a seamless experience for both participants and organizers.

## Features

### Implemented
- **User Authentication**: Secure login and registration using Firebase
- **Problem Solving**: Interactive code editor with syntax highlighting and multiple language support
- **Code Execution**: Secure sandboxed environment using Judge0 API for running and evaluating code
- **Problem Set**: Browse available problems with difficulty ratings and categories
- **User Statistics**: Track submission history and solved problems for each user
- **Contest Dashboard**: View active, upcoming, and past contests
- **Leaderboard**: Real-time rankings based on problem-solving performance

### To-Do List
- **Extended User Profiles**: Detailed statistics and achievements
- Rate limit users on submission endpoint
- Elo/Rating system
- Implement a monitoring system for all the working components
- Containerize and deploy on a cloud hosting service
- Add submissions tab to to view all past submissions, and if one is clicked show submitted code and test case statuses
- Also add submissions tab in particular problem
- Submissions in Python don't work for some reason, Java is untested

## Tech Stack
- **Front-End**: React.js with Vite, TailwindCSS
- **Back-End**: Node.js, Express.js
- **Authentication**: Firebase
- **Database**: PostgreSQL
- **Code Execution**: Judge0 API running in Docker

## Folder Structure
```
algorank/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── assets/            # Static assets and fonts
│   │   ├── components/        # Reusable React components
│   │   ├── pages/            # Page components
│   │   └── problems/         # Problem-related components
├── server/                    # Backend Node.js application
│   ├── config/               # Configuration files
│   ├── judge0-v1.13.0/       # Judge0 API configuration
│   ├── models/               # Database models
│   ├── routes/              # API routes
│   └── testcases/           # Problem test cases
└── tests/                    # Test suites for front and back end
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Algorank.git
   cd Algorank
   ```

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd client
   npm install

   # Install backend dependencies
   cd ../server
   npm install
   ```

3. Set up environment files:
   
   Create `firebase.js` in `client/src/`:
   ```javascript
   import { initializeApp, getApps, getApp } from "firebase/app";
   import { getAuth } from "firebase/auth";

   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.storage.app",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id",
     measurementId: "your-measurement-id"
   };

   const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
   export const auth = getAuth(app);
   ```

   Create `.env` in `server/`:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   ```

4. Start Judge0 API:
   ```bash
   cd server/judge0-v1.13.0
   docker-compose up -d
   ```

5. Start development servers:
   ```bash
   # Start backend server
   cd server
   npm run dev

   # In a new terminal, start frontend
   cd client
   npm run dev
   ```

6. Visit `http://localhost:5173` to access the application
