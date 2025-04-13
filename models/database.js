const sqlite3 = require("sqlite3").verbose();

// Connexion à la base de données SQLite
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Erreur de connexion à la base de données:", err.message);
  }
});

// Fonction utilitaire pour exécuter des requêtes SQL avec des promesses
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID || true);
      }
    });
  });
};

const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const getOneQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// 1. login(username, password): retourne l'id de l'utilisateur si les identifiants sont corrects, sinon -1
async function login(username, password) {
  try {
    const row = await getOneQuery(
      "SELECT id FROM users WHERE username = ? AND password = ?",
      [username, password]
    );
    return row ? row.id : -1;
  } catch (err) {
    console.error("Erreur lors de la connexion:", err.message);
    return -1;
  }
}

// 2. register(username, password): crée un nouvel utilisateur et retourne son id, ou -1 si le nom d'utilisateur existe déjà
async function register(username, password) {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await getOneQuery(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (existingUser) {
      return -1;
    }

    // Créer un nouvel utilisateur
    const lastID = await runQuery(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, password]
    );
    return lastID;
  } catch (err) {
    console.error("Erreur lors de l'inscription:", err.message);
    return -1;
  }
}

// 3. get_user_documents(user_id): retourne un tableau des documents de l'utilisateur
async function get_user_documents(user_id) {
  try {
    const rows = await getQuery(
      "SELECT id, title, content FROM documents WHERE user_id = ?",
      [user_id]
    );
    return rows || [];
  } catch (err) {
    console.error("Erreur lors de la récupération des documents:", err.message);
    return [];
  }
}

// 4. create_document(user_id, title, content): crée un nouveau document et retourne son id
async function create_document(user_id, title, content) {
  try {
    const lastID = await runQuery(
      "INSERT INTO documents (user_id, title, content) VALUES (?, ?, ?)",
      [user_id, title, content]
    );
    return lastID;
  } catch (err) {
    console.error("Erreur lors de la création du document:", err.message);
    return -1;
  }
}

// 5. update_document(document_id, title, content): met à jour un document existant
async function update_document(document_id, title, content) {
  try {
    await runQuery("UPDATE documents SET title = ?, content = ? WHERE id = ?", [
      title,
      content,
      document_id,
    ]);
    return true;
  } catch (err) {
    console.error("Erreur lors de la mise à jour du document:", err.message);
    return false;
  }
}

// 6. get_document(document_id): retourne les détails d'un document
async function get_document(document_id) {
  try {
    const row = await getOneQuery(
      "SELECT id, user_id, title, content FROM documents WHERE id = ?",
      [document_id]
    );
    return row || null;
  } catch (err) {
    console.error("Erreur lors de la récupération du document:", err.message);
    return null;
  }
}

// 7. generate_flashcards(document_id): génère des flashcards à partir du contenu du document en utilisant l'IA
async function generate_flashcards(document_id) {
  try {
    // Récupérer le document
    const document = await get_document(document_id);
    if (!document) {
      return [];
    }

    // Simulation d'une génération par IA (à remplacer par une vraie intégration d'IA)
    const fakeFlashcards = [
      { question: "Quelle est la capitale de la France ?", answer: "Paris" },
      { question: "Quelle est la capitale de l’Italie ?", answer: "Rome" },
    ];

    // Enregistrer les flashcards
    for (const card of fakeFlashcards) {
      await runQuery(
        "INSERT INTO flashcards (user_id, question, answer) VALUES (?, ?, ?)",
        [document.user_id, card.question, card.answer]
      );
    }

    return fakeFlashcards;
  } catch (err) {
    console.error("Erreur lors de la génération des flashcards:", err.message);
    return [];
  }
}

// 8. get_flashcards(document_id): retourne les flashcards associées à un document
async function get_flashcards(document_id) {
  try {
    // Note : Le modèle ne lie pas directement flashcards à document_id, donc on utilise user_id
    const document = await get_document(document_id);
    if (!document) {
      return [];
    }
    const rows = await getQuery(
      "SELECT id, question, answer FROM flashcards WHERE user_id = ?",
      [document.user_id]
    );
    return rows || [];
  } catch (err) {
    console.error(
      "Erreur lors de la récupération des flashcards:",
      err.message
    );
    return [];
  }
}

// 9. generate_quiz(document_id): génère un quiz à partir du contenu du document
async function generate_quiz(document_id) {
  try {
    const document = await get_document(document_id);
    if (!document) {
      return -1;
    }

    // Simulation d'un titre de quiz
    const quizTitle = `Quiz sur ${document.title}`;

    // Créer un quiz
    const quizId = await runQuery(
      "INSERT INTO quizzes (user_id, title) VALUES (?, ?)",
      [document.user_id, quizTitle]
    );

    // Simulation de questions générées par IA
    const fakeQuestions = [
      {
        question: "Quelle est la capitale de la France ?",
        correct_answer: "Paris",
        incorrect_answers: "Lyon,Marseille,Nice",
      },
      {
        question: "Quelle est la capitale de l’Italie ?",
        correct_answer: "Rome",
        incorrect_answers: "Milan,Venise,Naples",
      },
    ];

    // Enregistrer les questions
    for (const q of fakeQuestions) {
      await runQuery(
        "INSERT INTO quiz_questions (quiz_id, question, correct_answer, incorrect_answers) VALUES (?, ?, ?, ?)",
        [quizId, q.question, q.correct_answer, q.incorrect_answers]
      );
    }

    return quizId;
  } catch (err) {
    console.error("Erreur lors de la génération du quiz:", err.message);
    return -1;
  }
}

// 10. get_quiz(quiz_id): retourne les détails d'un quiz et ses questions
async function get_quiz(quiz_id) {
  try {
    // Récupérer le quiz
    const quiz = await getOneQuery(
      "SELECT id, user_id, title FROM quizzes WHERE id = ?",
      [quiz_id]
    );
    if (!quiz) {
      return null;
    }

    // Récupérer les questions
    const questions = await getQuery(
      "SELECT id, question, correct_answer, incorrect_answers FROM quiz_questions WHERE quiz_id = ?",
      [quiz_id]
    );

    return {
      id: quiz.id,
      user_id: quiz.user_id,
      title: quiz.title,
      questions: questions || [],
    };
  } catch (err) {
    console.error("Erreur lors de la récupération du quiz:", err.message);
    return null;
  }
}

module.exports = {
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
};
