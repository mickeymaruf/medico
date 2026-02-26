import app from "./app";
import { env } from "./config/env";
import { seedSuperAdmin } from "./utils/seed";

const bootstrap = async () => {
  try {
    await seedSuperAdmin();
    app.listen(env.PORT, () => {
      console.log(`Server is running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

bootstrap();
