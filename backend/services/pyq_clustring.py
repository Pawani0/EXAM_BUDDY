import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import logging
from services.llm_smart_extractor import classify_questions_llm_batch  # batch LLM

try:
    st = SentenceTransformer("all-MiniLM-L6-v2")
    logging.info("SentenceTransformer model loaded successfully")
except Exception as e:
    logging.error(f"Error loading SentenceTransformer model: {str(e)}")
    raise

# -------------------------
# Helpers
# -------------------------
def flatten_syllabus(syllabus_json):
    """Flatten syllabus into topic_list and topic_to_unit mapping. Returns empty tuples on failure."""
    try:
        if not syllabus_json:
            logging.warning("Empty syllabus_json provided to flatten_syllabus")
            return [], {}
            
        topic_list = []
        topic_to_unit = {}
        for unit_data in syllabus_json:
            try:
                unit_name = unit_data.get("unit", "Unknown Unit")
                topics = unit_data.get("topics", [])
                for topic in topics:
                    topic_list.append(topic)
                    topic_to_unit[topic] = unit_name
            except Exception as e:
                logging.warning(f"Error processing unit data: {str(e)}")
                continue
        return topic_list, topic_to_unit
    except Exception as e:
        logging.error(f"Error in flatten_syllabus: {str(e)}")
        return [], {}


def assign_topics_embeddings(question: str, topic_embeddings: np.array, topic_list: list, threshold: float = 0.65) -> list:
    """Assign topics using cosine similarity above threshold. Returns empty list on failure."""
    try:
        if not question or not question.strip():
            return []
        if topic_embeddings.size == 0 or not topic_list:
            return []
            
        q_emb = st.encode(question).reshape(1, -1)
        sims = cosine_similarity(q_emb, topic_embeddings)[0]
        return [topic_list[i] for i, sim in enumerate(sims) if sim >= threshold]
    except Exception as e:
        logging.error(f"Error in assign_topics_embeddings: {str(e)}")
        return []


# -------------------------
# Main Clustering Pipeline
# -------------------------
def cluster_questions(syllabus_json: list, questions_list: list, threshold: float = 0.65):
    """
    Cluster questions into topics using embeddings + LLM.
    Returns: {Unit -> {Topic -> [Questions]}}, importance_dict
    Raises exception on critical failure.
    """
    try:
        # Validate inputs
        if not syllabus_json:
            raise ValueError("Syllabus data is required for clustering")
        if not questions_list:
            raise ValueError("Questions list is required for clustering")
            
        # -------------------------
        # Prepare syllabus data
        # -------------------------
        try:
            topic_list, topic_to_unit = flatten_syllabus(syllabus_json)
            if not topic_list:
                raise ValueError("No topics found in syllabus")
            topic_embeddings = np.array([st.encode(t) for t in topic_list])
            logging.info(f"Prepared {len(topic_list)} topics for clustering")
        except Exception as e:
            logging.error(f"Error preparing syllabus data: {str(e)}")
            raise

        # -------------------------
        # Phase 1: Embeddings pass
        # -------------------------
        try:
            embedding_clusters = {}
            for q in questions_list:
                try:
                    topics = assign_topics_embeddings(q, topic_embeddings, topic_list, threshold)
                    embedding_clusters[q] = topics
                except Exception as e:
                    logging.warning(f"Error clustering question with embeddings: {str(e)}")
                    embedding_clusters[q] = []
            logging.info(f"Completed embeddings phase for {len(questions_list)} questions")
        except Exception as e:
            logging.error(f"Error in embeddings pass: {str(e)}")
            raise

        # -------------------------
        # Phase 2: LLM batch pass
        # -------------------------
        try:
            llm_clusters = classify_questions_llm_batch(questions_list, topic_list)
            # Expected format: {question: [topics]} or {question: "topic"}

            # Normalize LLM output
            normalized_llm = {}
            for q, result in llm_clusters.items():
                try:
                    if isinstance(result, str):
                        normalized_llm[q] = [result] if result != "unknown" else []
                    elif isinstance(result, list):
                        normalized_llm[q] = [r for r in result if r != "unknown"]
                    else:
                        normalized_llm[q] = []
                except Exception as e:
                    logging.warning(f"Error normalizing LLM result for question: {str(e)}")
                    normalized_llm[q] = []
            llm_clusters = normalized_llm
            logging.info(f"Completed LLM phase for {len(questions_list)} questions")
        except Exception as e:
            logging.warning(f"Error in LLM pass, using embeddings only: {str(e)}")
            llm_clusters = {q: [] for q in questions_list}

        # -------------------------
        # Merge both results
        # -------------------------
        try:
            merged_clusters = {}
            for q in questions_list:
                merged = set(embedding_clusters.get(q, [])) | set(llm_clusters.get(q, []))
                merged_clusters[q] = list(merged)
            logging.info(f"Merged clustering results")
        except Exception as e:
            logging.error(f"Error merging clusters: {str(e)}")
            raise

        # -------------------------
        # Convert merged results into syllabus structure
        # -------------------------
        try:
            clustered = {unit_data["unit"]: {t: [] for t in unit_data.get("topics", [])}
                        for unit_data in syllabus_json}

            for q, topics in merged_clusters.items():
                for t in topics:
                    if t in topic_to_unit:  # safety check
                        unit = topic_to_unit[t]
                        if unit in clustered and t in clustered[unit]:
                            clustered[unit][t].append(q)
        except Exception as e:
            logging.error(f"Error structuring clustered results: {str(e)}")
            raise

        # -------------------------
        # Calculate Topic Importance (Frequency)
        # -------------------------
        try:
            importance = {}
            for unit, topics in clustered.items():
                for topic, questions in topics.items():
                    count = len(questions)
                    if count > 0:
                        importance[topic] = count
            logging.info(f"Calculated importance for {len(importance)} topics")
        except Exception as e:
            logging.error(f"Error calculating importance: {str(e)}")
            importance = {}
        
        # Sort importance by count descending
        importance = dict(sorted(importance.items(), key=lambda item: item[1], reverse=True))

        return clustered, importance
    
    except Exception as e:
        logging.error(f"Unexpected error in cluster_questions: {str(e)}")
        raise
