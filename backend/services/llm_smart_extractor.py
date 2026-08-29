from dotenv import load_dotenv
import os
import json
from groq import Groq
import re
import logging

load_dotenv()

try:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logging.error("GROQ_API_KEY not found in environment variables")
        raise ValueError("GROQ_API_KEY is required")
    client = Groq(api_key=api_key)
except Exception as e:
    logging.error(f"Error initializing Groq client: {str(e)}")
    raise

STOPWORDS = [
    "book", "books", "textbook", "reference", "references",
    "experiment", "experiments", "list of experiments",
    "outcome", "outcomes", "objective", "objectives",
    "syllabus", "recommended", "further reading"
]

MAX_QUESTION_INPUT_CHARS = 50000


def _extract_json_array(raw_content: str):
    """Best-effort extraction of a JSON array from LLM output."""
    if not raw_content:
        return None

    # Try direct parse first
    try:
        parsed = json.loads(raw_content)
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass

    # Try extracting the outermost JSON array
    first = raw_content.find("[")
    last = raw_content.rfind("]")
    if first != -1 and last != -1 and last > first:
        candidate = raw_content[first:last + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            return None

    return None


def _repair_questions_json(raw_content: str):
    """Ask LLM to repair malformed extraction output into strict JSON format."""
    try:
        repair_prompt = f"""
You are a strict JSON fixer.

Convert the following content into a valid JSON array.
Each element must be an object with exactly these keys:
- "question": plain question text
- "latex": LaTex-safe question text

Rules:
- Return only valid JSON.
- No markdown, no explanations.
- Preserve content meaning.
- If latex is missing, copy question into latex.

Content:
{raw_content}
"""

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": repair_prompt}],
            temperature=0,
            timeout=30,
            max_tokens=6000
        )

        repaired = response.choices[0].message.content.strip()
        return _extract_json_array(repaired)
    except Exception as e:
        logging.error(f"Error repairing malformed question JSON: {str(e)}")
        return None

def llm_syllabus_extraction(syllabus):
    """Extract structured syllabus units from text. Returns empty list on failure."""
    if not syllabus or not syllabus.strip():
        logging.warning("Empty syllabus provided to llm_syllabus_extraction")
        return []
        
    prompt = f"""
    You are given the academic syllabus.

    Content:
    {syllabus}

    Task:
    - Extract ONLY the **unit topics**.
    - **CRITICAL**: Split combined topics (e.g., "A, B and C") into individual items. Do NOT group multiple concepts in one string.
    - Topics should be granular and specific.
    - Also extract sub-topics if present.
    - Extract unit name as well; if no unit name is given, generate a suitable one.
    - Remove anything related to {', '.join(STOPWORDS)}.
    - Return the output as a valid JSON **list of objects**.

    Example Output:
    [
        {{
            "unit": "Unit 1",
            "unit_name": "Introduction to Programming",
            "topics": [
                "Basics of Programming",
                "Data Types",
                "Variables",
                "Control Structures"
            ]
        }},
        {{
            "unit": "Unit 2",
            "unit_name": "Object-Oriented Programming",
            "topics": [
                "Classes",
                "Objects",
                "Inheritance",
                "Polymorphism"
            ]
        }}
    ]
    """

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            timeout=30
        )

        raw_content = response.choices[0].message.content.strip()

        if not raw_content:
            logging.error("LLM returned empty response for syllabus extraction")
            return []

        # Attempt to extract a JSON array from any extra text
        match = re.search(r"\[.*\]", raw_content, re.DOTALL)
        if match:
            extracted = json.loads(match.group())
            if not isinstance(extracted, list):
                logging.error("LLM response is not a list")
                return []
            logging.info(f"Successfully extracted {len(extracted)} syllabus units")
            return extracted
        else:
            logging.error("No valid JSON array found in LLM response")
            return []

    except json.JSONDecodeError as e:
        logging.error(f"JSON decode error in syllabus extraction: {str(e)}")
        return []
    except Exception as e:
        logging.error(f"Error in syllabus extraction: {str(e)}")
        return []
    
def llm_questions_extraction(text):
    """Extract questions from exam paper text. Returns empty list on failure."""
    result = llm_questions_extraction_with_latex(text)
    return result.get("questions", [])


