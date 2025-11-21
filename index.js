import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Set EJS sebagai view engine
app.set('view engine', 'ejs');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KONEKSI DATABASE ---
const connectionString = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
const pool = new pg.Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// --- ROUTE HALAMAN (VIEW) ---

// 1. Halaman HOME (Landing Page)
app.get('/', (req, res) => {
    res.render('home');
});

// 2. Halaman DASHBOARD
app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

// 3. Halaman BATTERY CHECK
app.get('/battery', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM batteries ORDER BY id ASC');
        // Kirim data baterai ke file battery.ejs
        res.render('battery', { batteries: result.rows });
    } catch (err) {
        res.send("Error: " + err.message);
    }
});

// --- ROUTE API (Untuk Update Dinamis tanpa Reload) ---

// API: Update Persentase
app.post('/api/update-percent', async (req, res) => {
    const { id, percentage } = req.body;
    try {
        await pool.query('UPDATE batteries SET percentage=$1 WHERE id=$2', [percentage, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Toggle Status (Charge <-> Ready)
app.post('/api/toggle-status', async (req, res) => {
    const { id, currentStatus } = req.body;
    // Logika: Kalau skrg Ready, ubah jadi Charging. Kalau Charging, ubah jadi Ready.
    const newStatus = currentStatus === 'Ready' ? 'Charging' : 'Ready';
    
    try {
        await pool.query('UPDATE batteries SET status=$1 WHERE id=$2', [newStatus, id]);
        res.json({ success: true, newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});

export default app;