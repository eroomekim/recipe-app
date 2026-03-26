import type { CheerioAPI } from "cheerio";

export interface RecipeNotes {
  storageTips: string;
  makeAheadNotes: string;
  servingSuggestions: string;
  techniqueNotes: string;
}

const SECTION_PATTERNS: { field: keyof RecipeNotes; keywords: RegExp }[] = [
  { field: "storageTips", keywords: /stor(age|e|ing)|refrigerat|freez|keep|leftover|shelf.?life|fridge/i },
  { field: "makeAheadNotes", keywords: /make.?ahead|prep.?ahead|advance|prepare.?earlier|night.?before|meal.?prep/i },
  { field: "servingSuggestions", keywords: /serv(e|ing).?(suggest|with|idea|tip)|pair.?with|goes.?well|accompan|side.?dish|what.?to.?serve/i },
  { field: "techniqueNotes", keywords: /tip|trick|technique|chef|note|secret|why.?this.?works|pro.?tip|helpful.?hint/i },
];

// Patterns that match headings which are clearly about a specific notes category
// (stricter than SECTION_PATTERNS to avoid false positives on heading text)
const HEADING_PATTERNS: { field: keyof RecipeNotes; keywords: RegExp }[] = [
  { field: "storageTips", keywords: /\b(stor(age|e|ing)|refrigerat|freez(e|ing|er)|keep(ing)?|leftover|shelf.?life|fridge|how\s+to\s+store)\b/i },
  { field: "makeAheadNotes", keywords: /\b(make.?ahead|prep.?ahead|advance|prepare.?earlier|night.?before|meal.?prep)\b/i },
  { field: "servingSuggestions", keywords: /\b(serv(e|ing)\s+(suggest\w*|with|ideas?|tips?)|pair.?with|goes.?well|accompan|side.?dish|what.?to.?serve)\b/i },
  { field: "techniqueNotes", keywords: /\b(tips?|tricks?|techniques?|chef.?s?\s+note|secret|why.?this.?works|pro.?tip|helpful.?hint|recipe\s+notes?)\b/i },
];

export function extractRecipeNotes($: CheerioAPI): RecipeNotes {
  const result: RecipeNotes = {
    storageTips: "",
    makeAheadNotes: "",
    servingSuggestions: "",
    techniqueNotes: "",
  };

  // Strategy 1: Recipe plugin note sections — parse inner structure
  const noteSelectors = [
    ".wprm-recipe-notes",
    ".tasty-recipe-notes",
    ".recipe-notes",
    '[class*="recipe-note"]',
    '[itemprop="recipeNotes"]',
  ];

  for (const selector of noteSelectors) {
    $(selector).each((_, el) => {
      // Check for sub-headings inside the note container
      const innerHeadings = $(el).find("h2, h3, h4, h5, h6, strong, b");
      if (innerHeadings.length > 0) {
        extractFromInnerHeadings($, $(el), result);
      }
      // Also try plain text categorization for anything not yet matched
      const noteText = $(el).text().trim();
      if (noteText) categorizeText(noteText, result);
    });
  }

  // Strategy 2: Headings containing keywords, capture sibling content
  $("h2, h3, h4, h5").each((_, el) => {
    const headingText = $(el).text().trim();
    for (const { field, keywords } of HEADING_PATTERNS) {
      if (keywords.test(headingText) && !result[field]) {
        const content = collectSiblingContent($, $(el));
        if (content) {
          result[field] = content.slice(0, 1000);
        }
      }
    }
  });

  // Strategy 3: Bold/strong pseudo-headers within paragraphs
  // Matches patterns like <p><strong>Storage:</strong> Keep in fridge for 3 days</p>
  $("p, li, div").each((_, el) => {
    const firstChild = $(el).contents().first();
    const strongEl = $(el).find("strong, b").first();

    // Only consider <strong>/<b> that is at the start of the element
    if (strongEl.length === 0) return;
    const strongParent = strongEl.parent();
    if (!strongParent.is($(el))) return;

    const labelText = strongEl.text().trim().replace(/:$/, "");
    if (!labelText) return;

    for (const { field, keywords } of HEADING_PATTERNS) {
      if (keywords.test(labelText) && !result[field]) {
        // Get the full text minus the label
        const fullText = $(el).text().trim();
        const afterLabel = fullText.replace(new RegExp(`^${escapeRegExp(strongEl.text().trim())}\\s*`), "").trim();

        if (afterLabel) {
          // Also collect any following sibling paragraphs that don't have their own bold label
          const parts = [`<p>${afterLabel}</p>`];
          let sibling = $(el).next();
          while (sibling.length && !sibling.is("h1, h2, h3, h4, h5, h6")) {
            // Stop if the next element starts with its own bold label
            const nextStrong = sibling.find("strong, b").first();
            if (nextStrong.length > 0 && isLeadingChild($, sibling, nextStrong)) break;
            const html = $.html(sibling).trim();
            if (html) parts.push(html);
            sibling = sibling.next();
          }
          result[field] = parts.join("").slice(0, 2000);
        }
        break;
      }
    }
  });

  // Strategy 4: Definition lists (<dt>/<dd>)
  $("dt").each((_, el) => {
    const term = $(el).text().trim();
    for (const { field, keywords } of HEADING_PATTERNS) {
      if (keywords.test(term) && !result[field]) {
        const dd = $(el).next("dd");
        if (dd.length > 0) {
          result[field] = (dd.html() || "").trim().slice(0, 2000);
        }
      }
    }
  });

  // Strategy 5: Class-based section detection
  // Matches containers like <div class="recipe-storage">, <section class="tips-section">
  const classMappings: { pattern: RegExp; field: keyof RecipeNotes }[] = [
    { pattern: /\bstorag|leftover|freezing/i, field: "storageTips" },
    { pattern: /\bmake-?ahead|prep-?ahead|meal-?prep/i, field: "makeAheadNotes" },
    { pattern: /\bserving-?suggest|serving-?tip|pair/i, field: "servingSuggestions" },
    { pattern: /\btips?-?section|\bnotes?-?section|\btechnique/i, field: "techniqueNotes" },
  ];

  $("[class]").each((_, el) => {
    const className = $(el).attr("class") || "";
    for (const { pattern, field } of classMappings) {
      if (pattern.test(className) && !result[field]) {
        const html = ($(el).html() || "").trim();
        if (html && html.length > 10) {
          result[field] = html.slice(0, 2000);
        }
      }
    }
  });

  return result;
}

