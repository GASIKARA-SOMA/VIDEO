const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Créer les tables et insérer les données
async function initialiserBaseDeDonnees() {
  try {
    console.log('🗄️  Initialisation de la base de données...');

    // Créer la table jeux
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jeux (
        id SERIAL PRIMARY KEY,
        titre VARCHAR(100) NOT NULL,
        plateforme VARCHAR(50) NOT NULL,
        description TEXT,
        image_url VARCHAR(200),
        categorie VARCHAR(50),
        lien_officiel VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table jeux créée');

    

    // Vérifier si la table est vide
    const result = await pool.query('SELECT COUNT(*) FROM jeux');
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      console.log('📥 Insertion des jeux initiaux...');
      
      // Insérer les jeux initiaux
      await pool.query(`
        INSERT INTO jeux (titre, plateforme, description, image_url, categorie, lien_officiel) VALUES
        ('Fortnite', 'PS5/PC/PS4', 'Battle Royale gratuit avec construction', 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'battle-royale', 'https://www.epicgames.com/fortnite/fr/home'),
        ('Rocket League', 'PC/PS5/Xbox', 'Football avec des voitures rocket', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'sport', 'https://www.epicgames.com/rocketleague/fr/home'),
        ('Among Us', 'PC/Mobile', 'Jeu de déduction sociale dans l espace', 'https://images.unsplash.com/photo-1618335829737-222e57b6d979?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'social', 'https://www.innersloth.com/gameAmongUs.php'),
        ('Valorant', 'PC', 'FPS tactique avec agents aux pouvoirs uniques', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'fps', 'https://playvalorant.com/'),
        ('God of War Ragnarok', 'PS5/PS4', 'Épopée nordique de Kratos et Atreus', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'action', 'https://www.playstation.com/fr-fr/games/god-of-war-ragnarok/'),
        ('Halo Infinite', 'Xbox/PC', 'Le Master Chief dans une nouvelle aventure', 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'fps', 'https://www.halowaypoint.com/'),
        ('Cyberpunk 2077', 'PC/PS5/Xbox', 'RPG futuriste dans Night City', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'rpg', 'https://www.cyberpunk.net/'),
        ('Genshin Impact', 'Mobile/PC/PS5', 'RPG action en monde ouvert gratuit', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'rpg', 'https://genshin.hoyoverse.com/'),
        ('Call of Duty: Warzone', 'PC/PS5/Xbox', 'Battle Royale gratuit de Call of Duty', 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'battle-royale', 'https://www.callofduty.com/warzone'),
        ('Apex Legends', 'PC/PS5/Xbox/Mobile', 'Battle Royale avec des légends uniques', 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'battle-royale', 'https://www.ea.com/games/apex-legends')
      `);
      console.log('✅ Jeux initiaux insérés');
    }

    // Créer la table pour les statistiques
    await pool.query(`
      CREATE TABLE IF NOT EXISTS statistiques (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        valeur INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Initialiser les statistiques
    await pool.query(`
      INSERT INTO statistiques (type, valeur) 
      VALUES ('telechargements', 0)
      ON CONFLICT (type) DO NOTHING
    `);

    console.log('✅ Base de données initialisée avec succès');

  } catch (error) {
    console.error('❌ Erreur initialisation base:', error);
  }
}
app.post('/api/admin/jeux', async (req, res) => {
  try {
    const { titre, plateforme, description, image_url, lien_officiel, categorie } = req.body;
    
    const result = await pool.query(
      `INSERT INTO jeux (titre, plateforme, description, image_url, lien_officiel, categorie) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [titre, plateforme, description, image_url, lien_officiel, categorie]
    );
    
    res.json({ success: true, jeu: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erreur ajout jeu' });
  }
});

// Ajoute au début avec les autres requires
const crypto = require('crypto');

// Stockage des sessions admin
const adminSessions = new Map();

// Générer un token sécurisé
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Middleware d'authentification
function requireAuth(req, res, next) {
    const token = req.headers.authorization;
    
    if (!token) {
        return res.status(401).json({ error: "🔐 Token manquant" });
    }
    
    const session = adminSessions.get(token);
    
    if (!session) {
        return res.status(401).json({ error: "🔐 Session invalide" });
    }
    
    // Vérifier l'expiration (1 heure)
    if (Date.now() > session.expiresAt) {
        adminSessions.delete(token);
        return res.status(401).json({ error: "🔐 Session expirée" });
    }
    
    // Session valide, continuer
    next();
}
// =============================================
// APIs PRINCIPALES
// =============================================
// API de connexion admin
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    // Mot de passe admin (à mettre en variable d'environnement plus tard)
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Gasikara2024!";
    
    if (password === ADMIN_PASSWORD) {
        // Créer une session
        const token = generateToken();
        const session = {
            token: token,
            expiresAt: Date.now() + (60 * 60 * 1000), // 1 heure
            createdAt: new Date().toISOString()
        };
        
        adminSessions.set(token, session);
        
        res.json({ 
            success: true, 
            message: "✅ Connexion réussie",
            token: token,
            expiresIn: 3600
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: "❌ Mot de passe incorrect" 
        });
    }
});
// API 1: Récupérer les jeux par plateforme
app.get('/api/jeux', async (req, res) => {
  try {
    const { plateforme } = req.query;
    let query = 'SELECT * FROM jeux';
    let params = [];

    if (plateforme) {
      if (plateforme === 'console') {
        query += ' WHERE plateforme ILIKE $1 OR plateforme ILIKE $2';
        params = ['%ps%', '%xbox%'];
      } else if (plateforme === 'pc') {
        query += ' WHERE plateforme ILIKE $1';
        params = ['%pc%'];
      } else if (plateforme === 'mobile') {
        query += ' WHERE plateforme ILIKE $1';
        params = ['%mobile%'];
      }
    }

    query += ' ORDER BY titre';

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('❌ Erreur API jeux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API 2: Recherche de jeux
app.get('/api/recherche', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT * FROM jeux 
       WHERE titre ILIKE $1 OR description ILIKE $1 OR plateforme ILIKE $1
       ORDER BY titre`,
      [`%${q}%`]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('❌ Erreur API recherche:', error);
    res.status(500).json({ error: 'Erreur recherche' });
  }
});

// API 3: Enregistrer un téléchargement
app.post('/api/telechargements', async (req, res) => {
  try {
    const { jeuId } = req.body;

    // Incrémenter le compteur global
    await pool.query(`
      UPDATE statistiques 
      SET valeur = valeur + 1, updated_at = NOW()
      WHERE type = 'telechargements'
    `);

    // Ici tu pourrais aussi enregistrer le jeu spécifique téléchargé
    console.log(`📥 Téléchargement enregistré pour jeu: ${jeuId}`);

    res.json({ success: true, message: 'Téléchargement enregistré' });

  } catch (error) {
    console.error('❌ Erreur API téléchargements:', error);
    res.status(500).json({ error: 'Erreur enregistrement' });
  }
});

// API 4: Récupérer les statistiques
app.get('/api/statistiques', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM statistiques');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur API statistiques:', error);
    res.status(500).json({ error: 'Erreur statistiques' });
  }
});

// API 5: Route de test
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '🚀 Gasikara Video Game API fonctionne!',
    version: '1.0',
    timestamp: new Date().toISOString()
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bienvenue sur Gasikara Video Game Backend!',
    endpoints: {
      jeux: '/api/jeux',
      recherche: '/api/recherche',
      telechargements: '/api/telechargements',
      statistiques: '/api/statistiques',
      test: '/api/test'
    }
  });
});
app.delete('/api/admin/jeux/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM jeux WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur suppression' });
  }
});
app.put('/api/admin/jeux/:id', async (req, res) => {
  try {
    const { titre, plateforme, description, image_url, lien_officiel, categorie } = req.body;
    
    const result = await pool.query(
      `UPDATE jeux SET titre=$1, plateforme=$2, description=$3, image_url=$4, lien_officiel=$5, categorie=$6 
       WHERE id=$7 RETURNING *`,
      [titre, plateforme, description, image_url, lien_officiel, categorie, req.params.id]
    );
    
    res.json({ success: true, jeu: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erreur modification' });
  }
});

app.get('/api/admin/jeux', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jeux ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erreur liste jeux' });
  }
});

// =============================================
// DÉMARRAGE DU SERVEUR
// =============================================

async function demarrerServeur() {
  try {
    // Initialiser la base de données
    await initialiserBaseDeDonnees();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log('=================================');
      console.log('🚀 GASIKARA VIDEO GAME BACKEND');
      console.log('=================================');
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🗄️  Base: ${process.env.DATABASE_URL ? 'Connectée' : 'Non configurée'}`);
      console.log('=================================');
      console.log('✅ Serveur démarré avec succès!');
      console.log('=================================');
    });

  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
    process.exit(1);
  }
}

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du serveur...');
  await pool.end();
  process.exit(0);
});

// Démarrer l'application
demarrerServeur();
