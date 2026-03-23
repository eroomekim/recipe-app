"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I import a recipe from a website?",
    answer:
      "Go to the Import page and select the \"Paste URL\" tab. Paste the full URL of any recipe blog page and click \"Extract Recipe.\" The app will automatically pull out the title, ingredients, instructions, and images. You can review and edit everything before saving.",
  },
  {
    question: "Can I import a recipe from a photo or cookbook?",
    answer:
      "Yes! On the Import page, select the \"Upload Image\" tab. You can upload photos of printed recipes, handwritten recipe cards, or cookbook pages. The app uses AI to read the text and extract the recipe. You can upload up to 5 images at once — useful for recipes that span multiple pages.",
  },
  {
    question: "What image formats are supported for upload?",
    answer:
      "JPEG, PNG, WebP, HEIC (iPhone photos), and PDF files are all supported. Each file can be up to 20MB. HEIC files from iPhones are automatically converted during upload.",
  },
  {
    question: "Can I import recipes from social media?",
    answer:
      "Yes. You can paste URLs from YouTube, Instagram, TikTok, Pinterest, and other platforms. The app will attempt to extract recipe content from the post, including transcribing video content when needed. Social media imports may take a bit longer than blog imports.",
  },
  {
    question: "How do I edit a recipe after saving it?",
    answer:
      "Open any recipe from your collection and click the edit button. You can change the title, ingredients, instructions, cook time, servings, tags, and images. You can also upload new photos directly from the edit page.",
  },
  {
    question: "How does the serving size adjustment work?",
    answer:
      "When viewing a recipe that has a serving size set, you'll see \"+\" and \"-\" buttons next to the serving count. Adjusting this will automatically scale all ingredient quantities up or down. To reset, click the \"Reset\" button that appears after scaling.",
  },
  {
    question: "What are the meal type, cuisine, and dietary tags for?",
    answer:
      "Tags help you organize and filter your recipes. When importing, the app suggests tags automatically, but you can change them. Use the filter bar on the collection page to quickly find recipes by type — for example, all \"Dinner\" recipes that are \"Gluten-Free.\"",
  },
  {
    question: "How do I search and filter my recipes?",
    answer:
      "The collection page has a search bar at the top that searches recipe titles, ingredients, and tags. Below it, you can filter by meal type, cuisine, dietary restrictions, and cook time. You can combine multiple filters and clear them all with one click.",
  },
  {
    question: "Is there a limit to how many recipes I can import per day?",
    answer:
      "Yes. URL-based imports are limited to 20 per day, and image-based imports are limited to 10 per day. These limits reset at midnight. You can check your remaining imports on the Settings page.",
  },
  {
    question: "Why did the image extraction fail or return incorrect results?",
    answer:
      "Image extraction works best with clearly photographed, well-lit recipes. Handwritten text, blurry photos, or sideways images can be harder to read. If the first attempt fails, the app automatically tries rotating the image. You can always edit the extracted results before saving.",
  },
  {
    question: "Can I add my own photos to a recipe?",
    answer:
      "Yes. When editing a recipe, use the \"Upload\" button in the Images section to upload photos from your device. You can also paste image URLs directly. Multiple images and URLs are supported at once.",
  },
  {
    question: "How do I delete a recipe?",
    answer:
      "Open the recipe you want to delete and click the delete button. You'll be asked to confirm before the recipe is permanently removed from your collection.",
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-serif text-lg text-black group-hover:text-gray-600 transition-colors pr-4">
          {item.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="pb-5">
          <p className="font-serif text-base leading-relaxed text-gray-600">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <main className="max-w-article mx-auto px-6 py-12">
      <h1 className="font-display text-3xl md:text-4xl font-bold leading-none mb-2">
        Help
      </h1>
      <p className="font-serif text-lg text-gray-600 italic mb-10">
        Frequently asked questions about using Recipe Book.
      </p>

      <div>
        {faqs.map((faq, i) => (
          <FAQAccordion key={i} item={faq} />
        ))}
      </div>
    </main>
  );
}
