"use client";

import type { RecipeDetail } from "@/types";
import { Printer } from "lucide-react";

export default function PrintRecipeButton({ recipe }: { recipe: RecipeDetail }) {
  function handlePrint() {
    const heroImage = recipe.images[0];

    const tagParts = [
      ...recipe.tags.filter((t) => t.type === "MEAL_TYPE").map((t) => t.name),
      ...recipe.tags.filter((t) => t.type === "CUISINE").map((t) => t.name),
    ];

    const meta = [
      recipe.cookTime ? `${recipe.cookTime} min` : null,
      recipe.servings ? `${recipe.servings} servings` : null,
      ...recipe.tags.filter((t) => t.type === "DIETARY").map((t) => t.name),
    ].filter(Boolean);

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${recipe.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Libre Baskerville', Georgia, serif;
      color: #000;
      max-width: 650px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      display: flex;
      gap: 20px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #C6C6C6;
    }

    .header img {
      width: 180px;
      height: 180px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .header-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .rubric {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11px;
      color: #DF3331;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin-bottom: 6px;
    }

    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 8px;
    }

    .meta {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: #5F5F5F;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .columns {
      display: flex;
      gap: 24px;
    }

    .ingredients {
      width: 38%;
      padding-right: 20px;
      border-right: 1px solid #E6E6E6;
    }

    .instructions {
      width: 62%;
    }

    .section-title {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #949494;
      margin-bottom: 8px;
    }

    .ingredients ul {
      list-style: none;
      padding: 0;
    }

    .ingredients li {
      font-size: 13px;
      line-height: 1.7;
      padding-left: 12px;
      position: relative;
    }

    .ingredients li::before {
      content: '\\2022';
      color: #949494;
      position: absolute;
      left: 0;
    }

    .instructions ol {
      list-style: none;
      padding: 0;
      counter-reset: step;
    }

    .instructions li {
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 8px;
      padding-left: 28px;
      position: relative;
      counter-increment: step;
    }

    .instructions li::before {
      content: counter(step, decimal-leading-zero);
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 900;
      font-size: 15px;
      color: #DF3331;
      opacity: 0.4;
      position: absolute;
      left: 0;
      top: -1px;
    }

    @media print {
      body { padding: 0; }
      @page { margin: 0.5in; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${heroImage ? `<img src="${heroImage}" alt="${recipe.title}" />` : ""}
    <div class="header-text">
      ${tagParts.length > 0 ? `<div class="rubric">${tagParts.join(" · ")}</div>` : ""}
      <h1>${recipe.title}</h1>
      ${meta.length > 0 ? `<div class="meta">${meta.join(" · ")}</div>` : ""}
    </div>
  </div>

  <div class="columns">
    <div class="ingredients">
      <div class="section-title">Ingredients</div>
      <ul>
        ${recipe.ingredients.map((i) => `<li>${i.text}</li>`).join("\n        ")}
      </ul>
    </div>
    <div class="instructions">
      <div class="section-title">Instructions</div>
      <ol>
        ${recipe.instructions.map((i) => `<li>${i.text}</li>`).join("\n        ")}
      </ol>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-4 py-2 border bg-white text-black font-sans text-xs font-semibold uppercase tracking-wider border-black hover:bg-black hover:text-white transition-colors"
    >
      <Printer className="w-4 h-4" />
      Print
    </button>
  );
}
