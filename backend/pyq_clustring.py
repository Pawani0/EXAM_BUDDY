import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from llm_smart_extractor import classify_questions_llm_batch  # batch LLM

st = SentenceTransformer("all-MiniLM-L6-v2")

# -------------------------
# Helpers
# -------------------------
def flatten_syllabus(syllabus_json):
    """Flatten syllabus into topic_list and topic_to_unit mapping."""
    topic_list = []
    topic_to_unit = {}
    for unit_data in syllabus_json:
        unit_name = unit_data["unit"]
        for topic in unit_data["topics"]:
            topic_list.append(topic)
            topic_to_unit[topic] = unit_name
    return topic_list, topic_to_unit


def assign_topics_embeddings(question: str, topic_embeddings: np.array, topic_list: list, threshold: float = 0.65) -> list:
    """Assign topics using cosine similarity above threshold."""
    q_emb = st.encode(question).reshape(1, -1)
    sims = cosine_similarity(q_emb, topic_embeddings)[0]
    return [topic_list[i] for i, sim in enumerate(sims) if sim >= threshold]


# -------------------------
# Main Clustering Pipeline
# -------------------------
def cluster_questions(syllabus_json: list, questions_list: list, threshold: float = 0.65):
    """
    Cluster questions into topics using embeddings + LLM.
    Returns: {Unit -> {Topic -> [Questions]}}
    """
    # -------------------------
    # Prepare syllabus data
    # -------------------------
    topic_list, topic_to_unit = flatten_syllabus(syllabus_json)
    topic_embeddings = np.array([st.encode(t) for t in topic_list])

    # -------------------------
    # Phase 1: Embeddings pass
    # -------------------------
    embedding_clusters = {
        q: assign_topics_embeddings(q, topic_embeddings, topic_list, threshold)
        for q in questions_list
    }

    # -------------------------
    # Phase 2: LLM batch pass
    # -------------------------
    llm_clusters = classify_questions_llm_batch(questions_list, topic_list)
    # Expected format: {question: [topics]} or {question: "topic"}

    # Normalize LLM output
    normalized_llm = {}
    for q, result in llm_clusters.items():
        if isinstance(result, str):
            normalized_llm[q] = [result] if result != "unknown" else []
        elif isinstance(result, list):
            normalized_llm[q] = [r for r in result if r != "unknown"]
        else:
            normalized_llm[q] = []
    llm_clusters = normalized_llm

    # -------------------------
    # Merge both results
    # -------------------------
    merged_clusters = {}
    for q in questions_list:
        merged = set(embedding_clusters.get(q, [])) | set(llm_clusters.get(q, []))
        merged_clusters[q] = list(merged)

    # -------------------------
    # Convert merged results into syllabus structure
    # -------------------------
    clustered = {unit_data["unit"]: {t: [] for t in unit_data["topics"]}
                 for unit_data in syllabus_json}

    for q, topics in merged_clusters.items():
        for t in topics:
            if t in topic_to_unit:  # safety check
                clustered[topic_to_unit[t]][t].append(q)

    return clustered
