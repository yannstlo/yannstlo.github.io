document.addEventListener('DOMContentLoaded', () => {
  const archive = document.querySelector('[data-recipe-grid]');
  if (archive) {
    fetch('/recipes/recipes.json')
      .then(response => {
        if (!response.ok) throw new Error('Unable to load recipes');
        return response.json();
      })
      .then(recipes => {
        const sorted = recipes.sort((a, b) => b.date.localeCompare(a.date));
        archive.innerHTML = sorted.map(recipe => {
          const hasRating = Number.isInteger(recipe.rating) && recipe.rating >= 1 && recipe.rating <= 5;
          const stars = hasRating
            ? '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating)
            : 'Not rated yet';
          const ratingLabel = hasRating
            ? `${recipe.rating} out of 5 stars`
            : 'Not rated yet';
          const date = new Date(recipe.date + 'T12:00:00');
          const formatted = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric', month: 'long', day: 'numeric'
          }).format(date);

          return `
            <article class="recipe-card">
              <a href="${recipe.url}">
                <img src="${recipe.heroImage}" alt="${recipe.title}" loading="lazy">
                <div class="recipe-card-body">
                  <div class="recipe-date">${formatted}</div>
                  <h2>${recipe.title}</h2>
                  <div class="rating" aria-label="${ratingLabel}">${stars}</div>
                  <p>${recipe.summary}</p>
                  <div class="tag-list">
                    ${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                  </div>
                </div>
              </a>
            </article>
          `;
        }).join('');
      })
      .catch(() => {
        archive.innerHTML = '<div class="empty-state">Recipes are temporarily unavailable.</div>';
      });
  }

  const switcher = document.querySelector('[data-view-switcher]');
  if (switcher) {
    const buttons = Array.from(switcher.querySelectorAll('button'));
    const standard = document.querySelector('[data-standard-view]');
    const cook = document.querySelector('[data-cook-view]');

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode;
        buttons.forEach(item => item.classList.toggle('active', item === button));
        const showCook = mode === 'cook';
        standard.classList.toggle('hidden', showCook);
        cook.classList.toggle('hidden', !showCook);
        button.setAttribute('aria-pressed', 'true');
        buttons.filter(item => item !== button).forEach(item => item.setAttribute('aria-pressed', 'false'));
      });
    });
  }
});