const express = require("express");
const session = require("express-session");
const mustacheExpress = require("mustache-express");
const routes = require("./routes/index"); // Importer les routes

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

// Utiliser les routes
app.use("/", routes);

// Démarrer le serveur
app.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});
