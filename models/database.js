const sqlite3 = require("sqlite3").verbose();
const fs = require('fs');
const path = require('path');
const axios = require("axios");
const { huggingfaceApiKey } = require("../config");

// Connexion à la base de données SQLite
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Erreur de connexion à la base de données:", err.message);
  } else {
    console.log("Connexion à la base de données SQLite établie");
  }
});

// Fonction pour initialiser la base de données
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    // Activer le mode foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Vérifier si la table users existe déjà
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
      if (err) {
        console.error("Erreur lors de la vérification des tables:", err.message);
        return reject(err);
      }
      
      // Si la table users existe déjà, on considère que la structure est déjà en place
      if (row) {
        console.log("Les tables existent déjà dans la base de données");
        return resolve();
      }
      
      // Si la table n'existe pas, on exécute les migrations
      const migrationFilePath = path.join(__dirname, '../migrations/first_migration.sql');
      
      fs.readFile(migrationFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error("Erreur lors de la lecture du fichier de migration:", err.message);
          return reject(err);
        }
        
        // Exécuter les requêtes de migration
        db.serialize(() => {
          // Séparation des instructions SQL
          const queries = data.split(';').filter(query => query.trim().length > 0);
          
          // Exécution de chaque requête
          for (const query of queries) {
            db.run(query, function(err) {
              if (err) {
                console.error("Erreur lors de l'exécution de la migration:", err.message);
                console.error("Requête problématique:", query);
              }
            });
          }
          
          console.log("Migration de la base de données terminée");
          resolve();
        });
      });
    });
  });
};

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

// Fonction pour générer des flashcards via Bloom
async function generate_flashcards(document_id) {
  try {
    const document = await getOneQuery(
      "SELECT id, user_id, content FROM documents WHERE id = ?",
      [document_id]
    );
    if (!document) return [];

    const content = document.content;

    // Appel à l'API Hugging Face avec Bloom pour générer des flashcards
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/bigscience/bloom",
      { inputs: `Génère des flashcards basées sur ce texte : ${content}` },
      { headers: { Authorization: `Bearer ${huggingfaceApiKey}` } }
    );

    const flashcardsText = response.data.choices[0].text.trim();
    const flashcards = flashcardsText.split("\n").map((line) => {
      const [question, answer] = line.split(":");
      return { question: question.trim(), answer: answer.trim() };
    });

    // Enregistrer les flashcards dans la base de données
    for (const card of flashcards) {
      await runQuery(
        "INSERT INTO flashcards (user_id, question, answer) VALUES (?, ?, ?)",
        [document.user_id, card.question, card.answer]
      );
    }

    return flashcards;
  } catch (err) {
    console.error("Erreur lors de la génération des flashcards via l'IA :", err.message);
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

// Fonction pour générer un quiz via Bloom
async function generate_quiz(document_id) {
  try {
    const document = await getOneQuery(
      "SELECT id, user_id, content FROM documents WHERE id = ?",
      [document_id]
    );
    if (!document) return -1;

    const content = document.content;

    // Appel à l'API Hugging Face avec Bloom pour générer un quiz
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/bigscience/bloom",
      { inputs: `Génère un quiz basé sur ce texte : ${content}. Fournis chaque question avec une réponse correcte et trois réponses incorrectes.` },
      { headers: { Authorization: `Bearer ${huggingfaceApiKey}` } }
    );

    const quizText = response.data.choices[0].text.trim();
    const quizQuestions = quizText.split("\n").map((line) => {
      const [questionPart, answersPart] = line.split(":");
      const [correctAnswer, ...incorrectAnswers] = answersPart.split(",");
      return {
        question: questionPart.trim(),
        correct_answer: correctAnswer.trim(),
        incorrect_answers: incorrectAnswers.map((ans) => ans.trim()),
      };
    });

    const quizTitle = `Quiz sur ${document.title}`;
    const quizId = await runQuery(
      "INSERT INTO quizzes (user_id, title) VALUES (?, ?)",
      [document.user_id, quizTitle]
    );

    // Enregistrer les questions du quiz dans la base de données
    for (const q of quizQuestions) {
      await runQuery(
        "INSERT INTO quiz_questions (quiz_id, question, correct_answer, incorrect_answers) VALUES (?, ?, ?, ?)",
        [quizId, q.question, q.correct_answer, q.incorrect_answers.join(",")]
      );
    }

    return quizId;
  } catch (err) {
    console.error("Erreur lors de la génération du quiz via l'IA :", err.message);
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
  initializeDatabase,
};
