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
    if not text or not text.strip():
        logging.warning("Empty text provided to llm_questions_extraction")
        return []
        
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
            temperature=0,
            timeout=30
        )

        raw_content = response.choices[0].message.content.strip()
        if not raw_content:
            logging.error("LLM returned empty response for questions extraction")
            return []

        extracted = json.loads(raw_content)
        
        if not isinstance(extracted, list):
            logging.error("LLM response is not a list for questions extraction")
            return []
            
        logging.info(f"Successfully extracted {len(extracted)} questions")
        return extracted

    except json.JSONDecodeError as e:
        logging.error(f"JSON decode error in questions extraction: {str(e)}")
        return []
    except Exception as e:
        logging.error(f"Error in questions extraction: {str(e)}")
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