import os
from dotenv import load_dotenv
from agno.models.groq import Groq

load_dotenv()


def get_model() -> Groq:
    """Return the shared Groq model instance for all agents."""
    return Groq(id="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
