"""
RAG service: ingests PDFs from rag_dataset directory into ChromaDB,
provides semantic search for regulatory and institutional documents.
"""
import os
import logging
import hashlib
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

RAG_DIR = Path(r"D:\Ucar_dataset\rag_dataset")
CHROMA_DIR = RAG_DIR / "chroma_db"
COLLECTION_NAME = "ucar_knowledge"
CHUNK_SIZE = 600      # characters per chunk
CHUNK_OVERLAP = 100   # overlap between chunks

_collection = None


def _get_collection():
    global _collection
    if _collection is not None:
        return _collection

    try:
        import chromadb
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        ef = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        _collection = chroma_client.get_or_create_collection(
            COLLECTION_NAME,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
        return _collection
    except ImportError as e:
        logger.error(f"RAG dependencies missing: {e}. Run: pip install chromadb sentence-transformers pypdf")
        return None


def _chunk_text(text: str) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if len(chunk) > 50:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def ingest_directory(pdf_dir: str = None) -> dict:
    """Scan a directory for PDFs, chunk them, and store in ChromaDB (skips already-ingested chunks)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        return {"error": "pypdf not installed. Run: pip install pypdf"}

    collection = _get_collection()
    if collection is None:
        return {"error": "ChromaDB not available"}

    directory = Path(pdf_dir) if pdf_dir else RAG_DIR
    if not directory.exists():
        directory.mkdir(parents=True, exist_ok=True)
        return {"ingested": 0, "skipped": 0, "total_docs": 0, "errors": [],
                "message": "Dossier créé. Déposez vos PDFs dans D:\\Ucar_dataset\\rag_dataset\\ puis relancez l'indexation."}

    existing_ids = set(collection.get(include=[])["ids"])
    ingested, skipped, errors = 0, 0, []

    for pdf_path in directory.glob("**/*.pdf"):
        try:
            reader = PdfReader(str(pdf_path))
            full_text = "\n".join(
                page.extract_text() or "" for page in reader.pages
            )
            chunks = _chunk_text(full_text)

            for i, chunk in enumerate(chunks):
                doc_id = hashlib.md5(
                    f"{pdf_path.name}:{i}:{chunk[:40]}".encode()
                ).hexdigest()

                if doc_id in existing_ids:
                    skipped += 1
                    continue

                collection.add(
                    ids=[doc_id],
                    documents=[chunk],
                    metadatas=[{
                        "source": pdf_path.name,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                    }],
                )
                existing_ids.add(doc_id)
                ingested += 1

        except Exception as e:
            logger.warning(f"Failed to ingest {pdf_path.name}: {e}")
            errors.append(str(pdf_path.name))

    return {
        "ingested": ingested,
        "skipped": skipped,
        "errors": errors,
        "total_docs": collection.count(),
    }


def search(query: str, n_results: int = 5) -> list[dict]:
    """Semantic search over ingested knowledge base. Returns ranked chunks with source."""
    collection = _get_collection()
    if collection is None:
        return []

    try:
        count = collection.count()
        if count == 0:
            return []

        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, count),
        )

        out = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            out.append({
                "content": doc,
                "source": meta.get("source", "Inconnu"),
                "relevance": round(1 - float(dist), 3),
            })
        return out

    except Exception as e:
        logger.warning(f"RAG search failed: {e}")
        return []


def get_stats() -> dict:
    """Return stats about the knowledge base."""
    collection = _get_collection()
    if collection is None:
        return {"available": False}

    try:
        count = collection.count()
        metas = collection.get(include=["metadatas"])["metadatas"]
        sources = list({m.get("source", "") for m in metas})
        return {
            "available": True,
            "total_chunks": count,
            "documents": sources,
        }
    except Exception:
        return {"available": True, "total_chunks": 0, "documents": []}
