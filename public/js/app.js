// Gestion du flip des flashcards
document.querySelectorAll('.flashcard').forEach(card => {
    card.addEventListener('click', () => {
        card.classList.toggle('flipped');
    });
});

// Prévention de la double soumission de formulaires
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi en cours...';
    });
});

