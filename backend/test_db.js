const { Pool } = require("pg");
const pool = new Pool({ user: "postgres", host: "localhost", database: "expense_tracker", password: "1234", port: 5432 });

async function check() {
  try {
    const res = await pool.query("SELECT * FROM group_invites");
    console.log("Invites table:", res.rows);
    const groups = await pool.query("SELECT * FROM groups LIMIT 1");
    console.log("Groups:", groups.rows);
  } catch(e) {
    console.error("DB Error:", e.message);
  } finally {
    pool.end();
  }
}
check();
