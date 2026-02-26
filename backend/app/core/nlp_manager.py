import spacy
from sentence_transformers import SentenceTransformer


import torch

class NLPManager:
    _spacy_model = None
    _st_model = None

    @classmethod
    def get_spacy(cls):
        if cls._spacy_model is None:
            try:
                cls._spacy_model = spacy.load("en_core_web_sm")
            except OSError:
                raise RuntimeError(
                    "spaCy model 'en_core_web_sm' not found. "
                    "Please install it by running: python -m spacy download en_core_web_sm"
                )
        return cls._spacy_model

    @classmethod
    def get_sentence_transformer(cls):
        if cls._st_model is None:
            torch.set_num_threads(1)
            cls._st_model = SentenceTransformer("all-MiniLM-L6-v2")
        return cls._st_model
