import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// --- SETUP PETA LOKASI FOLDER (Supaya Vercel tidak nyasar) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Set Folder Views secara Eksplisit
app.set('views', path.join(__dirname, 'views'));
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

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

app.get('/battery', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM batteries ORDER BY id ASC');
        res.render('battery', { batteries: result.rows });
    } catch (err) {
        res.send("Error Loading Battery: " + err.message);
    }
});

// --- ROUTE API ---

app.post('/api/update-percent', async (req, res) => {
    const { id, percentage } = req.body;
    try {
        await pool.query('UPDATE batteries SET percentage=$1 WHERE id=$2', [percentage, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/toggle-status', async (req, res) => {
    const { id, currentStatus } = req.body;
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