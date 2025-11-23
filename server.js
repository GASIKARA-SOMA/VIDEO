
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ message: 'Backend GasikaraSoma fonctionne!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
app.get('/api/games', (req, res) => {
    res.json({ message: 'Liste des jeux bientôt disponible!' });
});
