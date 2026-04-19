//Conține funcția connectDB care utilizează Mongoose pentru a stabili conexiunea cu baza de date MongoDB folosind URI-ul din variabilele de mediu

import mongoose from "mongoose";

const connectDB = async (retries = 5) => {
  while (retries) {
    try {
      const connectionInstance = await mongoose.connect(process.env.MONGO_URL);
      console.log(
        `MongoDB connected ✅ | Host: ${connectionInstance.connection.host}`,
      );
      break; //oprim bula in cazul in care serverul se contecteaza
    } catch (error) {
      console.error(`MongoDB connection error ❌: ${error.message}`);
      retries -= 1; //se scade cate 1 din retries la fiecare incercare

      console.log(`Retries left: ${retries}`);

      if (retries === 0) {
        process.exit(1);
      }

      await new Promise((res) => setTimeout(res, 2000)); //Așteptăm 2 secunde înainte de a încerca din nou
    }
  }
};

export default connectDB;
