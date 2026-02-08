import app from "./app";
// import { envVars } from "./app/config/env";

const envVars = { PORT: 5000 };

const bootstrap = () => {
  try {
    app.listen(envVars.PORT, () => {
      console.log(`Server is running on http://localhost:${envVars.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

bootstrap();
