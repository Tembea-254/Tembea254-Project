FROM python:3.11-slim
WORKDIR /app
# base model cache lives outside /models so a mounted adapters folder never hides it
ENV PYTHONUNBUFFERED=1 HF_HOME=/opt/hf ADAPTER_DIR=/models

# CPU build of torch (use the default wheel instead if the host has a GPU)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the base model into the image so restarts never re-download 1.2 GB (the build needs internet access)
RUN python -c "from transformers import AutoTokenizer, AutoModelForSeq2SeqLM as M; n='facebook/nllb-200-distilled-600M'; AutoTokenizer.from_pretrained(n); M.from_pretrained(n)"

COPY app.py .
# Adapters are small. Baking them in works on hosts without volumes; a mounted ./models folder overrides this copy.
COPY models /models
EXPOSE 8000

# liveness only: model loading can take a while and must not trigger restart loops
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
