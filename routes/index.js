const express = require("express");
const router = express.Router();
const controllers = require("../controllers/index");

// Route pour la page d'accueil
router.get("/", controllers.homeController);

// Routes pour la connexion
router.get("/login", controllers.loginGetController);
router.post("/login", controllers.loginPostController);

// Routes pour l'inscription
router.get("/register", controllers.registerGetController);
router.post("/register", controllers.registerPostController);

// Route pour la déconnexion
router.get("/logout", controllers.logoutController);

// Routes pour la création de document
router.get("/document/new", controllers.createDocumentGetController);
router.post("/document/new", controllers.createDocumentPostController);

// Routes pour la visualisation et l'édition de document
router.get("/document/:id", controllers.viewDocumentController);
router.get("/document/:id/edit", controllers.editDocumentGetController);
router.post("/document/:id/edit", controllers.editDocumentPostController);

// Routes pour les flashcards
router.post(
  "/document/:id/flashcards",
  controllers.generateFlashcardsController
);
router.get("/document/:id/flashcards", controllers.viewFlashcardsController);

// Routes pour les quiz
router.post("/document/:id/quiz", controllers.generateQuizController);
router.get("/quiz/:id", controllers.viewQuizController);

module.exports = router;
