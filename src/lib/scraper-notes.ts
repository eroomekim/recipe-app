import type { CheerioAPI } from "cheerio";

export interface RecipeNotes {
  storageTips: string;
  makeAheadNotes: string;
  servingSuggestions: string;
  techniqueNotes: string;
}

const SECTION_PATTERNS: { field: keyof RecipeNotes; keywords: RegExp }[] = [
  { field: "storageTips", keywords: /stor(age|e|ing)|refrigerat|freez|keep|leftover/i },
  { field: "makeAheadNotes", keywords: /make.?ahead|prep.?ahead|advance|prepare.?earlier|night.?before/i },
  { field: "servingSuggestions", keywords: /serv(e|ing).?(suggest|with|idea|tip)|pair.?with|goes.?well|accompan/i },
  { field: "techniqueNotes", keywords: /tip|trick|technique|chef|note|secret|why.?this.?works/i },
];

export function extractRecipeNotes($: CheerioAPI): RecipeNotes {
  const result: RecipeNotes = {
    storageTips: "",
    makeAheadNotes: "",
    servingSuggestions: "",
    techniqueNotes: "",
  };

  // Strategy 1: Recipe plugin note sections
  const noteSelectors = [
    ".wprm-recipe-notes",
    ".tasty-recipe-notes",
    ".recipe-notes",
    '[class*="recipe-note"]',
    '[itemprop="recipeNotes"]',
  ];

  for (const selector of noteSelectors) {
    $(selector).each((_, el) => {
      const noteText = $(el).text().trim();
      if (!noteText) return;
      categorizeText(noteText, result);
    });
  }

  // Strategy 2: Headings containing keywords, capture sibling content
  $("h2, h3, h4, h5").each((_, el) => {
    const headingText = $(el).text().trim();
    for (const { field, keywords } of SECTION_PATTERNS) {
      if (keywords.test(headingText) && !result[field]) {
        const content: string[] = [];
        let sibling = $(el).next();
        while (sibling.length && !sibling.is("h1, h2, h3, h4, h5")) {
          const text = sibling.text().trim();
          if (text) content.push(text);
          sibling = sibling.next();
        }
        if (content.length > 0) {
          result[field] = content.join(" ").slice(0, 1000);
        }
      }
    }
  });

  return result;
}

function categorizeText(text: string, result: RecipeNotes): void {
  const parts = text.split(/\n+/).filter(Boolean);
  for (const part of parts) {
    for (const { field, keywords } of SECTION_PATTERNS) {
      if (keywords.test(part) && !result[field]) {
        const cleaned = part.replace(/^[^:]+:\s*/i, "").trim();
        result[field] = cleaned.slice(0, 1000);
        break;
      }
    }
  }
}
