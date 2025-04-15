const {
  login,
  register,
  get_user_documents,
  create_document,
  update_document,
  get_document,
  generate_flashcards,
  get_flashcards,
  generate_quiz,
  get_quiz,
} = require("../models/database"); // Importer les fonctions du modèle

// Contrôleur pour GET / : Affiche la page d'accueil avec la liste des documents
async function homeController(req, res) {
  try {
    if (!req.session.userId) {
      return res.redirect("/login"); // Rediriger vers la connexion si non connecté
    }
    const documents = await get_user_documents(req.session.userId); // Récupérer les documents
    res.render("index", { documents, userId: req.session.userId }); // Rendre la page d'accueil
  } catch (err) {
    console.error("Erreur dans homeController:", err.message);
    res.render("index", {
      documents: [],
      error: "Erreur lors du chargement des documents",
    });
  }
}

// Contrôleur pour GET /login : Affiche le formulaire de connexion
function loginGetController(req, res) {
  if (req.session.userId) {
    return res.redirect("/"); // Rediriger vers l'accueil si déjà connecté
  }
  res.render("login", { error: null }); // Rendre la page de connexion
}

// Contrôleur pour POST /login : Traite la connexion
async function loginPostController(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.render("login", { error: "Veuillez remplir tous les champs" });
    }
    const userId = await login(username, password); // Appeler la fonction du modèle
    if (userId !== -1) {
      req.session.userId = userId; // Stocker l'ID dans la session
      res.redirect("/"); // Rediriger vers l'accueil
    } else {
      res.render("login", { error: "Identifiants incorrects" });
    }
  } catch (err) {
    console.error("Erreur dans loginPostController:", err.message);
    res.render("login", { error: "Erreur lors de la connexion" });
  }
}

// Contrôleur pour GET /register : Affiche le formulaire d'inscription
function registerGetController(req, res) {
  if (req.session.userId) {
    return res.redirect("/"); // Rediriger vers l'accueil si déjà connecté
  }
  res.render("register", { error: null }); // Rendre la page d'inscription
}

// Contrôleur pour POST /register : Traite l'inscription
async function registerPostController(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.render("register", {
        error: "Veuillez remplir tous les champs",
      });
    }
    const userId = await register(username, password); // Appeler la fonction du modèle
    if (userId !== -1) {
      req.session.userId = userId; // Stocker l'ID dans la session
      res.redirect("/"); // Rediriger vers l'accueil
    } else {
      res.render("register", { error: "Nom d’utilisateur déjà pris" });
    }
  } catch (err) {
    console.error("Erreur dans registerPostController:", err.message);
    res.render("register", { error: "Erreur lors de l’inscription" });
  }
}

// Contrôleur pour GET /logout : Déconnecte l'utilisateur
function logoutController(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erreur dans logoutController:", err.message);
    }
    res.redirect("/"); // Rediriger vers l'accueil
  });
}

// Contrôleur pour GET /document/new : Affiche le formulaire de création de document
function createDocumentGetController(req, res) {
  if (!req.session.userId) {
    return res.redirect("/login"); // Vérifier si connecté
  }
  res.render("document", { document: null, error: null }); // Rendre le formulaire vierge
}

// Contrôleur pour POST /document/new : Traite la création d'un nouveau document
async function createDocumentPostController(req, res) {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
    const { title, content } = req.body;
    if (!title || !content) {
      return res.render("document", {
        document: null,
        error: "Veuillez remplir tous les champs",
      });
    }
    const documentId = await create_document(
      req.session.userId,
      title,
      content
    ); // Appeler le modèle
    if (documentId !== -1) {
      res.redirect(`/document/${documentId}`); // Rediriger vers la visualisation
    } else {
      res.render("document", {
        document: null,
        error: "Erreur lors de la création du document",
      });
    }
  } catch (err) {
    console.error("Erreur dans createDocumentPostController:", err.message);
    res.render("document", {
      document: null,
      error: "Erreur lors de la création du document",
    });
  }
}

// Contrôleur pour GET /document/:id : Affiche la page de visualisation d'un document
async function viewDocumentController(req, res) {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
    const documentId = req.params.id;
    const document = await get_document(documentId); // Appeler le modèle
    if (!document || document.user_id !== req.session.userId) {
      return res.render("view_document", {
        document: null,
        error: "Document introuvable",
      });
    }
    res.render("view_document", { document, error: null }); // Rendre la vue
  } catch (err) {
    console.error("Erreur dans viewDocumentController:", err.message);
    res.render("view_document", {
      document: null,
      error: "Erreur lors du chargement",
    });
  }
}

