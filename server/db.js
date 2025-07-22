const { Pool } = require('pg');
require('dotenv').config(); // .env ფაილის ჩასატვირთად

const pool = new Pool({
  user: process.env.DB_USER,        // მომხმარებლის სახელი .env-დან
  host: process.env.DB_HOST,        // ჰოსტი .env-დან (localhost)
  database: process.env.DB_DATABASE, // ბაზის სახელი .env-დან
  password: process.env.DB_PASSWORD, // პაროლი .env-დან
  port: process.env.DB_PORT,        // პორტი .env-დან
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};