def llm_questions_extraction_with_latex(text):
    """Extract questions and provide both plain text and LaTex form. Returns empty payload on failure."""
    if not text or not text.strip():
        logging.warning("Empty text provided to llm_questions_extraction_with_latex")
        return {"questions": [], "questions_latex": []}
        
    sanitized_text = text.strip()
    if len(sanitized_text) > MAX_QUESTION_INPUT_CHARS:
        logging.warning(
            "Input too long for stable extraction (%d chars). Truncating to %d chars.",
            len(sanitized_text),
            MAX_QUESTION_INPUT_CHARS
        )
        sanitized_text = sanitized_text[:MAX_QUESTION_INPUT_CHARS]

    prompt = f"""You are an exam question extractor.

Task:
- Input: raw OCR text from a scanned exam paper.
- Output: valid JSON array of objects, each with:
    - "question": plain text question string
    - "latex": LaTex-safe representation of the same question
- Content to Extract:
    1. Standard Questions (Descriptive, Numerical, etc.)
    2. Multiple Choice Questions (MCQs) -> Format as: "Question Text? (a) Option1 (b) Option2 (c) Option3 (d) Option4"
    3. Fill in the blanks -> Format as: "The capital of France is ______."
    4. Match the following -> Format as: "Match: [A: Item1 -> 1: Match1], [B: Item2 -> 2: Match2]..." or preserve the full matching block as one string.
    5. True/False -> Format as: "Question text? (True/False)"
    
- Remove: headers, footers, roll no, time, max marks, exam instructions, page numbers, and any Hindi text.
- Merge split lines: Ensure each question is a single continuous string.
- Handling Parts: 
    - If a question has sub-parts like (a), (b), treat them as separate questions IF they are substantial. 
    - For "Match the following", keep the entire set as ONE question entry.
- LaTex rules:
        - Keep full text meaning unchanged.
        - Convert mathematical expressions to LaTex math mode using $...$.
        - For fractions use \\frac{{a}}{{b}}, exponents use ^{{ }}, subscripts use _{{ }}.
        - For matrices use \\begin{{bmatrix}} ... \\end{{bmatrix}}.
        - Escape LaTex special characters in normal text where needed.
        - If no math is present, keep latex close to readable text with minimal escaping.

Format:
[
    {{"question": "Question 1...", "latex": "Question 1..."}},
    {{"question": "Find determinant of matrix [[1,2],[3,4]]", "latex": "Find determinant of matrix $\\\\begin{{bmatrix}}1 & 2 \\\\ 3 & 4\\\\end{{bmatrix}}$"}}
]

Text:
{sanitized_text}"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            timeout=30,
            max_tokens=6000
        )

        raw_content = response.choices[0].message.content.strip()
        if not raw_content:
            logging.error("LLM returned empty response for questions extraction")
            return {"questions": [], "questions_latex": []}

        extracted = _extract_json_array(raw_content)
        if extracted is None:
            logging.warning("Primary question JSON parse failed. Attempting repair pass.")
            extracted = _repair_questions_json(raw_content)
        
        if not isinstance(extracted, list):
            logging.error("LLM response is not a list for questions extraction with LaTex")
            return {"questions": [], "questions_latex": []}

        questions = []
        questions_latex = []

        for item in extracted:
            if isinstance(item, dict):
                question_text = str(item.get("question", "")).strip()
                question_latex = str(item.get("latex", "")).strip()
            else:
                question_text = str(item).strip()
                question_latex = question_text

            if not question_text:
                continue

            if not question_latex:
                question_latex = question_text

            questions.append(question_text)
            questions_latex.append(question_latex)

        logging.info(f"Successfully extracted {len(questions)} questions with LaTex")
        return {"questions": questions, "questions_latex": questions_latex}

    except json.JSONDecodeError as e:
        logging.error(f"JSON decode error in questions extraction with LaTex: {str(e)}")
        return {"questions": [], "questions_latex": []}
    except Exception as e:
        logging.error(f"Error in questions extraction with LaTex: {str(e)}")
        return {"questions": [], "questions_latex": []}
    
def classify_questions_llm_batch(questions: list, topic_list: list) -> dict:
    """
    Classify a batch of questions into relevant topics using LLM.
    Returns a dict mapping each question -> list of topics.
    If no match, assigns ["unknown"].
    """
    prompt = f"""
You are an expert academic classifier. Your task is to assign exam questions to the most relevant syllabus topics.

Syllabus topics (use EXACT strings only, do not rephrase):
{json.dumps(topic_list, indent=2)}

Questions to classify:
{json.dumps(questions, indent=2)}

Instructions:
1. For each question, find the topics from the list above that best match its meaning.
2. A question can belong to multiple topics if it is relevant to more than one.
3. If no suitable topic exists, return ["unknown"].
4. Use only the topics provided in the syllabus. Do not invent new ones.
5. Output format must be a valid JSON object:
   - Keys = exact question strings.
   - Values = JSON arrays of topic strings.

Return ONLY the JSON object. No explanations, no extra text.
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )

        raw_output = response.choices[0].message.content.strip()

        # Parse as JSON object with regex fallback
        match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if match:
            result = json.loads(match.group())
        else:
            result = json.loads(raw_output)

        # Cleanup: ensure dict structure
        cleaned = {}
        for q in questions:
            topics = result.get(q, ["unknown"])
            if not isinstance(topics, list):
                topics = ["unknown"]
            # Keep only valid topics or "unknown"
            valid_topics = [t for t in topics if t in topic_list or t == "unknown"]
            cleaned[q] = valid_topics if valid_topics else ["unknown"]

        return cleaned

    except Exception as e:
        print("LLM batch classification failed:", e)
        return {q: ["unknown"] for q in questions}

