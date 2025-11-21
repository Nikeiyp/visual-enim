import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware agar bisa baca data form
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KONEKSI DATABASE SUPABASE ---
// Kita rakit data dari .env menjadi satu link koneksi
const connectionString = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool = new pg.Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // <--- INI KUNCI PERBAIKANNYA
    }
});

// --- INIT DATABASE (Otomatis Bikin Tabel) ---
const initDb = async () => {
    try {
        // Buat tabel kalau belum ada
        await pool.query(`
            CREATE TABLE IF NOT EXISTS batteries (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                percentage INT NOT NULL DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Ready',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Cek isi tabel, kalau kosong kita isi data awal 8 baterai
        const cek = await pool.query('SELECT count(*) FROM batteries');
        if (cek.rows[0].count == 0) {
            console.log("Mengisi data awal 8 baterai...");
            await pool.query(`
                INSERT INTO batteries (name, percentage, status) VALUES 
                ('NX-1', 100, 'Ready'), ('NX-2', 100, 'Ready'),
                ('NX-3', 100, 'Ready'), ('NX-4', 100, 'Ready'),
                ('NX-5', 100, 'Ready'), ('NX-6', 100, 'Ready'),
                ('A67-1', 100, 'Ready'), ('A67-2', 100, 'Ready');
            `);
        }
        console.log("✅ Database Terhubung & Siap!");
    } catch (err) {
        console.error("❌ Gagal konek database:", err.message);
    }
};
initDb();

// --- TAMPILAN WEB ---
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM batteries ORDER BY id ASC');
        const batteries = result.rows;

        // HTML Sederhana
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Monitor Baterai Gereja</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f0f2f5; }
                h2 { text-align: center; color: #333; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
                .card { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); text-align: center; }
                .status-low { border: 2px solid #ff4d4d; background: #fff0f0; }
                .status-ok { border: 2px solid #4dff88; }
                .status-charging { border: 2px solid #ffc107; background: #fffbf0; }
                .percentage { font-size: 2em; font-weight: bold; margin: 10px 0; }
                .btn { background: #007bff; color: white; text-decoration: none; padding: 5px 15px; border-radius: 5px; display: inline-block; margin-top: 5px;}
            </style>
        </head>
        <body>
            <h2>🔋 Status Baterai Kamera</h2>
            <div class="grid">
            ${batteries.map(b => {
                let statusClass = 'status-ok';
                let color = 'green';
                if (b.status === 'Charging') { statusClass = 'status-charging'; color = 'orange'; }
                else if (b.percentage < 50) { statusClass = 'status-low'; color = 'red'; }

                return `
                <div class="card ${statusClass}">
                    <strong>${b.name}</strong><br>
                    <small>${b.status}</small>
                    <div class="percentage" style="color:${color}">${b.percentage}%</div>
                    <a href="/update/${b.id}" class="btn">Update</a>
                </div>
                `;
            }).join('')}
            </div>
        </body>
        </html>
        `;
        res.send(html);
    } catch (err) {
        res.send("Error database: " + err.message);
    }
});

// --- HALAMAN UPDATE ---
app.get('/update/:id', async (req, res) => {
    const { id } = req.params;
    res.send(`
        <body style="font-family:sans-serif; padding:20px; max-width:400px; margin:0 auto;">
            <h3>Update Status Baterai</h3>
            <form action="/update/${id}" method="POST">
                <div style="margin-bottom:15px;">
                    <label>Sisa Baterai (%):</label><br>
                    <input type="number" name="percentage" min="0" max="100" required style="width:100%; padding:8px;">
                </div>
                <div style="margin-bottom:15px;">
                    <label>Status:</label><br>
                    <select name="status" style="width:100%; padding:8px;">
                        <option value="Ready">Ready (Siap Pakai)</option>
                        <option value="In Use">Sedang Dipakai</option>
                        <option value="Charging">Lagi Di-cas ⚡</option>
                    </select>
                </div>
                <button type="submit" style="background:blue; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">Simpan</button>
                <a href="/" style="margin-left:10px;">Batal</a>
            </form>
        </body>
    `);
});

// --- PROSES SIMPAN ---
app.post('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { percentage, status } = req.body;
    await pool.query('UPDATE batteries SET percentage=$1, status=$2 WHERE id=$3', [percentage, status, id]);
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});

export default app;