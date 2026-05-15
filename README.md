# RetinopathyAI 

Welcome to **RetinopathyAI**! This project provides an AI-powered diagnostic interface for analyzing retinal scans and detecting Diabetic Retinopathy.

This guide is written for beginners to help you set up and run the system from scratch, even if you don't have extensive programming experience.

---

##  Prerequisites

Before you start, make sure you have the following installed on your computer:

1. **Python (3.9 or higher)**
   - Download and install from [python.org](https://www.python.org/downloads/). 
   - *Important:* During installation on Windows, make sure to check the box that says **"Add Python to PATH"**.

2. **uv (Python Package Manager)**
   - We use `uv` to manage Python packages because it's extremely fast.
   - You can install it by opening your terminal/command prompt and running:
     ```bash
     pip install uv
     ```

3. **Node.js & npm**
   - Download and install the LTS version from [nodejs.org](https://nodejs.org/). This will install both Node.js and `npm` (Node Package Manager).

---

##  Step 1: Initial Setup

Once you have the prerequisites installed, open your terminal (Command Prompt, PowerShell, or VS Code terminal) and follow these steps.

**1. Open the project folder**  
Navigate to the root directory of the project where this `README.md` file is located. If you're using VS Code, you can just open the folder `RetinopathyAI`.

**2. Install all dependencies**  
Run the following command in the root folder. This will automatically install all the necessary packages for both the frontend (React) and the backend (FastAPI).

```bash
npm run install:all
```
*(This might take a minute or two to download everything.)*

---

##  Step 2: Configuration (Firebase & Environment Variables)

The backend requires a connection to Firebase for authentication and database management.

1. Ensure you have your Firebase admin credentials JSON file (e.g., `new-01-96a1d-firebase-adminsdk-...json`) located inside the `backend/` directory.
2. In the `backend/` directory, ensure there is a `.env` file that points to your Firebase credentials. It should look something like this:
   ```env
   FIREBASE_CREDENTIALS_PATH=new-01-96a1d-firebase-adminsdk-fbsvc-a0b9723de5.json
   ```

*(Note: If you have already been provided with the working `.env` and `json` files in the repository, you can skip this step!)*

---

##  Step 3: Running the Application

We have made it incredibly easy to start the entire application (both the frontend website and the backend AI server) with a single command!

**1. Start the application**  
In the root directory of the project, run:

```bash
npm start
```

**What happens next?**
- You will see logs for both `[FRONTEND]` (in magenta) and `[BACKEND]` (in cyan) starting up simultaneously.
- The `uv` tool will automatically handle the Python environment and start the backend API on port `8080`.
- Vite will start the frontend development server.

**2. Open your browser**  
Once you see a message indicating the server is running (usually saying `Local: http://localhost:3000/` or similar), open your web browser and go to:
 **[http://localhost:3000](http://localhost:3000)**

---

##  How to Use the System

1. **Log In**: If you are redirected to the login page, use your doctor credentials to log in.
2. **Dashboard**: Here you can view your total patients, scans for today, and recent diagnoses.
3. **Patients**: Navigate to the "Patients" tab on the left sidebar to add new patients or manage existing records.
4. **Upload Scan**: Click "New Scan" on the Dashboard or go to the "Upload Scan" tab. Select a patient and upload a retinal image to let the AI analyze it.
5. **View Reports**: Go to "Scan History" to view all past scans. Click "View Report" to see the Grad-CAM heatmap, confidence score, and AI-generated clinical recommendations.
6. **Settings**: Click your profile picture in the top right to access Settings, where you can change the app's color theme, notifications, and language.

---

##  Stopping the Application

To stop the servers, go back to the terminal where you ran `npm start` and press:
`Ctrl + C` (You may need to press it twice to force close all processes).

---

##  Troubleshooting

- **"uv is not recognized as an internal or external command"**
  - Make sure you ran `pip install uv` and restarted your terminal.
- **Port Conflict (WinError 10013)**
  - If it says port `8080` or `3000` is already in use, you likely have another instance running. Close other terminal windows, or restart your computer if you can't find the background process.
- **Backend failing to start because of Firebase**
  - Verify that your `.env` file exists in the `backend/` folder and the path to the `.json` credential file is correct.
