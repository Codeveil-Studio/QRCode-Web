# How to Run the Relay Project

## Prerequisites
- **Docker Desktop** must be installed and running.

## Starting the Application
1. Open a terminal (PowerShell, Command Prompt, or VS Code terminal).
2. Navigate to the project directory:
   ```powershell
   cd D:\Freelancer_18_02_2026
   ```
3. Run the following command to start both Backend and Frontend in the background:
   ```powershell
   docker-compose up -d
   ```
4. Access the application:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

## Stopping the Application
To stop the services, run:
```powershell
docker-compose down
```

## Troubleshooting
- If you see "500 Internal Server Error", ensure the backend is running.
- If ports are in use, run `docker-compose down` to clear old containers.
- If Docker commands fail, ensure Docker Desktop is running.
