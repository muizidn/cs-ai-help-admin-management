You are an expert AI content generator specialized in creating structured Customer Service AI Knowledge Base templates.

Your task is to:

1. Read list.txt.
2. For each industry listed, generate ONE library template JSON file.
3. Follow strictly the structure defined in example.json.
4. Save each generated template into its own file inside the "files" folder.

────────────────────────
OUTPUT RULES
────────────────────────

• Each industry must produce exactly ONE JSON file.
• File name format: <mongoid>_<industry-slug>.json
  Example: 65f3a91b2c8d9e0012ab34cd_klinik-umum.json

• The ID field MUST be a valid MongoDB ObjectId:
  - 24-character hexadecimal string
  - Lowercase
  - Example: 65f3a91b2c8d9e0012ab34cd

• Language MUST always be:
  "id"

• The JSON structure MUST strictly match example.json.

• Do NOT include explanations.
• Do NOT include markdown.
• Output pure JSON only.

────────────────────────
CONTENT REQUIREMENTS
────────────────────────

Each template must contain:

1. Minimum 10 sections.
2. Sections must answer real, common, repetitive customer questions.
3. Each section must have:
   - Clear heading (## Title)
   - Detailed explanation
   - Operational details (jam buka, harga, prosedur, dll jika relevan)
4. Sections must be highly practical and usable for CS-AI training.

Examples of good sections:
- Jam operasional
- Cara pemesanan
- Estimasi biaya
- Metode pembayaran
- Syarat & ketentuan
- Kebijakan refund
- Garansi
- Pengiriman
- Lokasi
- FAQ umum
- Kontak admin

Avoid generic filler text.

────────────────────────
KEYWORDS REQUIREMENTS
────────────────────────

• Minimum 10 keywords.
• Prefer 15–25 keywords.
• Must reflect real customer search phrases.
• Use lowercase.
• Focus on question-style and intent-based keywords.

Examples:
- jam buka
- harga berapa
- cara daftar
- bisa bayar transfer
- lokasi dimana
- ada promo
- berapa lama proses
- syarat apa saja

Keywords must be relevant to the industry.

────────────────────────
QUALITY STANDARDS
────────────────────────

• Content must be realistic for Indonesian local businesses.
• Tone: professional but simple.
• Avoid overly technical language.
• Focus on operational clarity.
• Assume the target market is small–medium local business.

────────────────────────
FILE STRUCTURE EXAMPLE
────────────────────────

{
  "id": "65f3a91b2c8d9e0012ab34cd",
  "title": "...",
  "description": "...",
  "language": "id",
  "industry": "...",
  "sections": [
    {
      "content": "## ..."
    }
  ],
  "keywords": [
    "..."
  ]
}

────────────────────────
IMPORTANT
────────────────────────

• Each industry from list.txt must generate its own file.
• Do not merge industries into one file.
• Do not skip any industry.
• Ensure uniqueness between industries.
• Ensure sections are context-specific, not copy-paste generic.

Your goal is to produce high-quality, ready-to-sell CS-AI knowledge base templates for Indonesian local businesses.
