# Create the test file
kubectl exec -it deployment/job-server -- bash -c 'cat > db-test.js << EOF
const { Pool } = require("pg");

console.log("Environment variables:");
console.log("HOST:", process.env.POSTGRES_HOST);
console.log("PORT:", process.env.POSTGRES_PORT);
console.log("DB:", process.env.POSTGRES_DB);
console.log("USER:", process.env.POSTGRES_USER);
console.log("PASSWORD SET:", !!process.env.POSTGRES_PASSWORD);

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

pool.query("SELECT 1 as test")
  .then(result => {
    console.log("SUCCESS: Database connected!");
    console.log("Result:", result.rows[0]);
    pool.end();
  })
  .catch(err => {
    console.log("ERROR:", err.message);
    pool.end();
  });
EOF'