/**
 * Collect HTML from sibling elements until the next heading.
 * Also handles the case where content is inside a wrapper div with the heading.
 * Preserves markup (bold, lists, links, etc.) for rich text display.
 */
function collectSiblingContent($: CheerioAPI, headingEl: ReturnType<CheerioAPI>): string {
  const content: string[] = [];

  // First try: direct siblings
  let sibling = headingEl.next();
  while (sibling.length && !sibling.is("h1, h2, h3, h4, h5")) {
    const html = $.html(sibling).trim();
    if (html) content.push(html);
    sibling = sibling.next();
  }

  // If no sibling content found, check if heading is inside a wrapper
  // and the content is in sibling children of that wrapper
  if (content.length === 0) {
    const parent = headingEl.parent();
    if (parent.length && !parent.is("body, html, main, article, section")) {
      let foundHeading = false;
      parent.children().each((_, child) => {
        if ($(child).is(headingEl)) {
          foundHeading = true;
          return;
        }
        if (foundHeading) {
          const html = $.html($(child)).trim();
          if (html) content.push(html);
        }
      });
    }
  }

  return content.join("");
}

/**
 * Parse inner headings/bold labels within a note container and categorize their content.
 */
function extractFromInnerHeadings(
  $: CheerioAPI,
  container: ReturnType<CheerioAPI>,
  result: RecipeNotes
): void {
  container.find("h2, h3, h4, h5, h6").each((_, el) => {
    const headingText = $(el).text().trim();
    for (const { field, keywords } of HEADING_PATTERNS) {
      if (keywords.test(headingText) && !result[field]) {
        const content = collectSiblingContent($, $(el));
        if (content) {
          result[field] = content.slice(0, 1000);
        }
      }
    }
  });

  // Also check bold/strong elements acting as labels inside the container
  container.find("strong, b").each((_, el) => {
    const labelText = $(el).text().trim().replace(/:$/, "");
    const parentEl = $(el).parent();
    if (!parentEl.is("p, li, div, span")) return;

    for (const { field, keywords } of HEADING_PATTERNS) {
      if (keywords.test(labelText) && !result[field]) {
        // Get the parent's HTML, remove the label element, keep the rest
        const parentHtml = (parentEl.html() || "").trim();
        const labelHtml = $.html($(el));
        const afterLabel = parentHtml.replace(labelHtml, "").replace(/^\s*:?\s*/, "").trim();
        if (afterLabel) {
          result[field] = afterLabel.slice(0, 2000);
        }
      }
    }
  });
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

/**
 * Check if a strong/b element is the leading child of its parent element.
 */
function isLeadingChild(
  $: CheerioAPI,
  parent: ReturnType<CheerioAPI>,
  child: ReturnType<CheerioAPI>
): boolean {
  const firstText = parent.contents().first();
  // The bold element is leading if it's the first child or preceded only by whitespace
  const firstChild = parent.children().first();
  return firstChild.is(child);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
