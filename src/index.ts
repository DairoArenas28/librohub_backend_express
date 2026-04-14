import 'dotenv/config';
import { AppDataSource } from './database/data-source';
import app from './app';

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error: Error) => {
    console.error('Error initializing database:', error);
    process.exit(1);
  });