def generate_question_bank(topic: str, quantity: int = 5, difficulty: str = "Medium") -> list:
    """
    Generate practice questions and answers for a given topic.
    """
    prompt = f"""
    You are an expert academic content generator.
    
    Task: Generate {quantity} practice questions with detailed answers for the topic: "{topic}".
    Difficulty Level: {difficulty}
    
    Output Format:
    Return a valid JSON list of objects. Each object must have:
    - "question": The question text.
    - "answer": A detailed answer/explanation.
    - "type": "Conceptual", "Numerical", or "Theoretical" based on the question.
    
    Example:
    [
        {{
            "question": "What is a class in OOP?",
            "answer": "A class is a blueprint for creating objects...",
            "type": "Theoretical"
        }}
    ]
    
    Return ONLY the JSON list.
    """
    
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        raw_content = response.choices[0].message.content.strip()
        match = re.search(r"\[.*\]", raw_content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []
        
    except Exception as e:
        print(f"Error generating question bank: {e}")
        return []


def generate_assignment(topics: list, blooms_level: str, question_types: list, quantity: int = 5) -> dict:
    """
    Generate an assignment based on Bloom's Taxonomy.
    """
    prompt = f"""
    You are an expert curriculum designer. Create an assignment for students.
    
    Topics: {', '.join(topics)}
    Bloom's Taxonomy Level: {blooms_level} (Focus on verbs like {get_blooms_verbs(blooms_level)})
    Question Types: {', '.join(question_types)}
    Total Questions: {quantity}
    
    Task:
    Generate {quantity} questions that test the students' understanding at the "{blooms_level}" level.
    Ensure a mix of the requested question types.
    
    Output Format:
    Return a valid JSON object with:
    - "title": A suitable title for the assignment.
    - "questions": A list of objects, each containing:
        - "id": 1, 2, ...
        - "question": The question text.
        - "marks": Suggested marks (e.g., 2, 5, 10).
        - "blooms_level": The specific cognitive level targeted.
    
    Return ONLY the JSON object.
    """
    
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        raw_content = response.choices[0].message.content.strip()
        # Try to find JSON object
        match = re.search(r"\{.*\}", raw_content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {}
        
    except Exception as e:
        print(f"Error generating assignment: {e}")
        return {}

def get_blooms_verbs(level: str) -> str:
    verbs = {
        "Remember": "define, list, recall, repeat",
        "Understand": "classify, describe, discuss, explain",
        "Apply": "demonstrate, interpret, operate, solve",
        "Analyze": "compare, contrast, examine, question",
        "Evaluate": "argue, defend, judge, select",
        "Create": "assemble, construct, design, develop"
    }
    return verbs.get(level, "relevant verbs")

def generate_practice_paper(syllabus_topics: list, hot_topics: list = None, difficulty: str = "Medium", quantity: int = 10) -> dict:
    """
    Generate a complete practice paper based on syllabus and optional hot topics.
    """
    hot_topics_str = ", ".join(hot_topics) if hot_topics else "None"
    
    prompt = f"""
    You are an expert exam paper setter.
    
    Task: Create a practice exam paper.
    
    Syllabus Topics: {', '.join(syllabus_topics)}
    Hot Topics (High Importance/Frequent in PYQs): {hot_topics_str}
    Difficulty: {difficulty}
    Total Questions: {quantity}
    
    Instructions:
    1. If Hot Topics are provided, ensure at least 60% of the questions come from these topics.
    2. The remaining 40% should cover other syllabus topics to ensure breadth.
    3. If no Hot Topics are provided, distribute questions evenly across the syllabus.
    4. Include a mix of Conceptual, Analytical, and Application-based questions.
    
    Output Format:
    Return a valid JSON object with:
    - "title": "Practice Exam Paper - [Subject Name]" (Infer subject from topics if possible, else generic)
    - "instructions": List of general instructions.
    - "sections": List of sections (e.g., Section A: Short Answer, Section B: Long Answer).
    - "questions": List of objects, each containing:
        - "id": 1, 2, ...
        - "question": The question text.
        - "marks": Suggested marks.
        - "topic": The topic this question belongs to.
        - "is_hot_topic": boolean (true if from hot topics).
    
    Return ONLY the JSON object.
    """
    
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        raw_content = response.choices[0].message.content.strip()
        match = re.search(r"\{.*\}", raw_content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {}
        
    except Exception as e:
        print(f"Error generating practice paper: {e}")
        return {}