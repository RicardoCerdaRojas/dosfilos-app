"""
Professional PDF Extraction Pipeline for Hebrew Lessons.

Extracts text from the professor's PDF lessons preserving structure,
Hebrew characters, and formatting. Outputs clean Markdown files.
"""

import pdfplumber
import re
import os
from pathlib import Path


# Lesson metadata based on ACTUAL content extracted from PDFs
LESSON_METADATA = {
    "leccion-1-1.pdf": ("Lección 1: Nifal", [
        "nifal", "voz pasiva", "voz reflexiva", "nun asimilada",
        "perfecto nifal", "imperfecto nifal", "participio nifal"
    ]),
    "leccion-2-1.pdf": ("Lección 2: Piel", [
        "piel", "daguesh forte", "factitivo", "intensivo",
        "perfecto piel", "imperfecto piel"
    ]),
    "leccion-3-1.pdf": ("Lección 3: Pual", [
        "pual", "pasivo piel", "qibbuts", "daguesh forte",
        "perfecto pual", "imperfecto pual"
    ]),
    "leccion-4-1.pdf": ("Lección 4: Hifil", [
        "hifil", "causativo", "preformativo he", "pataj",
        "perfecto hifil", "imperfecto hifil", "participio hifil"
    ]),
    "leccion-5-1.pdf": ("Lección 5: Hofal", [
        "hofal", "pasivo hifil", "causativo pasivo", "qamets-hatuf",
        "perfecto hofal", "imperfecto hofal"
    ]),
    "leccion-6-1.pdf": ("Lección 6: Hitpael", [
        "hitpael", "reflexivo", "recíproco", "preformativo hit",
        "metátesis", "sibilante", "perfecta hitpael"
    ]),
    "leccion-7-1.pdf": ("Lección 7: Verbos Débiles (Parte 1)", [
        "verbo débil", "I-nun", "I-yod", "III-he",
        "clasificación", "irregulares", "gutural"
    ]),
    "leccion-8-1.pdf": ("Lección 8: Verbos Débiles (Parte 2)", [
        "verbo débil", "II-vocal", "II-duplicada", "claves reconocimiento",
        "preformativo", "diagnóstico verbal"
    ]),
}


def extract_pdf_to_text(pdf_path: str) -> str:
    """Extract text from a PDF preserving page structure."""
    pages_text = []

    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text(
                x_tolerance=3,
                y_tolerance=3,
            )
            if text:
                pages_text.append(f"<!-- Página {i + 1} -->\n\n{text}")

    return "\n\n---\n\n".join(pages_text)


def clean_text(raw_text: str) -> str:
    """Clean extracted text: normalize whitespace, fix encoding artifacts."""
    text = raw_text

    # Normalize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Remove excessive blank lines (keep max 2)
    text = re.sub(r'\n{4,}', '\n\n\n', text)

    # Fix common PDF extraction artifacts
    text = re.sub(r'(\w)- \n(\w)', r'\1\2', text)  # Rejoin hyphenated words

    # Normalize Unicode Hebrew characters
    text = text.replace('\u200f', '')  # Remove RTL marks that break formatting
    text = text.replace('\u200e', '')  # Remove LTR marks

    return text.strip()


def format_as_markdown(title: str, topics: list[str], cleaned_text: str) -> str:
    """Format extracted text as a structured Markdown document."""
    topic_tags = ", ".join(f"`{t}`" for t in topics)

    header = f"""# {title}

> **Fuente**: Material del profesor de hebreo bíblico
> **Temas**: {topic_tags}
> **Tipo**: Material pedagógico complementario

---

"""
    return header + cleaned_text


def extract_all_lessons(source_dir: str, output_dir: str) -> None:
    """Extract all PDF lessons to Markdown files."""
    os.makedirs(output_dir, exist_ok=True)

    results = []

    for pdf_filename, (title, topics) in LESSON_METADATA.items():
        pdf_path = os.path.join(source_dir, pdf_filename)

        if not os.path.exists(pdf_path):
            print(f"⚠️  No encontrado: {pdf_filename}")
            continue

        print(f"📄 Extrayendo: {pdf_filename}...")

        # Extract
        raw_text = extract_pdf_to_text(pdf_path)

        # Clean
        cleaned_text = clean_text(raw_text)

        # Format
        markdown_content = format_as_markdown(title, topics, cleaned_text)

        # Output filename
        lesson_num = pdf_filename.split("-")[1]
        output_filename = f"leccion-{lesson_num}.md"
        output_path = os.path.join(output_dir, output_filename)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)

        # Stats
        word_count = len(cleaned_text.split())
        hebrew_chars = len(re.findall(r'[\u0590-\u05FF]', cleaned_text))

        results.append({
            "file": output_filename,
            "title": title,
            "words": word_count,
            "hebrew_chars": hebrew_chars,
        })

        print(f"   ✅ → {output_filename} ({word_count} palabras, {hebrew_chars} caracteres hebreos)")

    # Summary
    print(f"\n{'='*60}")
    print(f"📊 Resumen de extracción:")
    print(f"   Total archivos: {len(results)}")
    print(f"   Total palabras: {sum(r['words'] for r in results)}")
    print(f"   Total chars hebreos: {sum(r['hebrew_chars'] for r in results)}")
    print(f"   Output: {output_dir}")


if __name__ == "__main__":
    script_dir = Path(__file__).parent
    source_dir = str(script_dir.parent)  # docs/hebreo/
    output_dir = str(script_dir.parent / "lecciones")  # docs/hebreo/lecciones/

    extract_all_lessons(source_dir, output_dir)
