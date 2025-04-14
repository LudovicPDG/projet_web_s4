const express = require("express");
const session = require("express-session");
const mustacheExpress = require("mustache-express");
const routes = require("./routes/index"); // Importer les routes
const { initializeDatabase } = require("./models/database"); // Importer la fonction d'initialisation

const app = express();

// Configurer Mustache comme moteur de rendu
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", __dirname + "/views");

// Middleware pour parser les formulaires
app.use(express.urlencoded({ extended: true }));

// Configurer les sessions
app.use(
  session({
    secret: "votre_secret_ici",
    resave: false,
    saveUninitialized: false,
  })
);

// Dossier statique pour les fichiers CSS et JS
app.use(express.static('public'));

// Utiliser les routes
app.use("/", routes);

// Initialiser la base de données puis démarrer le serveur
initializeDatabase()
  .then(() => {
    app.listen(3000, () => {
      console.log("Base de données initialisée avec succès");
      console.log("Serveur démarré sur http://localhost:3000");
    });
  })
  .catch(err => {
    console.error("Erreur lors de l'initialisation de la base de données:", err);
    process.exit(1); // Arrêter l'application en cas d'erreur d'initialisation
  });