// Contrôleur pour GET /document/:id/edit : Affiche le formulaire d'édition d'un document
async function editDocumentGetController(req, res) {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
    const documentId = req.params.id;
    const document = await get_document(documentId); // Appeler le modèle
    if (!document || document.user_id !== req.session.userId) {
      return res.redirect("/"); // Rediriger si accès non autorisé
    }
    res.render("document", { document, error: null }); // Rendre le formulaire pré-rempli
  } catch (err) {
    console.error("Erreur dans editDocumentGetController:", err.message);
    res.redirect("/");
  }
}

// Contrôleur pour POST /document/:id/edit : Traite la mise à jour d'un document
async function editDocumentPostController(req, res) {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
    const documentId = req.params.id;
    const { title, content } = req.body;
    if (!title || !content) {
      const document = await get_document(documentId);
      return res.render("document", {
        document,
        error: "Veuillez remplir tous les champs",
      });
    }
    const success = await update_document(documentId, title, content); // Appeler le modèle
    if (success) {
      res.redirect(`/document/${documentId}`); // Rediriger vers la visualisation
    } else {
      const document = await get_document(documentId);
      res.render("document", {
        document,
        error: "Erreur lors de la mise à jour",
      });
    }
  } catch (err) {
    console.error("Erreur dans editDocumentPostController:", err.message);
    res.redirect("/");
  }
}

// Contrôleur pour POST /document/:id/flashcards : Génère des flashcards
async function generateFlashcardsController(req, res) {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const documentId = req.params.id;
    const flashcards = await generate_flashcards(documentId);

    if (flashcards.length > 0) res.redirect(`/document/${documentId}/flashcards`);
    else res.render("flashcards", { error: "Aucune flashcard générée." });
  } catch (err) {
    console.error("Erreur dans generateFlashcardsController :", err.message);
    res.redirect(`/document/${req.params.id}`);
  }
}

// Contrôleur pour GET /document/:id/flashcards : Affiche les flashcards
async function viewFlashcardsController(req, res) {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
    const documentId = req.params.id;
    const document = await get_document(documentId);
    if (!document || document.user_id !== req.session.userId) {
      return res.render("flashcards", {
        flashcards: [],
        error: "Document introuvable",
      });
    }
    const flashcards = await get_flashcards(documentId); // Appeler le modèle
    res.render("flashcards", { flashcards, documentId, error: null }); // Rendre la vue
  } catch (err) {
    console.error("Erreur dans viewFlashcardsController:", err.message);
    res.render("flashcards", {
      flashcards: [],
      error: "Erreur lors du chargement",
    });
  }
}

// Contrôleur pour POST /document/:id/quiz : Génère un quiz
async function generateQuizController(req, res) {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const documentId = req.params.id;
    const quizId = await generate_quiz(documentId);

    if (quizId !== -1) res.redirect(`/quiz/${quizId}`);
    else res.render("quiz", { error: "Aucun quiz généré." });
  } catch (err) {
    console.error("Erreur dans generateQuizController :", err.message);
    res.redirect(`/document/${req.params.id}`);
  }
}


// Contrôleur pour GET /quiz/:id : Affiche le quiz
async function viewQuizController(req, res) {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
    const quizId = req.params.id;
    const quiz = await get_quiz(quizId); // Appeler le modèle
    if (!quiz || quiz.user_id !== req.session.userId) {
      return res.render("quiz", { quiz: null, error: "Quiz introuvable" });
    }
    res.render("quiz", { quiz, error: null }); // Rendre la vue
  } catch (err) {
    console.error("Erreur dans viewQuizController:", err.message);
    res.render("quiz", { quiz: null, error: "Erreur lors du chargement" });
  }
}

// Exporter les contrôleurs
module.exports = {
  homeController,
  loginGetController,
  loginPostController,
  registerGetController,
  registerPostController,
  logoutController,
  createDocumentGetController,
  createDocumentPostController,
  viewDocumentController,
  editDocumentGetController,
  editDocumentPostController,
  generateFlashcardsController,
  viewFlashcardsController,
  generateQuizController,
  viewQuizController,
};
