from dotenv import load_dotenv
import os
import json
from groq import Groq
import re

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

STOPWORDS = [
    "book", "books", "textbook", "reference", "references",
    "experiment", "experiments", "list of experiments",
    "outcome", "outcomes", "objective", "objectives",
    "syllabus", "recommended", "further reading"
]

def llm_syllabus_extraction(syllabus):
    prompt = f"""
    You are given the academic syllabus.

    Content:
    {syllabus}

    Task:
    - Extract ONLY the **unit topics**.
    - Topics should be similar as in the syllabus.
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
                "Data Types and Variables",
                "Control Structures"
            ]
        }},
        {{
            "unit": "Unit 2",
            "unit_name": "Object-Oriented Programming",
            "topics": [
                "Classes and Objects",
                "Inheritance and Polymorphism"
            ]
        }}
    ]
    """

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )

        raw_content = response.choices[0].message.content.strip()

        if not raw_content:
            raise ValueError("LLM returned empty response")

        # Attempt to extract a JSON array from any extra text
        match = re.search(r"\[.*\]", raw_content, re.DOTALL)
        if match:
            extracted = json.loads(match.group())
            return extracted
        else:
            raise ValueError("No valid JSON found in LLM response")

    except Exception as e:
        print("Error in syllabus extraction:", str(e))
        return []
    
def llm_questions_extraction(text):
    prompt = f"""You are an exam question extractor.

Task:
- Input: raw OCR text from a scanned exam paper.
- Output: array of objects with only English questions.
- Remove: headers, footers, roll no, time, max marks, exam instructions, page numbers, and any Hindi text.
- Keep: only full English questions (even if split across lines, merge them).
- Note: In RGPV papers, there are 8 question that can have parts (a, b) consider them seprate questions.
        If questions are like discuss or explain only 2 or 3 from the following then coonsider it as 1 question.

Format:
["First question", "Second question", ...]

Text:
{text}"""
    
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )

        extracted = json.loads(response.choices[0].message.content)

        return extracted

    except Exception:
        return []
    
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

        # Parse as JSON object
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