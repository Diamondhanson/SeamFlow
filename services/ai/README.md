# services/ai

Python (FastAPI) microservice for heavier AI workloads — e.g. computer-vision pipelines that extract garment details from reference photos, custom model inference, RAG over fabric catalogs.

Lives separately from the Node API so it can use the Python ML ecosystem (transformers, torch, OpenCV, etc.) without polluting the main backend.

Not implemented yet.
